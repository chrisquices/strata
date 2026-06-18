// drag-n-drop-engine.js
// A headless FILE-INTAKE engine — the clean, app-agnostic layer that gets files
// *into* an app from drag-and-drop, paste, and a file-picker, validates them,
// optionally reads previews, and emits state. It is the "anti-FilePond": where
// FilePond ships UI *and* upload transport coupled to your server, this ships
// NEITHER. It receives File objects, applies the consumer's rules, and hands the
// resulting files + drag-state + validation back. Uploading stays the consumer's
// job (its own fetch/endpoint/S3 flow).
//
// SCOPE LINE (read first). Intake only. This engine does NOT upload, transport,
// chunk, retry, show real-upload progress, or know anything about a backend. No
// XHR, no networking, no server awareness. It funnels files from drop / paste /
// picker into one collection, validates each against consumer-supplied rules,
// optionally makes a preview URL, and emits the collection + drag-state + counts.
//
// HEADLESS. The engine creates no drop-zone DOM and ships no CSS. It manages
// intake state (accepted files, rejected files with reasons, drag-over state) and
// emits it via getState() + subscribe()/onChange. The CONSUMER renders the drop
// zone, the drag-over highlight, the file list/grid, the thumbnails, the browse
// button, and every pixel of styling. There is no built-in dropzone component.
//
// ELEMENT BY REFERENCE. The consumer creates the drop-zone element (any element —
// a div, a section, the whole gallery, or document/window for full-page drop) and
// hands the element *object* to attach(); the engine wires the native HTML5
// drag/drop (and optional paste) listeners to it. No selector strings, no
// querySelector. detach() removes every listener; destroy() additionally clears
// the collection and revokes every preview URL.
//
// DEPENDENCY-FREE & DOM-OPTIONAL. Zero runtime dependencies beyond ../shared/. The
// only browser APIs it touches — drag events, DataTransfer, the File API,
// URL.createObjectURL / FileReader, the <input type=file> picker, clipboard paste,
// the entries API for folder traversal — are ALL touched inside method bodies,
// behind capability checks, NEVER at module scope. So the pure logic (validation
// rules, the intake state model, dedup, partitioning) imports and runs clean in
// Node with no `document` (provable by the test suite's static import).
//
// NOTE: this engine does NOT use shared/gestures.js. File intake rides native file
// drop events and the File API, not pointer-drag recognition (that is the sortable
// engine's domain — a different thing). It imports only Emitter from ../shared/.
//
// Exports: { createDropZone, IntakeStatus, RejectReason, PreviewMode, Source }

import { Emitter } from '../shared/emitter.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/** Per-file verdict the engine tags onto every incoming file. */
export const IntakeStatus = Object.freeze({
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
});

/**
 * Stable machine code for *why* a file was rejected. The human-readable string is
 * carried separately as `message` (the custom validator's returned string lands
 * there). Consumers branch on `reason`, display `message`.
 */
export const RejectReason = Object.freeze({
  TYPE: 'type',                   // failed the accept (MIME/extension) rules
  TOO_LARGE: 'too-large',         // bigger than maxSize
  TOO_SMALL: 'too-small',         // smaller than minSize
  MAX_FILES: 'max-files',         // collection already at the maxFiles cap
  MAX_PER_DROP: 'max-per-drop',   // this batch already at the maxPerDrop cap
  MAX_TOTAL_SIZE: 'max-total-size', // would push the collection past maxTotalSize
  DUPLICATE: 'duplicate',         // same key (name+size, or keyFn) already present
  CUSTOM: 'custom',               // the consumer's validator rejected it
});

/** How (and whether) a preview is produced for an accepted image. */
export const PreviewMode = Object.freeze({
  NONE: 'none',             // no preview (default — lightest)
  OBJECT_URL: 'object-url', // URL.createObjectURL — cheap, must be revoked (engine does)
  DATA_URL: 'data-url',     // FileReader base64 — heavier, async, nothing to revoke
});

/** Where a file entered the collection from. Carried through, untouched. */
export const Source = Object.freeze({
  DROP: 'drop',
  PASTE: 'paste',
  PICKER: 'picker',
  ADD: 'add', // programmatic add()
});

// ============================================================================
// Small pure helpers (no DOM — module scope is safe to import in Node)
// ============================================================================

/** A finite, strictly-positive number is an active numeric limit; everything else is "no limit". */
const isActiveLimit = (n) => typeof n === 'number' && n > 0 && Number.isFinite(n);

/** Human-friendly byte size for reject messages. */
function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return String(bytes);
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

/**
 * Normalize an `accept` config into a matcher. Tokens mirror the HTML `accept`
 * attribute: exact MIME (`application/pdf`), MIME wildcard (`image/*`), and
 * extension (`.png`). A wildcard `*` (also `*` slash `*`), or empty, accepts anything.
 * @returns {?{any: boolean, mimes: string[], wildcards: string[], extensions: string[]}}
 *          null = no rules (accept everything).
 */
function normalizeAccept(accept) {
  if (accept == null || accept === '') return null;
  const tokens = Array.isArray(accept) ? accept : String(accept).split(',');
  const mimes = [];
  const wildcards = []; // stored as a prefix to startsWith, e.g. 'image/'
  const extensions = [];
  let any = false;
  for (let raw of tokens) {
    const token = String(raw).trim().toLowerCase();
    if (!token) continue;
    if (token === '*' || token === '*/*') { any = true; continue; }
    if (token.startsWith('.')) extensions.push(token);
    else if (token.endsWith('/*')) wildcards.push(token.slice(0, -1));
    else mimes.push(token);
  }
  if (any) return { any: true, mimes, wildcards, extensions };
  if (!mimes.length && !wildcards.length && !extensions.length) return null;
  return { any: false, mimes, wildcards, extensions };
}

/** Does a MIME type satisfy the accept matcher's MIME/wildcard rules? */
function mimeMatches(type, matcher) {
  if (!type) return false;
  const normalizedType = String(type).toLowerCase();
  if (matcher.mimes.includes(normalizedType)) return true;
  for (const wildcardPrefix of matcher.wildcards) {
    if (normalizedType.startsWith(wildcardPrefix)) return true;
  }
  return false;
}

