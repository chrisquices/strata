// dropzone.js
// A headless file-acquisition surface. It turns a plain element into a place that accepts files two ways:
// 1. dragged in from the operating system
// 2. or chosen from a file picker
// It draws nothing and never reads file contents — it only collects File objects and hands them to you.
// • Boundary note: thumbnail generation (image/video decode + canvas frame capture) is a separate concern
//   living here — the one part that does read file contents — and the candidate to split into a sibling
//   module if a second consumer ever needs it.

//#region Generic Helpers ----------------------------------------------------------------------------------------------
function formatBytes(bytes) {
    const units = ["B", "KB", "MB", "GB", "TB"];
    let size = bytes;
    let unit = 0;

    while (size >= 1024 && unit < units.length - 1) {
        size = size / 1024;
        unit++;
    }

    return `${Math.round(size * 10) / 10} ${units[unit]}`;
}

// Invoke a consumer-supplied callback in isolation: one that throws can't abort an in-progress
// update or starve the other subscribers. The error surfaces to the console rather than vanishing.
function callConsumer(callback, argument) {
    try {
        callback(argument);
    } catch (error) {
        console.error("createDropzone: a consumer callback threw —", error);
    }
}

//#endregion -----------------------------------------------------------------------------------------------------------

//#region File Collection ----------------------------------------------------------------------------------------------
async function collectDroppedFiles(dataTransferItems) {
    const fileCollectionPromises = [];

    for (let index = 0; index < dataTransferItems.length; index++) {
        const dataTransferItem = dataTransferItems[index];

        // Convert the dropped item into a file-or-folder entry when the browser supports it
        const fileSystemEntry = dataTransferItem.webkitGetAsEntry
            ? dataTransferItem.webkitGetAsEntry() // Retrieve the entry for recursive file or folder processing.
            : null; // No entry API is available, so the caller must use the regular File fallback.

        if (fileSystemEntry) {
            fileCollectionPromises.push(
                extractFilesFromFileSystemEntry(fileSystemEntry) // Recursively collect every file contained by the entry.
            );
            continue;
        }

        if (dataTransferItem.kind === "file") {
            const file = dataTransferItem.getAsFile();

            if (file) {
                fileCollectionPromises.push(
                    Promise.resolve([file]) // Match the Promise-of-File-array shape returned by entry extraction.
                );
            }
        }
    }

    const collectedFileGroups = await Promise.all(fileCollectionPromises);
    return collectedFileGroups.flat();
}

function extractFilesFromFileSystemEntry(fileSystemEntry) {
    if (fileSystemEntry.isFile) {
        return new Promise(function (resolve) {
            fileSystemEntry.file(
                function (file) {
                    resolve([file]); // Return the file inside an array to match the folder-extraction result shape.
                },
                function () {
                    resolve([]); // Treat an unreadable file as no result instead of rejecting or hanging.
                }
            );
        });
    }

    const directoryReader = fileSystemEntry.createReader(); // Create a reader that retrieves the directory's child file-system entries in batches.
    const collectedFiles = [];

    return new Promise(function (resolve) {

        // Read one batch of child entries, then call itself again until the directory is exhausted.
        function readNextDirectoryBatch() {
            directoryReader.readEntries(
                function (childFileSystemEntries) {
                    if (childFileSystemEntries.length === 0) { // An empty batch means there are no entries left to read.
                        resolve(collectedFiles); // Finish with every File collected from this directory.
                        return;
                    }

                    // Start recursive extraction for every file or folder in the current batch.
                    const extractionPromises = childFileSystemEntries.map(
                        function (childFileSystemEntry) {
                            return extractFilesFromFileSystemEntry(childFileSystemEntry); // Files resolve directly; folders recurse.
                        }
                    );

                    // Wait for the entire batch to finish before requesting the next batch.
                    Promise.all(extractionPromises).then(
                        function (extractedFileGroups) {
                            collectedFiles.push(...extractedFileGroups.flat()); // Flatten and append the batch's extracted files.
                            readNextDirectoryBatch(); // Continue because readEntries may return only part of the directory at once. Reader returns in batches of max 100 items.
                        }
                    );
                },
                function () {
                    resolve(collectedFiles); // On a read failure, return the files collected successfully so far.
                }
            );
        }

        readNextDirectoryBatch();
    });
}