/** Does a filename's extension satisfy the accept matcher's extension rules? */
function extensionMatchesAccept(name, matcher) {
  if (!matcher.extensions.length || !name) return false;
  const lower = String(name).toLowerCase();
  return matcher.extensions.some((ext) => lower.endsWith(ext));
}

/**
 * Liberal accept match: a file is accepted if its MIME OR its extension matches.
 * Files with an empty/unknown MIME type can still match via extension (or `*`).
 */
function matchesAccept(file, matcher) {
  if (!matcher || matcher.any) return true;
  return mimeMatches(file && file.type, matcher) || extensionMatchesAccept(file && file.name, matcher);
}

/**
 * Best-effort pre-drop acceptability from the types the browser exposes during
 * dragover (MIME only — names/sizes/extensions are hidden until drop).
 *   true  — every dragged item exposes a readable type AND every one satisfies a MIME rule
 *   false — a readable type matches no rule and no extension rule could rescue it
 *   null  — undeterminable (types hidden, fewer readable types than items, or only
 *           extension rules to check against)
 * @param {string[]} types  the peekable MIME types
 * @param {number} count    how many file items are being dragged
 */
function peekAcceptability(types, count, matcher) {
  if (!matcher || matcher.any) return true;
  if (!types.length) return null;
  const everyReadableMatches = types.every((t) => mimeMatches(t, matcher));
  if (everyReadableMatches && types.length >= count) return true;
  // Extension rules can't be evaluated from a drag (the name is hidden), so any
  // mismatch is only "maybe" when extensions are in play.
  if (matcher.extensions.length) return null;
  return everyReadableMatches ? null : false;
}

/** Normalize a `preview` option to a PreviewMode. `true` → object URL; omitted/`false` → none. */
function normalizePreview(previewOption) {
  if (previewOption === true) return PreviewMode.OBJECT_URL;
  // Omitted / disabled ⇒ no preview (the documented default + `false`).
  if (previewOption == null || previewOption === false) return PreviewMode.NONE;
  if (
    previewOption === PreviewMode.OBJECT_URL ||
    previewOption === PreviewMode.DATA_URL ||
    previewOption === PreviewMode.NONE
  ) return previewOption;
  const text = typeof previewOption === 'string' ? previewOption.toLowerCase() : '';
  if (text === 'objecturl' || text === 'object-url' || text === 'url' || text === 'object') {
    return PreviewMode.OBJECT_URL;
  }
  if (text === 'dataurl' || text === 'data-url' || text === 'data' || text === 'base64') {
    return PreviewMode.DATA_URL;
  }
  // A genuinely unknown value is a programming error — throw like the sibling
  // enums rather than silently behaving like 'none'.
  throw new TypeError(`drag-n-drop: unknown preview mode ${JSON.stringify(previewOption)}`);
}

/** Build the HTML `accept` attribute string from the config value. */
function acceptToAttribute(accept) {
  if (accept == null || accept === '') return '';
  return Array.isArray(accept) ? accept.join(',') : String(accept);
}

/** True for a document or a window (full-page attach targets). */
function isDocOrWindow(target) {
  return !!target && (target.nodeType === 9 || (typeof window !== "undefined" && target === window));
}

const hasDocument = () => typeof document !== 'undefined';
const canObjectURL = () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

/**
 * Coerce drop/paste/picker payloads into a flat array of File-like objects.
 * Accepts a single File, a FileList, an Array, or any array-like of files.
 */
function toFileArray(files) {
  if (files == null) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  if (typeof FileList !== 'undefined' && files instanceof FileList) return [...files];
  // FileList-ish (has item()) or a plain array-like that is not itself a file.
  // Array.from, not spread: a plain array-like ({ length, 0, 1, ... }) is not
  // iterable, and the spread used to throw on exactly the shape we document.
  if (typeof files.length === 'number' && typeof files.item === 'function') return Array.from(files).filter(Boolean);
  if (typeof files.length === 'number' && !('name' in files) && !('size' in files)) return Array.from(files).filter(Boolean);
  return [files]; // a single File / File-like { name, size, type }
}

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} IntakeFile  the emitted, read-only view of one intake item
 * @property {string} id            engine-assigned, unique within the instance
 * @property {*} file               the underlying File (opaque to the engine; the consumer uploads it)
 * @property {string} name
 * @property {number} size          bytes (0 for size-less / unknown)
 * @property {string} type          MIME type ('' when the OS reports none)
 * @property {string} status        'accepted' | 'rejected'
 * @property {boolean} accepted     convenience: status === 'accepted'
 * @property {?string} reason       a RejectReason code when rejected, else null
 * @property {?string} message      human-readable reason (validator string lands here), else null
 * @property {string} source        'drop' | 'paste' | 'picker' | 'add'
 * @property {?string} preview      object URL or data URL once read, else null
 * @property {string} previewMode   the PreviewMode of `preview`
 */

/**
 * @typedef {Object} DragState
 * @property {boolean} isDraggingOver  something is dragged over an attached zone
 * @property {?boolean} willAccept     best-effort pre-drop acceptability (null = unknown)
 * @property {?number} fileCount       number of dragged file items, if visible (else null)
 */

/**
 * @typedef {Object} IntakeState
 * @property {IntakeFile[]} files      every retained item, in intake order
 * @property {IntakeFile[]} accepted   the accepted subset
 * @property {IntakeFile[]} rejected   the retained rejected subset (empty if retainRejected:false)
 * @property {{total:number, accepted:number, rejected:number}} counts
 * @property {number} totalSize        summed bytes of accepted files
 * @property {DragState} drag
 * @property {Object} config           a readable snapshot of the resolved rules
 */

// ============================================================================
// createDropZone
// ============================================================================

/**
 * Create a headless file-intake instance.
 *
 * @param {Object} [options]
 * @param {string|string[]} [options.accept]   accepted types — MIME, `image/*`, `.png`, or a list (null = any)
 * @param {number} [options.maxSize]           per-file max bytes
 * @param {number} [options.minSize]           per-file min bytes
 * @param {number} [options.maxFiles]          max files total in the collection
 * @param {number} [options.maxPerDrop]        max files accepted from one drop/paste/add batch
 * @param {number} [options.maxTotalSize]      max summed bytes of the collection
 * @param {(file: *) => (true|string)} [options.validator]  custom rule: true=accept, string=reject reason
 * @param {boolean} [options.multiple=true]    allow more than one file (false ⇒ maxFiles defaults to 1)
 * @param {boolean} [options.directory=false]  traverse dropped folders (entries API) to extract files
 * @param {boolean|((file:*)=>*)} [options.dedupe=false]  dedupe by name+size (true) or a custom key fn
 * @param {boolean} [options.retainRejected=true]  keep rejected files (with reasons) in the emitted state
 * @param {number} [options.maxRejected=100]    cap on retained rejected records (oldest pruned; Infinity disables)
 * @param {('none'|'object-url'|'data-url'|boolean)} [options.preview='none']  auto-preview for images
 * @param {number} [options.previewMaxSize=33554432]  skip auto data-URL previews for files past this size (32 MB)
 * @param {number} [options.maxTraversal=1000] traversal budget for a dropped folder tree: caps both the File objects materialized AND the directory entries visited (so a sparse/empty deep tree cannot recurse unbounded); Infinity disables
 * @param {boolean} [options.paste=false]      wire clipboard paste on attach (toggleable via setOptions)
 * @param {(state: IntakeState) => void} [options.onChange]  called with state on every change
 * @returns {Object} the drop-zone instance
 */