//#endregion -----------------------------------------------------------------------------------------------------------

export function createDropzone(element, options = {}) {
    if (!element || typeof element.addEventListener !== "function") {
        throw new TypeError("createDropzone: 'element' must be a DOM element.");
    }

    //#region Utility --------------------------------------------------------------------------------------------------
    const cleanups = []; // Teardown functions, collected so everything can be undone at once.
    let destroyed = false; // Once torn down, a late-resolving async walk must not still fire callbacks
    const pendingThumbnails = new Set(); // in-flight video-thumbnail finishers, so destroy() can cancel a decode mid-flight
    const listeners = new Set(); // change subscribers — each gets the full state on every collection change
    const thumbnails = new Map(); // file -> Promise of its thumbnail url; the dropzone revokes these when files leave

    // Register an event listener and remember how to remove it during teardown.
    function registerEventListener(target, type, handler) {
        target.addEventListener(type, handler);

        cleanups.push(function () {
            target.removeEventListener(type, handler); // Remember how to detach it
        });
    }

    // Tears down the whole dropzone: runs every registered cleanup, detaching all listeners it attached.
    function destroy() {
        if (destroyed) return;

        destroyed = true; // Prevent further work and make future destroy calls harmless.

        cleanups.forEach(function (cleanup) {
            cleanup();
        });

        cleanups.length = 0; // Release references to the cleanup functions and their event targets.
        resetDrag(); // Clear the drag counter and notify the consumer if the drag-over state was active.
        listeners.clear(); // release all subscribers

        // Cancel any in-flight thumbnail decodes — otherwise a detached <video> keeps decoding until its
        // own 10s timeout. finishWith is idempotent, so this just tears each one down now (resolving it null).
        for (const finishThumbnail of [...pendingThumbnails]) {
            finishThumbnail(null); // forces finishWith → pause/load/revoke/clearTimeout, removes itself from the set
        }

        revokeAllThumbnails(); // revoke every thumbnail url the dropzone minted
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Options --------------------------------------------------------------------------------------------------
    const {
        onChange,
        onMessages,
        onDragOverChange,
        accept,
        exclude,
        minSize,
        maxSize,
        maxFiles,
        maxTotalSize,
        multiple = true,
        openOnClick = true,
        disabled = false,
        dedupe = true
    } = options;

    // Validate a list of dotted extensions (shared by 'accept' and 'exclude')
    function validateExtensionList(value, optionName) {
        if (!Array.isArray(value)) {
            throw new TypeError(`createDropzone: the '${optionName}' option must be an array of extension strings, e.g. ['.jpg', '.mp4'].`);
        }

        if (value.length === 0) {
            throw new TypeError(`createDropzone: the '${optionName}' option must list at least one extension; omit it instead.`);
        }

        value.forEach(function (extension) {
            if (typeof extension !== "string" || !extension.trim()) {
                throw new TypeError(`createDropzone: each '${optionName}' entry must be a non-empty extension string, got: ${JSON.stringify(extension)}`);
            }

            if (extension !== extension.trim()) {
                throw new TypeError(`createDropzone: '${optionName}' entries must have no surrounding whitespace, got: ${JSON.stringify(extension)}`);
            }

            if (!extension.startsWith(".")) {
                throw new TypeError(`createDropzone: '${optionName}' entries must be dotted extensions — use '.jpg', not 'jpg'.`);
            }
        });
    }

    function validateOptions() {

        // onChange is optional but must be a function when provided
        if (onChange !== undefined && typeof onChange !== "function") {
            throw new TypeError("createDropzone: the 'onChange' option must be a function when provided.");
        }

        // onMessages is optional but must be a function when provided
        if (onMessages !== undefined && typeof onMessages !== "function") {
            throw new TypeError("createDropzone: the 'onMessages' option must be a function when provided.");
        }

        // onDragOverChange is optional but must be a function when provided
        if (onDragOverChange !== undefined && typeof onDragOverChange !== "function") {
            throw new TypeError("createDropzone: the 'onDragOverChange' option must be a function when provided.");
        }

        // accept is optional; when provided, only these extensions are allowed
        if (accept !== undefined) {
            validateExtensionList(accept, "accept");
        }

        // exclude is optional; same shape as accept, but it blocks these extensions instead of allowing only them
        if (exclude !== undefined) {
            validateExtensionList(exclude, "exclude");
        }

        // minSize is optional; when provided, it must be a positive number of bytes (rejects empty/tiny files)
        if (minSize !== undefined && (!Number.isFinite(minSize) || minSize <= 0)) {
            throw new TypeError("createDropzone: the 'minSize' option must be a positive number of bytes.");
        }

        // maxSize is optional; when provided, it must be a positive number of bytes
        if (maxSize !== undefined && (!Number.isFinite(maxSize) || maxSize <= 0)) {
            throw new TypeError("createDropzone: the 'maxSize' option must be a positive number of bytes.");
        }

        if (minSize !== undefined && maxSize !== undefined && minSize > maxSize) {
            throw new TypeError("createDropzone: 'minSize' cannot exceed 'maxSize'.");
        }

        // maxFiles is optional; when provided, it must be a positive whole number (a cap on the total kept)
        if (maxFiles !== undefined && (!Number.isInteger(maxFiles) || maxFiles <= 0)) {
            throw new TypeError("createDropzone: the 'maxFiles' option must be a positive whole number.");
        }

        // maxTotalSize is optional; when provided, it must be a positive number of bytes (cap on the combined size)
        if (maxTotalSize !== undefined && (!Number.isFinite(maxTotalSize) || maxTotalSize <= 0)) {
            throw new TypeError("createDropzone: the 'maxTotalSize' option must be a positive number of bytes.");
        }

        // multiple is optional and must be a boolean
        if (typeof multiple !== "boolean") {
            throw new TypeError("createDropzone: the 'multiple' option must be a boolean.");
        }

        // openOnClick is optional and must be a boolean
        if (typeof openOnClick !== "boolean") {
            throw new TypeError("createDropzone: the 'openOnClick' option must be a boolean.");
        }

        // disabled is optional and must be a boolean
        if (typeof disabled !== "boolean") {
            throw new TypeError("createDropzone: the 'disabled' option must be a boolean.");
        }

        // dedupe is optional and must be a boolean
        if (typeof dedupe !== "boolean") {
            throw new TypeError("createDropzone: the 'dedupe' option must be a boolean.");
        }
    }

    validateOptions();

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Files ----------------------------------------------------------------------------------------------------
    const acceptedFiles = []; // Every file the dropzone currently holds, across all drops — the collection it owns

    // A snapshot of what the dropzone currently holds — consumers render from this.
    function getState() {
        return {
            files: acceptedFiles.slice(), // a copy, so callers can't mutate the collection
            count: acceptedFiles.length,
            totalSize: acceptedFiles.reduce(function (total, file) {
                return total + file.size;
            }, 0),
        };
    }

    // Subscribe to collection changes. The listener gets the state on every change (not
    // immediately — read getState() for the first paint). Returns an unsubscribe function.
    function subscribe(listener) {
        listeners.add(listener);
        return function unsubscribe() {
            listeners.delete(listener);
        };
    }

    // Emit the current state to every subscriber. Called after any change to the collection.
    function notify() {
        if (destroyed) return;
        const state = getState();
        for (const listener of listeners) {
            callConsumer(listener, state);
        }
    }

    // Remove one file from the "files" array; returns whether a file was actually removed
    function deleteFile(file) {
        const index = acceptedFiles.indexOf(file);
        if (index === -1) return false; // not held — nothing removed

        acceptedFiles.splice(index, 1);
        revokeThumbnail(file); // release the file's thumbnail url
        notify(); // the collection changed — tell subscribers
        return true;
    }

    // Remove all files from the "files" array
    function deleteAllFiles() {
        if (!acceptedFiles.length) return; // nothing to clear, nothing to announce
        acceptedFiles.length = 0; // Empty the existing array without replacing its reference.
        revokeAllThumbnails(); // release every minted thumbnail url
        notify();
    }

    // Acquire files programmatically — same validate → dedupe → limits → commit → notify path as a drop.
    // Takes a File, a FileList, or an array of File objects. Returns { accepted, messages }.
    function addFiles(files) {
        return outputFiles(files instanceof File ? [files] : files); // wrap a lone File so Array.from doesn't silently drop it
    }

    // Swap one held file for another in its place — for an edit flow (e.g. crop → save). Atomic: if the
    // replacement fails validation the original stays put and the reason rides onMessages. Returns whether it swapped.
    function replaceFile(oldFile, newFile) {
        if (destroyed) return false;

        // The replacement must be a File BEFORE we touch the collection — a Blob (e.g. from canvas.toBlob) or null
        // would throw inside validateFiles after the old file was already pulled, permanently losing it. Reject up front.
        if (!(newFile instanceof File)) {
            throw new TypeError("createDropzone: replaceFile's replacement must be a File — convert a Blob via new File([blob], name, { type }).");
        }

        const index = acceptedFiles.indexOf(oldFile);
        if (index === -1) return false; // not held — nothing to replace

        acceptedFiles.splice(index, 1); // tentatively pull the old one so dedupe/limits judge the new one as if it's already gone
        const {accepted, messages} = validateFiles([newFile]);

        if (accepted.length) {
            acceptedFiles.splice(index, 0, newFile); // drop the replacement into the same slot — position preserved
            revokeThumbnail(oldFile); // release the old preview; the new one mints on the next render
            notify();
            return true;
        }

        acceptedFiles.splice(index, 0, oldFile); // rejected — restore the original in place; nothing changed
        if (messages.length && onMessages) {
            callConsumer(onMessages, messages);
        }
        return false;
    }

    // Does the file's name end with one of these dotted extensions? Case-insensitive.
    // Used by both the 'accept' allowlist and the 'exclude' blocklist.
    // NOTE: matches on the filename only — a user-controlled, trivially-spoofable string.
    // accept/exclude are UX filters, NOT a security boundary; verify real file contents elsewhere.
    function fileHasExtensionIn(file, extensions) {
        const name = file.name.toLowerCase();

        return extensions.some(function (extension) {
            return name.endsWith(extension.toLowerCase());
        });
    }

    // The names already held, lowercased — a path can't hold two files of the same name.
    function collectExistingNames() {
        const names = new Set();
        for (const file of acceptedFiles) {
            names.add(file.name.toLowerCase());
        }
        return names;
    }

    // How many times each (lowercased) name appears in a list of files.
    function countNames(files) {
        const counts = new Map();
        for (const file of files) {
            const name = file.name.toLowerCase();
            counts.set(name, (counts.get(name) || 0) + 1);
        }
        return counts;
    }

    // Every message the dropzone sends: a stable `id` (matching / i18n), a default human
    // `message`, and the files it concerns. Built here so the shape can't drift.
    function message(id, text, files) {
        return {id: id, message: text, files: files};
    }

    function validateFiles(files) {
        const messages = [];

        // Phase 1 — type and size. One file per message.
        const candidates = [];
        for (const file of files) {

            // if file type isn't accepted
            if (accept && !fileHasExtensionIn(file, accept)) {
                messages.push(message("invalid-extension", `This file type isn't accepted. Accepted types: ${accept.join(", ")}.`, [file]));
                continue;
            }

            // if file type isn't allowed
            if (exclude && fileHasExtensionIn(file, exclude)) {
                messages.push(message("excluded-extension", `This file type isn't allowed. Blocked types: ${exclude.join(", ")}.`, [file]));
                continue;
            }

            // a 0-byte / empty file is never useful — always rejected, independent of minSize
            if (file.size === 0) {
                messages.push(message("empty-file", "This file is empty.", [file]));
                continue;
            }

            // if file is below the minimum size
            if (minSize && file.size < minSize) {
                messages.push(message("file-too-small", `This file is too small. Minimum size: ${formatBytes(minSize)}.`, [file]));
                continue;
            }

            // if file is too large
            if (maxSize && file.size > maxSize) {
                messages.push(message("file-too-large", `This file is too large. Maximum size: ${formatBytes(maxSize)}.`, [file]));
                continue;
            }

            candidates.push(file);
        }

        // Phase 2 — dedupe by name. A name already in the collection, or appearing more
        // than once in this batch, is a path collision: none of the files sharing that
        // name get in. One message per clashing name, carrying every file that clashed.
        let accepted = candidates;
        if (dedupe) {
            accepted = [];
            const existingNames = collectExistingNames();
            const candidateNameCounts = countNames(candidates);
            const collidedByName = new Map(); // lowercased name -> the files that clashed on it

            for (const file of candidates) {
                const name = file.name.toLowerCase();
                const collides = existingNames.has(name) || candidateNameCounts.get(name) > 1;

                if (collides) {
                    const group = collidedByName.get(name) || [];
                    group.push(file);
                    collidedByName.set(name, group);
                    continue;
                }

                accepted.push(file);
            }

            for (const group of collidedByName.values()) {
                messages.push(message("duplicate", `A file named "${group[0].name}" is a duplicate — it wasn't added.`, group));
            }
        }

        // Phase 3 — whole-drop limits on the survivors. Tripping one blocks the whole drop;
        // the blocked-but-valid files ride along on the message.

        // one-file mode: any result past a single file is refused, not replaced
        if (!multiple && acceptedFiles.length + accepted.length > 1) {
            messages.push(message("single-file", "Only one file can be selected at a time.", accepted));
            return {accepted: [], messages: messages};
        }

        // if the drop pushes the total count over the cap, block the whole drop (we can't pick which to keep)
        if (maxFiles && acceptedFiles.length + accepted.length > maxFiles) {
            messages.push(message("max-files", `Too many files. At most ${maxFiles} can be added.`, accepted));
            return {accepted: [], messages: messages};
        }

        // if the drop pushes the combined size over the cap, block the whole drop
        if (maxTotalSize) {
            const totalSize = acceptedFiles.concat(accepted).reduce(function (total, file) {
                return total + file.size;
            }, 0);

            if (totalSize > maxTotalSize) {
                messages.push(message("max-total-size", `These files exceed the total size limit of ${formatBytes(maxTotalSize)}.`, accepted));
                return {accepted: [], messages: messages};
            }
        }

        return {accepted: accepted, messages: messages};
    }

    // The output. Filters the files, commits the accepted ones, emits the results, and reports the outcome.
    function outputFiles(fileList) {
        if (destroyed) {
            return {accepted: [], messages: []}; // dead instance — nothing acquired
        }

        const {accepted, messages} = validateFiles(fileList ? Array.from(fileList) : []);

        // A plain loop rather than push(...accepted), because spreading a very large batch into push() can overflow the argument-count limit.
        for (const file of accepted) {
            acceptedFiles.push(file);
        }

        // Collection grew — emit the new state to subscribers
        if (accepted.length) {
            notify();
        }

        // Output Messages (every rejection/limit, uniform { id, message, files })
        if (messages.length && onMessages) {
            callConsumer(onMessages, messages);
        }

        return {accepted: accepted, messages: messages}; // report to programmatic callers (addFiles); drop and pick ignore it
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Input Sources --------------------------------------------------------------------------------------------

    // State
    let isDisabled = disabled; // A disabled dropzone ignores drags and clicks.
    let isDraggingOver = false; // Whether a file drag is currently over the zone (the highlighted state).
    let dragDepth = 0; // How many nested elements the drag is currently inside. This is the counter that stops the highlight flickering as the cursor crosses child elements.

    // State Helpers
    function enterDraggingOver() {
        if (isDraggingOver) return; // Already over the zone; don't re-fire

        isDraggingOver = true;
        if (onDragOverChange) {
            callConsumer(onDragOverChange, true);
        }
    }

    function leaveDraggingOver() {
        if (!isDraggingOver) return; // Already gone; don't re-fire

        isDraggingOver = false;
        if (onDragOverChange) {
            callConsumer(onDragOverChange, false);
        }
    }

    function resetDrag() {
        dragDepth = 0;
        leaveDraggingOver();
    }

    // Public Controls — disable() gates everything: drag and click-to-open.
    function enable() {
        isDisabled = false;
    }

    function disable() {
        isDisabled = true;
        resetDrag(); // Clear any highlight left over from a drag that was in progress
    }

    // On Drag on/around Dropzone
    function dragContainsFiles(dataTransfer) {
        return !!dataTransfer && Array.prototype.includes.call(dataTransfer.types, "Files");
    }

    function listenForDragEnter() {
        registerEventListener(element, "dragenter", function (event) {
            if (isDisabled) return;

            if (!dragContainsFiles(event.dataTransfer)) return; // Leave non-file drags untouched.

            event.preventDefault();
            dragDepth++; // Count this entry (children fire their own dragenter events too)
            enterDraggingOver();
        });
    }

    function listenForDragOver() {
        registerEventListener(element, "dragover", function (event) {
            if (isDisabled) return;

            if (!dragContainsFiles(event.dataTransfer)) return; // Leave non-file drags untouched.

            event.preventDefault(); // Without this on dragover, the browser refuses the drop entirely
            event.dataTransfer.dropEffect = "copy"; // Show the green "+" copy cursor instead of a move/no-drop one
            enterDraggingOver(); // self-heal: dragover keeps firing, so the highlight recovers even if a dragenter was missed (e.g. after disable→enable mid-drag)
        });
    }

    function listenForDragLeave() {
        registerEventListener(element, "dragleave", function () {
            if (--dragDepth <= 0) { // Only switch off once we've left the zone AND all its children
                dragDepth = 0; // Prevent the nested-entry counter from becoming negative.
                leaveDraggingOver();
            }
        });
    }

    function listenForDrop() {
        registerEventListener(element, "drop", function (event) {
            if (isDisabled) return;

            if (!dragContainsFiles(event.dataTransfer)) return; // Leave non-file drops untouched.

            event.preventDefault(); // Prevent the browser from opening or navigating to the dropped file.
            dragDepth = 0; // A drop fires no dragleave, so reset the counter by hand
            leaveDraggingOver();

            const transfer = event.dataTransfer;

            if (transfer && transfer.items && transfer.items.length) { // Prefer the items API because it supports dropped folders.
                collectDroppedFiles(transfer.items).then(
                    outputFiles, // Walk entries + recover any entry-less files
                    function (error) {
                        if (destroyed || !onMessages) return; // Do not report after teardown or without a message callback.

                        callConsumer(onMessages, [message("collect-failed", error instanceof Error
                            ? error.message
                            : "Unable to collect the dropped files.", [])]);
                    }
                );
            } else {
                outputFiles(transfer && transfer.files); // Browser without items API: take the flat file list
            }
        });
    }

    // Reset drag state when the dropzone cannot receive its own dragleave event.
    function listenForDragReset() {

        // the zone's own dragleave handles leaving the zone; these cover what it can't see:
        // a drop anywhere (even outside the zone), and the window losing focus mid-drag (dragged out to another app)
        registerEventListener(element.ownerDocument, "drop", function () {
            resetDrag();
        });

        registerEventListener(element.ownerDocument.defaultView, "blur", function () {
            resetDrag();
        });
    }

    // Prevent unhandled file drops from opening files or navigating the browser.
    function listenForPageGuard() {

        // Control file drags that no registered drop target has claimed.
        registerEventListener(element.ownerDocument, "dragover", function (event) {
            if (event.defaultPrevented) return; // Another drop target already handled this event.
            if (!dragContainsFiles(event.dataTransfer)) return; // Leave non-file drags untouched.

            event.preventDefault(); // Claim the unhandled file drag so controlled drop behavior is permitted.
            event.dataTransfer.dropEffect = "none"; // Nothing here accepts files — show a "can't drop" cursor.
        });

        // Suppress file drops that occur outside a registered drop target.
        registerEventListener(element.ownerDocument, "drop", function (event) {
            if (event.defaultPrevented) return; // Another drop target already handled this event.
            if (!dragContainsFiles(event.dataTransfer)) return; // Leave non-file drops untouched.

            event.preventDefault(); // Stop the browser from opening or navigating to the dropped file.
        });
    }

    // File Picker

    // Create a detached file input that opens the browser's native file-selection dialog.
    const filePicker = Object.assign(element.ownerDocument.createElement("input"), {
        type: "file",
        multiple,
        accept: accept ? accept.join(",") : "", // Pass accepted extensions to the browser's picker filter.
    });

    // Open the native file picker when the dropzone is active.
    function openFilePicker() {
        if (destroyed || isDisabled) return; // Do nothing after teardown or while acquisition is disabled.

        filePicker.click();
    }

    // On Click on Dropzone (the always-visible area where it says to "drop files here")
    function listenForZoneClick() {
        if (openOnClick) {
            registerEventListener(element, "click", openFilePicker);
        }
    }

    // On Click on File Picker (the input with type="file")
    function listenForFilePick() {

        // Process files whenever the user completes a selection in the native picker.
        registerEventListener(filePicker, "change", function () {
            outputFiles(filePicker.files);
            filePicker.value = ""; // Reset so the same file can be picked again next time
        });
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    //#region Thumbnails -----------------------------------------------------------------------------------------------

    // Build (or reuse) a thumbnail URL for a file. The dropzone OWNS the URL and revokes it when the file
    // leaves the collection — callers just render it and never revoke. Repeat calls reuse the same one.
    function createThumbnail(file) {
        if (destroyed) return Promise.resolve(null); // don't start new decode work after teardown
        if (thumbnails.has(file)) return thumbnails.get(file); // reuse the in-flight or finished result

        const thumbnail = buildThumbnail(file).then(function (url) {
            // The file left mid-decode — drop the url now rather than leak it.
            if (url && !acceptedFiles.includes(file)) {
                URL.revokeObjectURL(url);
                return null;
            }
            return url;
        });

        thumbnails.set(file, thumbnail);
        return thumbnail;
    }

    // The decode itself: an image is its own preview; a video yields a captured frame; anything else, none.
    async function buildThumbnail(file) {
        if (file.type.startsWith("image/")) { // Images can be displayed directly without generating a new preview.
            return URL.createObjectURL(file); // The image itself is the thumbnail
        }

        if (file.type.startsWith("video/")) { // Videos require extracting a frame to use as their thumbnail.
            return createVideoThumbnail(file); // Extract frame from video, use frame as thumbnail
        }

        return null; // Nothing to use as thumbnail (e.g., a PDF, a ZIP, etc.)
    }

    // Revoke and forget a file's thumbnail — called when the file leaves the collection.
    function revokeThumbnail(file) {
        const thumbnail = thumbnails.get(file);
        if (!thumbnail) return;

        thumbnails.delete(file);
        thumbnail.then(function (url) {
            if (url) URL.revokeObjectURL(url);
        });
    }

    // Revoke and forget every thumbnail the dropzone minted — for clear-all and teardown.
    function revokeAllThumbnails() {
        for (const file of [...thumbnails.keys()]) {
            revokeThumbnail(file);
        }
    }

    // Generate a thumbnail by loading the video, seeking to a frame, and drawing it onto a canvas.
    function createVideoThumbnail(file) {
        return new Promise(function (resolve) {
            const sourceUrl = URL.createObjectURL(file); // The video is read straight from this blob url
            const video = element.ownerDocument.createElement("video"); // Detached element, never added to the page
            let settled = false; // "seeked" can fire repeatedly, and "error" can follow — capture and resolve only once

            // Stop waiting if the video cannot produce a thumbnail within ten seconds.
            const thumbnailTimeout = setTimeout(function () {
                finishWith(null); // Abandon thumbnail generation and clean up its resources.
            }, 10000);

            video.muted = true; // We don't want noise playing
            video.preload = "auto"; // Fetch enough of the file to reach a seekable frame

            // Finish at once, release the source video URL, and resolve the thumbnail result.
            function finishWith(thumbnailUrl) {
                if (settled) return; // Ignore duplicate timeout, media, or canvas callbacks.

                settled = true; // Prevent any later callback from completing the operation again.
                pendingThumbnails.delete(finishWith); // this decode is finishing — drop it from the in-flight set
                clearTimeout(thumbnailTimeout); // Cancel the timeout after success or an earlier failure.
                video.pause(); // Stop the video reading the blob
                video.removeAttribute("src"); // Remove the source URL
                video.load(); // Aborts the video's in-flight reads of the blob; revoking only after that avoids ERR_FILE_NOT_FOUND errors from reads that would otherwise still be pointing at a url we already revoked.
                URL.revokeObjectURL(sourceUrl); // Safe now: nothing is reading the blob anymore
                resolve(thumbnailUrl);
            }

            pendingThumbnails.add(finishWith); // register this decode so destroy() can tear it down before its 10s timeout

            // Wait until video duration and seeking information are available.
            video.addEventListener("loadedmetadata", function () {
                if (settled) return; // Ignore metadata arriving after timeout or failure.

                const durationIsUsable = Number.isFinite(video.duration) && video.duration > 0; // Some encoders report Infinity/NaN

                if (durationIsUsable) {
                    video.currentTime = Math.min(3, video.duration / 2); // 3s in, or near the start otherwise
                } else {
                    video.currentTime = 0.1; // Attempt a frame near the beginning when duration is unavailable.
                }
            });

            // Capture the video frame after seeking reaches the requested time.
            video.addEventListener("seeked", function () {
                if (settled) return; // Ignore seek completion after timeout or failure.

                const canvas = element.ownerDocument.createElement("canvas"); // Create a detached canvas for the captured frame.
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;

                const context = canvas.getContext("2d");

                if (!context) { // Stop when the browser cannot provide a canvas drawing context.
                    finishWith(null);
                    return;
                }

                try {
                    context.drawImage(video, 0, 0, canvas.width, canvas.height); // Copy the decoded frame into the canvas
                } catch {
                    finishWith(null); // Fail cleanly if the decoded frame cannot be drawn.
                    return;
                }

                // Convert the captured canvas frame into a thumbnail image blob.
                canvas.toBlob(function (blob) {
                    if (settled) return; // Avoid creating a thumbnail URL after timeout or failure.

                    finishWith(blob ? URL.createObjectURL(blob) : null); // Return the thumbnail URL when blob creation succeeds.
                });
            });

            // Handle video loading or decoding failure.
            video.addEventListener("error", function () {
                finishWith(null); // Couldn't decode — no thumbnail
            });

            video.src = sourceUrl; // Begin loading only after every required event listener is registered.
        });
    }

    //#endregion -------------------------------------------------------------------------------------------------------

    if (onChange) subscribe(onChange); // register the onChange option as a subscriber

    listenForDragEnter();
    listenForDragOver();
    listenForDragLeave();
    listenForDrop();
    listenForDragReset();
    listenForPageGuard();
    listenForZoneClick();
    listenForFilePick();

    return {
        getState,
        subscribe,
        addFiles,
        deleteFile,
        deleteAllFiles,
        replaceFile,
        openFilePicker,
        createThumbnail,
        enable,
        disable,
        destroy
    };
}