export function createDropZone(options = {}) {
  const emitter = new Emitter();
  let onChange = typeof options.onChange === 'function' ? options.onChange : null;

  /** @type {Map<string, Object>} id -> internal record (insertion-ordered) */
  const records = new Map();
  /** @type {Array<{target: any, depth: number, remove: () => void}>} */
  const attachments = [];

  let idSequence = 0;
  let destroyed = false;
  let config = buildConfig(options);
  let rawOptions = { ...options };

  /** @type {DragState} */
  let drag = { isDraggingOver: false, willAccept: null, fileCount: null };

  // Lazily-created, never at module scope.
  let pickerInput = null;     // hidden <input type=file> for openPicker()
  let pasteDocument = null;        // the node the paste listener is wired to
  let pasteHandler = null;

  // ---- configuration ------------------------------------------------------

  /** Resolve a raw options bag into the live config. Recomputed wholesale on setOptions. */
  function buildConfig(sourceOptions) {
    const multiple = sourceOptions.multiple !== false; // default true
    let maxFiles = sourceOptions.maxFiles;
    // single-file zone ⇒ cap at 1. Fall back whenever maxFiles is not an ACTIVE
    // limit (null, NaN/Infinity, <= 0), not only when it is null — a non-finite
    // maxFiles is rejected by isActiveLimit downstream and would otherwise leave
    // a multiple:false zone uncapped.
    if (!multiple && !isActiveLimit(maxFiles)) maxFiles = 1;
    return {
      accept: sourceOptions.accept != null ? sourceOptions.accept : null,
      acceptMatcher: normalizeAccept(sourceOptions.accept),
      acceptAttribute: acceptToAttribute(sourceOptions.accept),
      maxSize: sourceOptions.maxSize != null ? sourceOptions.maxSize : null,
      minSize: sourceOptions.minSize != null ? sourceOptions.minSize : null,
      maxFiles: maxFiles != null ? maxFiles : null,
      maxPerDrop: sourceOptions.maxPerDrop != null ? sourceOptions.maxPerDrop : null,
      maxTotalSize: sourceOptions.maxTotalSize != null ? sourceOptions.maxTotalSize : null,
      validator: typeof sourceOptions.validator === 'function' ? sourceOptions.validator : null,
      multiple,
      directory: !!sourceOptions.directory,
      dedupe: sourceOptions.dedupe === true ? true : (typeof sourceOptions.dedupe === 'function' ? sourceOptions.dedupe : false),
      retainRejected: sourceOptions.retainRejected !== false, // default true
      // Retained rejected records would otherwise grow without bound (each pins a
      // File object); drop the oldest past this cap. Infinity disables the cap.
      maxRejected: sourceOptions.maxRejected != null ? sourceOptions.maxRejected : 100,
      preview: normalizePreview(sourceOptions.preview),
      // Auto data-URL previews read the whole file into memory; skip files past
      // this size (the explicit readPreview() call is not subject to it).
      previewMaxSize: sourceOptions.previewMaxSize != null ? sourceOptions.previewMaxSize : 32 * 1024 * 1024,
      // Budget for dropped-folder traversal so a huge tree cannot materialize
      // millions of File objects before any cap applies.
      maxTraversal: sourceOptions.maxTraversal != null ? sourceOptions.maxTraversal : 1000,
      paste: !!sourceOptions.paste,
    };
  }

  /** A readable, function-free snapshot of the rules for the emitted state. */
  function configSnapshot() {
    return {
      accept: config.accept,
      maxSize: config.maxSize,
      minSize: config.minSize,
      maxFiles: config.maxFiles,
      maxPerDrop: config.maxPerDrop,
      maxTotalSize: config.maxTotalSize,
      multiple: config.multiple,
      directory: config.directory,
      dedupe: config.dedupe === true ? true : (typeof config.dedupe === 'function' ? 'keyFn' : false),
      retainRejected: config.retainRejected,
      maxRejected: config.maxRejected,
      preview: config.preview,
      previewMaxSize: config.previewMaxSize,
      maxTraversal: config.maxTraversal,
      paste: config.paste,
      hasValidator: !!config.validator,
    };
  }

  /** Drop the oldest retained rejected records past the maxRejected cap. */
  function pruneRejected() {
    if (!isActiveLimit(config.maxRejected) && config.maxRejected !== 0) return;
    let rejectedCount = 0;
    for (const record of records.values()) if (record.status === IntakeStatus.REJECTED) rejectedCount++;
    if (rejectedCount <= config.maxRejected) return;
    for (const record of records.values()) {
      if (rejectedCount <= config.maxRejected) break;
      if (record.status !== IntakeStatus.REJECTED) continue;
      revokePreview(record);
      records.delete(record.id);
      rejectedCount--;
    }
  }

  // ---- validation ---------------------------------------------------------

  /** The dedupe key for a file (consumer keyFn, else name+size). */
  function dedupeKeyFor(file) {
    if (typeof config.dedupe === 'function') {
      try { return String(config.dedupe(file)); } catch { /* fall through */ }
    }
    return `${(file && file.name) || ''}:${(file && file.size) || 0}`;
  }

  /**
   * Apply every rule, first failure wins. `tally` carries the running batch/collection
   * tally so the count/size caps see files accepted earlier in the same pass.
   * @returns {{ok: true} | {ok: false, reason: string, message: string}}
   */
  function checkFile(file, record, tally) {
    const c = config;
    if (c.acceptMatcher && !matchesAccept(file, c.acceptMatcher)) {
      // The MIME string comes from the file itself (attacker-controllable), so only a
      // well-formed type/subtype is echoed into the display-intended message.
      const safeType = /^[\w.+-]{1,64}\/[\w.+-]{1,64}$/.test(record.type) ? `"${record.type}"` : '(unknown)';
      return { ok: false, reason: RejectReason.TYPE, message: `File type ${safeType} is not accepted` };
    }
    if (isActiveLimit(c.minSize) && record.size < c.minSize) {
      return { ok: false, reason: RejectReason.TOO_SMALL, message: `File is smaller than the ${formatBytes(c.minSize)} minimum` };
    }
    if (isActiveLimit(c.maxSize) && record.size > c.maxSize) {
      return { ok: false, reason: RejectReason.TOO_LARGE, message: `File is larger than the ${formatBytes(c.maxSize)} limit (${formatBytes(record.size)})` };
    }
    if (c.validator) {
      let verdict;
      try {
        verdict = c.validator(file);
      } catch (error) {
        verdict = (error && error.message) || 'Rejected by the custom validator';
      }
      if (verdict !== true) {
        return {
          ok: false,
          reason: RejectReason.CUSTOM,
          message: typeof verdict === 'string' && verdict ? verdict : 'Rejected by the custom validator',
        };
      }
    }
    if (c.dedupe && tally.seen.has(record.dedupeKey)) {
      return { ok: false, reason: RejectReason.DUPLICATE, message: 'Duplicate of a file already added' };
    }
    if (tally.batch && isActiveLimit(c.maxPerDrop) && tally.acceptedInDrop >= c.maxPerDrop) {
      return { ok: false, reason: RejectReason.MAX_PER_DROP, message: `Exceeds the limit of ${c.maxPerDrop} file(s) per drop` };
    }
    if (isActiveLimit(c.maxFiles) && tally.acceptedTotal >= c.maxFiles) {
      return { ok: false, reason: RejectReason.MAX_FILES, message: `Exceeds the limit of ${c.maxFiles} file(s)` };
    }
    if (isActiveLimit(c.maxTotalSize) && tally.totalSize + record.size > c.maxTotalSize) {
      return { ok: false, reason: RejectReason.MAX_TOTAL_SIZE, message: `Exceeds the total size limit of ${formatBytes(c.maxTotalSize)}` };
    }
    return { ok: true };
  }

  function makeRecord(file, source) {
    return {
      id: `f${++idSequence}`,
      file,
      name: file && file.name != null ? String(file.name) : '',
      // Finite check, not just typeof: a NaN size used to bypass every size rule and
      // permanently poison the maxTotalSize running total. A negative size would do the
      // same (it lowers the running total so later oversized files sail through), so the
      // size is clamped to a non-negative finite number.
      size: file && Number.isFinite(file.size) && file.size >= 0 ? file.size : 0,
      type: file && file.type != null ? String(file.type) : '',
      source,
      status: null,
      reason: null,
      message: null,
      preview: null,
      previewMode: PreviewMode.NONE,
      previewPending: false, // a data-URL read is in flight (preview/previewMode set on onload)
      dedupeKey: dedupeKeyFor(file),
      objectUrl: null, // tracked only for revocation
    };
  }

  /** Snapshot the current accepted tally (and dedupe keys) before a batch. */
  function snapshotTally(batch) {
    const tally = { acceptedInDrop: 0, acceptedTotal: 0, totalSize: 0, seen: new Set(), batch };
    for (const r of records.values()) {
      if (r.status === IntakeStatus.ACCEPTED) {
        tally.acceptedTotal++;
        tally.totalSize += r.size;
        if (config.dedupe) tally.seen.add(r.dedupeKey);
      }
    }
    return tally;
  }

  /**
   * The single funnel for every source. Validate each file against the live rules
   * with a running tally, store per `retainRejected`, generate auto-previews, then
   * emit once. Returns the public view of every processed file (including
   * non-retained rejects, so callers of add() always see the verdicts).
   */
  function intake(files, source) {
    if (destroyed) return [];
    const list = toFileArray(files);
    if (!list.length) return [];
    const tally = snapshotTally(true);
    const out = [];
    let changed = false;
    for (const file of list) {
      const record = makeRecord(file, source);
      const verdict = checkFile(file, record, tally);
      if (verdict.ok) {
        record.status = IntakeStatus.ACCEPTED;
        tally.acceptedInDrop++;
        tally.acceptedTotal++;
        tally.totalSize += record.size;
        if (config.dedupe) tally.seen.add(record.dedupeKey);
        records.set(record.id, record);
        changed = true;
        maybeAutoPreview(record);
      } else {
        record.status = IntakeStatus.REJECTED;
        record.reason = verdict.reason;
        record.message = verdict.message;
        if (config.retainRejected) { records.set(record.id, record); changed = true; }
      }
      out.push(toPublic(record));
    }
    pruneRejected();
    if (changed) notify();
    return out;
  }

  /** Re-run validation over the retained collection in order (used by setOptions). */
  function revalidate() {
    const tally = emptyTally(false);
    const kept = [];
    for (const record of records.values()) {
      record.dedupeKey = dedupeKeyFor(record.file);
      const verdict = checkFile(record.file, record, tally);
      if (verdict.ok) {
        const wasRejected = record.status === IntakeStatus.REJECTED;
        record.status = IntakeStatus.ACCEPTED;
        record.reason = null;
        record.message = null;
        tally.acceptedTotal++;
        tally.totalSize += record.size;
        if (config.dedupe) tally.seen.add(record.dedupeKey);
        kept.push(record);
        // A file flipped to accepted gets its configured auto-preview, exactly as
        // it would have at intake (it used to stay preview-less forever).
        // Skip records whose data-URL read is still in flight: previewMode/preview
        // are only assigned in that read's onload, so this guard would otherwise be
        // true and launch a SECOND concurrent readAsDataURL (double buffering of the
        // whole file + a redundant 'change' emit) for a preview already being produced.
        if (
          !record.previewPending &&
          (wasRejected || record.preview == null) &&
          record.previewMode === PreviewMode.NONE
        ) {
          maybeAutoPreview(record);
        }
      } else {
        record.status = IntakeStatus.REJECTED;
        record.reason = verdict.reason;
        record.message = verdict.message;
        // A rejected record never carries a preview (mirroring intake, where
        // maybeAutoPreview runs only on the accepted path). Drop the preview and
        // revoke its object URL regardless of retainRejected — otherwise a record
        // flipped from accepted keeps a live blob: URL on the rejected record.
        revokePreview(record);
        record.preview = null;
        record.previewMode = PreviewMode.NONE;
        record.previewPending = false; // any in-flight read's onload will bail (status != ACCEPTED)
        if (config.retainRejected) kept.push(record);
      }
    }
    records.clear();
    for (const record of kept) records.set(record.id, record);
  }

  function emptyTally(batch) {
    return { acceptedInDrop: 0, acceptedTotal: 0, totalSize: 0, seen: new Set(), batch };
  }

  // ---- previews + URL revocation ------------------------------------------

  /** Auto-preview an accepted image per the configured mode (no-op otherwise). */
  function maybeAutoPreview(record) {
    if (config.preview === PreviewMode.NONE) return;
    if (!record.type || !record.type.startsWith('image/')) return;
    // Data-URL auto-previews buffer the whole file (as base64, ~1.4x) in memory;
    // a self-declared "image/*" of arbitrary size must not be read automatically.
    if (
      config.preview === PreviewMode.DATA_URL &&
      isActiveLimit(config.previewMaxSize) &&
      record.size > config.previewMaxSize
    ) return;
    generatePreview(record, config.preview);
  }

  /** Produce a preview for one record. Object URLs are tracked for revocation. */
  function generatePreview(record, mode) {
    if (mode === PreviewMode.OBJECT_URL) {
      if (!canObjectURL()) return;
      try {
        if (record.objectUrl) URL.revokeObjectURL(record.objectUrl);
        record.objectUrl = URL.createObjectURL(record.file);
        record.preview = record.objectUrl;
        record.previewMode = PreviewMode.OBJECT_URL;
      } catch { /* createObjectURL unusable — leave preview null */ }
    } else if (mode === PreviewMode.DATA_URL) {
      if (typeof FileReader === 'undefined') return;
      try {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          record.previewPending = false;
          // Bail if the record was dropped OR flipped to rejected while the read was
          // in flight (e.g. setOptions tightened `accept`). A rejected record must
          // never carry a preview — that mirrors intake, where maybeAutoPreview runs
          // only on the accepted path.
          if (destroyed || !records.has(record.id) || record.status !== IntakeStatus.ACCEPTED) return;
          record.preview = typeof fileReader.result === 'string' ? fileReader.result : null;
          record.previewMode = PreviewMode.DATA_URL;
          notify();
        };
        fileReader.onerror = () => { record.previewPending = false; };
        // Mark the read in flight BEFORE issuing it: preview/previewMode are only set
        // in onload, so without this a setOptions()→revalidate() during the read would
        // re-trigger maybeAutoPreview and start a duplicate readAsDataURL of the file.
        record.previewPending = true;
        fileReader.readAsDataURL(record.file);
      } catch { record.previewPending = false; /* FileReader unusable — leave preview null */ }
    }
  }

  /** Revoke a record's object URL if it owns one (idempotent). */
  function revokePreview(record) {
    if (record.objectUrl && canObjectURL()) {
      try { URL.revokeObjectURL(record.objectUrl); } catch { /* already gone */ }
    }
    record.objectUrl = null;
  }

  // ---- state emission -----------------------------------------------------

  function toPublic(record) {
    return {
      id: record.id,
      file: record.file,
      name: record.name,
      size: record.size,
      type: record.type,
      status: record.status,
      accepted: record.status === IntakeStatus.ACCEPTED,
      reason: record.reason,
      message: record.message,
      source: record.source,
      preview: record.preview,
      previewMode: record.previewMode,
    };
  }

  function buildState() {
    const all = [];
    const accepted = [];
    const rejected = [];
    let totalSize = 0;
    for (const record of records.values()) {
      const publicFile = toPublic(record);
      all.push(publicFile);
      if (record.status === IntakeStatus.ACCEPTED) { accepted.push(publicFile); totalSize += record.size; }
      else rejected.push(publicFile);
    }
    return {
      files: all,
      accepted,
      rejected,
      counts: { total: all.length, accepted: accepted.length, rejected: rejected.length },
      totalSize,
      drag: { ...drag },
      config: configSnapshot(),
    };
  }

  function notify() {
    if (destroyed) return;
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }

  // ---- drag-state ----------------------------------------------------------

  const anyZoneDepth = () => attachments.some((zone) => zone.depth > 0);

  /** Update drag-state, emitting only when something actually changed. */
  function setDrag(next) {
    if (drag.isDraggingOver === next.isDraggingOver
      && drag.willAccept === next.willAccept
      && drag.fileCount === next.fileCount) return;
    drag = next;
    notify();
  }

  function clearDrag() {
    setDrag({ isDraggingOver: false, willAccept: null, fileCount: null });
  }

  /** Read the drag payload's peekable types into the over-state (best-effort). */
  function updateDragFromEvent(e) {
    const dataTransfer = e.dataTransfer;
    let fileCount = null;
    let willAccept = null;
    if (dataTransfer) {
      const types = dataTransfer.types ? [...dataTransfer.types] : [];
      const items = dataTransfer.items ? [...dataTransfer.items] : [];
      const fileItems = items.filter((i) => i.kind === 'file');
      const hasFiles = types.includes('Files') || fileItems.length > 0;
      if (fileItems.length) {
        fileCount = fileItems.length;
        const peekTypes = fileItems.map((i) => i.type).filter(Boolean);
        willAccept = peekAcceptability(peekTypes, fileItems.length, config.acceptMatcher);
      } else if (hasFiles) {
        // Mirror peekAcceptability's any-check: an accept-anything zone reports
        // true on both the peekable and hidden-types paths. Only an actual
        // matcher (with concrete rules) is undeterminable from a hidden payload.
        willAccept = (!config.acceptMatcher || config.acceptMatcher.any) ? true : null;
      }
    }
    setDrag({ isDraggingOver: true, willAccept, fileCount });
  }

  // ---- folder traversal (entries API; all browser-only, inside the drop path) --

  function readEntriesAsync(reader) {
    return new Promise((resolve) => {
      reader.readEntries((entries) => resolve(entries || []), () => resolve([]));
    });
  }

  function fileFromEntry(entry) {
    return new Promise((resolve) => {
      entry.file((file) => resolve(file), () => resolve(null));
    });
  }

  // The budget bounds BOTH the number of File objects materialized (walk.out)
  // AND the number of directory entries traversed (walk.visited). Counting only
  // materialized files leaves a sparse-but-huge tree — e.g. thousands of nested
  // empty subdirectories — to recurse and issue a readEntries call per directory
  // unbounded, since out.length never reaches the cap. Charging every visited
  // entry against the same budget stops that walk too.
  function walkBudgetReached(walk) {
    return walk.out.length >= walk.budget || walk.visited >= walk.budget;
  }

  async function walkDirectory(dirEntry, walk) {
    const reader = dirEntry.createReader();
    // readEntries returns at most ~100 entries per call — loop until it's empty.
    for (;;) {
      if (walkBudgetReached(walk)) return; // traversal budget reached — stop walking
      const batch = await readEntriesAsync(reader);
      if (!batch.length) break;
      for (const entry of batch) {
        walk.visited++; // charge every directory entry seen against the budget
        if (walkBudgetReached(walk)) return;
        if (entry.isFile) { const file = await fileFromEntry(entry); if (file) walk.out.push(file); }
        else if (entry.isDirectory) await walkDirectory(entry, walk);
      }
    }
  }

  /**
   * Pull File objects out of a DataTransfer. All synchronous DataTransfer reads
   * (items, getAsEntry, getAsFile, .files) happen BEFORE any await — the
   * DataTransferItemList is emptied once the event handler yields, so entries must
   * be captured up front; the async tree-walk then uses the captured entries.
   */
  async function extractFiles(dataTransfer) {
    const plainFiles = dataTransfer.files ? [...dataTransfer.files] : [];
    const items = dataTransfer.items ? [...dataTransfer.items] : [];
    const entries = [];
    const directFiles = [];
    let usedItems = false;

    if (config.directory && items.length && typeof items[0].webkitGetAsEntry === 'function') {
      for (const item of items) {
        if (item.kind !== 'file') continue;
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) { entries.push(entry); usedItems = true; }
        else if (item.getAsFile) { const file = item.getAsFile(); if (file) directFiles.push(file); }
      }
    }

    // No traversal (disabled or unsupported): the flat .files list already
    // excludes directories in practice — folders dropped with `directory:false`
    // are simply ignored.
    if (!usedItems) return plainFiles;

    // The traversal budget keeps a huge dropped tree from materializing unbounded
    // File objects AND from issuing unbounded readEntries calls (a sparse/empty
    // tree that never materializes a file would otherwise escape the file cap).
    const budget = isActiveLimit(config.maxTraversal) ? config.maxTraversal : Infinity;
    const walk = { out: [...directFiles], visited: 0, budget };
    for (const entry of entries) {
      walk.visited++; // top-level dropped entries count toward the budget too
      if (walkBudgetReached(walk)) break;
      if (entry.isFile) { const file = await fileFromEntry(entry); if (file) walk.out.push(file); }
      else if (entry.isDirectory) await walkDirectory(entry, walk);
    }
    return walk.out;
  }

  // ---- attach / detach (drag + paste listeners) ---------------------------

  // One native drop event reaches EVERY attached zone it bubbles through (a child
  // zone inside a parent zone), and used to be ingested once per zone. Each event
  // is processed exactly once.
  const processedDropEvents = new WeakSet();

  async function handleDrop(e, attachment) {
    e.preventDefault();          // stop the browser from navigating to / opening the file
    attachment.depth = 0;               // a drop ends the drag with no trailing dragleave
    clearDrag();
    if (processedDropEvents.has(e)) return;
    processedDropEvents.add(e);
    const dataTransfer = e.dataTransfer;
    if (!dataTransfer) return;
    let files;
    try { files = await extractFiles(dataTransfer); } catch { files = dataTransfer.files ? [...dataTransfer.files] : []; }
    if (destroyed) return;       // torn down mid-traversal — bail without touching state
    if (files && files.length) intake(files, Source.DROP);
  }

  /**
   * Wire native drag/drop (and optional paste) listeners to a consumer element,
   * `document`, or `window`. Idempotent per target; safe to attach several zones.
   * @param {EventTarget} target
   */
  function attach(target) {
    if (destroyed || !target || typeof target.addEventListener !== 'function') return instance;
    if (attachments.some((zone) => zone.target === target)) return instance; // already attached

    const attachment = { target, depth: 0, remove: null };

    // The flicker fix: dragenter/dragleave fire on CHILDREN too, so a naive
    // boolean flickers as the pointer crosses inner elements. A depth counter
    // stays > 0 for the whole time the pointer is anywhere inside the zone
    // (entering a child bumps it before the parent's leave drops it).
    const handleDragEnter = (e) => { e.preventDefault(); attachment.depth++; updateDragFromEvent(e); };
    const handleDragOver = (e) => {
      e.preventDefault(); // REQUIRED — without it `drop` never fires and the browser opens the file
      if (e.dataTransfer) { try { e.dataTransfer.dropEffect = 'copy'; } catch { /* read-only in some browsers */ } }
      updateDragFromEvent(e);
    };
    const handleDragLeave = () => { attachment.depth = Math.max(0, attachment.depth - 1); if (!anyZoneDepth()) clearDrag(); };
    const handleDropListener = (e) => { handleDrop(e, attachment); };

    target.addEventListener('dragenter', handleDragEnter);
    target.addEventListener('dragover', handleDragOver);
    target.addEventListener('dragleave', handleDragLeave);
    target.addEventListener('drop', handleDropListener);
    attachment.remove = () => {
      target.removeEventListener('dragenter', handleDragEnter);
      target.removeEventListener('dragover', handleDragOver);
      target.removeEventListener('dragleave', handleDragLeave);
      target.removeEventListener('drop', handleDropListener);
    };

    attachments.push(attachment);
    wireUpPaste(target);
    return instance;
  }

  /** Detach one target (or all when called with no argument). */
  function detach(target) {
    if (target) {
      const i = attachments.findIndex((zone) => zone.target === target);
      if (i >= 0) {
        // Did the detached target own the document the paste listener is bound to?
        // (It owns it when it IS that document/window, or its ownerDocument is it.)
        const ownedPaste = pasteDocument != null
          && (target === pasteDocument || (target && target.ownerDocument) === pasteDocument);
        attachments[i].remove();
        attachments.splice(i, 1);
        // If the paste-owner left while other zones remain (possibly in another
        // document), re-home the listener onto a survivor — otherwise it stays
        // bound to the detached document and paste goes dead on the live zones.
        if (ownedPaste && config.paste && attachments.length) {
          removePasteListener();
          wireUpPaste(attachments[0].target);
        }
      }
    } else {
      for (const zone of attachments) zone.remove();
      attachments.length = 0;
    }
    if (!attachments.length) removePasteListener();
    if (!anyZoneDepth()) clearDrag();
    return instance;
  }

  // ---- paste (clipboard) --------------------------------------------------
  // One paste listener per instance, on the owner document of the first attached
  // element (or the element itself when it is document/window). A dropzone div
  // rarely holds focus, so document-scoped paste is what "Cmd+V an image" needs.

  function wireUpPaste(target) {
    if (!config.paste || pasteHandler) return;
    const doc = isDocOrWindow(target)
      ? target
      : (target && target.ownerDocument) || (hasDocument() ? document : null);
    if (!doc || typeof doc.addEventListener !== 'function') return;
    pasteHandler = (e) => handlePaste(e);
    doc.addEventListener('paste', pasteHandler);
    pasteDocument = doc;
  }

  function removePasteListener() {
    if (pasteHandler && pasteDocument) pasteDocument.removeEventListener('paste', pasteHandler);
    pasteHandler = null;
    pasteDocument = null;
  }

  function handlePaste(e) {
    if (destroyed || !config.paste) return; // paste may have been disabled via setOptions
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;
    const files = [];
    const items = clipboardData.items ? [...clipboardData.items] : [];
    for (const item of items) {
      if (item.kind === 'file' && item.getAsFile) { const file = item.getAsFile(); if (file) files.push(file); }
    }
    if (!files.length && clipboardData.files && clipboardData.files.length) for (const f of clipboardData.files) files.push(f);
    if (files.length) intake(files, Source.PASTE);
  }

  // ---- picker (hidden <input type=file>) ----------------------------------

  function handlePickerChange() {
    if (!pickerInput) return;
    const files = pickerInput.files ? [...pickerInput.files] : [];
    pickerInput.value = ''; // reset so re-choosing the same file fires change again
    if (files.length) intake(files, Source.PICKER);
  }

  function ensurePickerInput() {
    if (!hasDocument()) return null;
    if (!pickerInput) {
      pickerInput = document.createElement('input');
      pickerInput.type = 'file';
      pickerInput.style.display = 'none';
      pickerInput.addEventListener('change', handlePickerChange);
      (document.body || document.documentElement).appendChild(pickerInput);
    }
    return pickerInput;
  }

  /**
   * Open the OS file-picker. The engine owns the hidden input (honoring accept /
   * multiple / directory); the consumer renders its own button and calls this.
   * @param {Object} [opts]
   * @param {boolean} [opts.directory]  open a folder picker (webkitdirectory)
   * @param {boolean} [opts.multiple]   override config.multiple
   * @param {string|string[]} [opts.accept]  override config.accept
   */
  function openPicker(opts = {}) {
    if (destroyed) return instance; // a dead instance must not resurrect the hidden input
    const input = ensurePickerInput();
    if (!input) return instance; // SSR / no document — no-op
    const multiple = opts.multiple != null ? opts.multiple : config.multiple;
    const accept = opts.accept != null ? acceptToAttribute(opts.accept) : config.acceptAttribute;
    const directory = opts.directory != null ? !!opts.directory : config.directory;
    if (accept) input.setAttribute('accept', accept); else input.removeAttribute('accept');
    if (multiple) input.setAttribute('multiple', ''); else input.removeAttribute('multiple');
    if (directory) { input.setAttribute('webkitdirectory', ''); input.setAttribute('directory', ''); }
    else { input.removeAttribute('webkitdirectory'); input.removeAttribute('directory'); }
    input.click();
    return instance;
  }

  // ---- collection management ----------------------------------------------

  /** Funnel files in programmatically, validated exactly as a drop. */
  function add(files) { return intake(files, Source.ADD); }

  /** Remove one item by id (revoking its preview URL). */
  function remove(id) {
    const record = records.get(String(id));
    if (!record) return false;
    revokePreview(record);
    records.delete(record.id);
    notify();
    return true;
  }

  /** Remove every item (revoking all preview URLs). Drag-state is untouched. */
  function clear() {
    if (!records.size) return instance;
    for (const record of records.values()) revokePreview(record);
    records.clear();
    notify();
    return instance;
  }

  /**
   * Change the rules at runtime. The patch is merged over the original options,
   * the config is rebuilt, and the EXISTING collection is RE-VALIDATED against the
   * new rules (a file can flip accepted⇄rejected). Going-forward intake uses the
   * new rules too. (On a bulk re-validate, maxPerDrop does not apply — there is no
   * "drop"; the collection is one pass governed by maxFiles/maxTotalSize.)
   */
  function setOptions(patch = {}) {
    if (destroyed) return instance;
    rawOptions = { ...rawOptions, ...patch };
    config = buildConfig(rawOptions);
    // Mirror the constructor: an explicit onChange key resolves the same way
    // (function ⇒ set, anything else ⇒ null), so setOptions can CLEAR the callback
    // (e.g. onChange: null), not only replace it.
    if ('onChange' in patch) onChange = typeof patch.onChange === 'function' ? patch.onChange : null;
    // Re-sync the paste listener with the new config (toggling it at runtime used
    // to be broken in both directions: never wired on, never removed when off).
    if (!config.paste) removePasteListener();
    else if (!pasteHandler && attachments.length) wireUpPaste(attachments[0].target);
    revalidate();
    pruneRejected();
    notify();
    return instance;
  }

  // ---- reads (convenience for consumers that need bytes/previews) ---------

  /**
   * Generate (or regenerate) a preview for one file on demand.
   * @param {string} id
   * @param {string} [mode]  a PreviewMode; defaults to config.preview, else object URL
   * @returns {Promise<?string>} the preview URL/dataURL (null if unavailable)
   */
  function readPreview(id, mode) {
    const record = records.get(String(id));
    if (!record) return Promise.resolve(null);
    // Normalize the explicit mode through the same aliases the `preview` option
    // accepts ('url', 'base64', true, ...) — they used to silently resolve to null.
    const m = mode != null
      ? normalizePreview(mode)
      : (config.preview !== PreviewMode.NONE ? config.preview : PreviewMode.OBJECT_URL);
    if (m === PreviewMode.OBJECT_URL) {
      // Mirror the DATA_URL branch (and maybeAutoPreview): a rejected record must
      // never carry a preview, so don't mint an object URL onto one.
      if (record.status === IntakeStatus.ACCEPTED) {
        generatePreview(record, m);
        if (record.preview) notify();
      }
      return Promise.resolve(record.preview);
    }
    if (m === PreviewMode.DATA_URL) {
      return new Promise((resolve) => {
        if (typeof FileReader === 'undefined') return resolve(null);
        const fileReader = new FileReader();
        fileReader.onload = () => {
          // Mirror generatePreview()'s data-URL onload guard: bail if the record was
          // dropped OR flipped to rejected while the read was in flight. A rejected
          // record must never carry a preview.
          if (!destroyed && records.has(record.id) && record.status === IntakeStatus.ACCEPTED) {
            record.preview = typeof fileReader.result === 'string' ? fileReader.result : null;
            record.previewMode = PreviewMode.DATA_URL;
            notify();
          }
          resolve(record.preview);
        };
        fileReader.onerror = () => resolve(null);
        try { fileReader.readAsDataURL(record.file); } catch { resolve(null); }
      });
    }
    return Promise.resolve(null);
  }

  /**
   * Read a file's bytes for the consumer. Prefers the native Blob methods
   * (file.text/arrayBuffer), falling back to FileReader; dataURL uses FileReader.
   * @param {string} id
   * @param {('text'|'arrayBuffer'|'dataURL')} [as='text']
   * @returns {Promise<*>}
   */
  function readFile(id, as = 'text') {
    // A genuinely unknown format is a programming error — throw like the sibling
    // enums (normalizePreview) rather than silently decoding as text.
    if (as !== 'text' && as !== 'arrayBuffer' && as !== 'dataURL') {
      throw new TypeError(`drag-n-drop: unknown read format ${JSON.stringify(as)}`);
    }
    const record = records.get(String(id));
    if (!record || !record.file) return Promise.resolve(null);
    const file = record.file;
    if (as === 'text' && typeof file.text === 'function') return file.text();
    if (as === 'arrayBuffer' && typeof file.arrayBuffer === 'function') return file.arrayBuffer();
    if (typeof FileReader === 'undefined') return Promise.resolve(null);
    return new Promise((resolve) => {
      const fileReader = new FileReader();
      fileReader.onload = () => resolve(fileReader.result);
      fileReader.onerror = () => resolve(null);
      try {
        if (as === 'dataURL') fileReader.readAsDataURL(file);
        else if (as === 'arrayBuffer') fileReader.readAsArrayBuffer(file);
        else fileReader.readAsText(file);
      } catch { resolve(null); }
    });
  }

  // ---- state read / subscription ------------------------------------------

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }

  function getState() {
    return buildState();
  }

  // ---- lifecycle -----------------------------------------------------------

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const zone of attachments) zone.remove();
    attachments.length = 0;
    removePasteListener();
    for (const record of records.values()) revokePreview(record);
    records.clear();
    if (pickerInput) {
      pickerInput.removeEventListener('change', handlePickerChange);
      if (pickerInput.parentNode) pickerInput.parentNode.removeChild(pickerInput);
      pickerInput = null;
    }
    emitter.clear();
  }

  const instance = {
    attach,
    detach,
    openPicker,
    add,
    remove,
    clear,
    setOptions,
    readPreview,
    readFile,
    subscribe,
    getState,
    destroy,
  };

  // Emit the initial state once after construction — deferred a microtask so a
  // synchronous subscribe() right after creation still receives it (as the other
  // engines do).
  queueMicrotask(() => { if (!destroyed) notify(); });

  return instance;
}
