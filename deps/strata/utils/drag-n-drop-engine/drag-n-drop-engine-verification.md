# drag-n-drop-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an
option, touching the validation order, the intake state model, dedup, folder
traversal, the drag-state machine, previews/URL revocation, or the picker/paste
wiring. It is the definition of "still working."

It mirrors the other engines' suites (`toast-engine`, `image-cropper-engine`,
`media-engine`): layered gates, run in order. A failure at an earlier gate makes the
later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The
  pure logic — validation (type/size/count/custom), accepted/rejected partitioning,
  dedup, collection management, runtime re-validation, state emission — is driven
  through the same `intake` funnel via `add()` using minimal File-like stand-ins, so
  there is no DOM and no flakiness. Run on every change; if red, stop and fix first.
- **Gate 2 — Browser verification protocol.** The DOM behaviors `node` can't reach:
  the native drag/drop/paste/picker wiring, the `dragenter`/`dragleave` flicker fix,
  `preventDefault` (the browser must not open the dropped file), pre-drop type
  peeking, real object-URL previews and their revocation, and recursive folder
  traversal via the entries API. Run after meaningful changes.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no DOM and no CSS,
  that the demo's dropzone + grid + previews are entirely consumer-rendered, that no
  upload/transport exists, and that swapping the rendering needs no engine change.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs` from
the repository root, then open `http://localhost:8788/demo/drag-n-drop-engine.html`.
ES-module imports are blocked over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Intake only — no transport.** The engine receives `File` objects from drop /
   paste / picker, validates them, optionally reads previews, and emits the result.
   It NEVER uploads, chunks, retries, shows real-upload progress, or talks to a
   server. There is no `fetch`/`XHR`/networking anywhere in it. Uploading the emitted
   `File`s is the consumer's job.
2. **Headless.** The engine creates no drop-zone DOM and ships no CSS. It manages
   intake state — the accepted files, rejected files with reasons, drag-over state,
   counts — and emits it via `getState()` + `subscribe()`/`onChange`. The consumer
   renders the drop zone, the highlight, the file grid, the thumbnails, the buttons,
   and all styling. There is no built-in dropzone component, no default look.
3. **State out, paint in.** Everything visual is emitted state (`files`, `accepted`,
   `rejected` with `reason`/`message`, `counts`, `totalSize`, and `drag`:
   `isDraggingOver`/`willAccept`/`fileCount`). The engine never touches the zone's DOM
   except to attach/detach native listeners on the element it is handed.
4. **Element by reference.** The consumer creates the element (a div, a section,
   `document`, or `window` for full-page drop) and hands the *object* to `attach()`.
   No selector strings, no `querySelector`. `detach()`/`destroy()` remove every
   listener; safe to attach several zones.
5. **Pure, DOM-optional core.** Constructing an instance, configuring rules, and
   running validation through `add()` must not throw with no `document` (SSR/Node).
   Every browser API — drag events, `DataTransfer`, the File API,
   `URL.createObjectURL`/`FileReader`, the `<input type=file>` picker, clipboard
   paste, the entries API — is touched only inside method bodies behind capability
   checks, never at module scope.
6. **Validation is consumer-configured, engine-applied.** Accept (MIME, `image/*`,
   extension, mixed), max/min size, max files, max-per-drop, max total size, a custom
   predicate, and dedup — each incoming file is tagged accepted or rejected with a
   stable `reason` code and a human `message`. First failure wins.
7. **The flicker fix is correct.** `dragenter`/`dragleave` fire on child elements
   too; a depth counter keeps `isDraggingOver` stable while the pointer moves within
   the zone, and `drop` resets it. No flicker.
8. **Object URLs never leak.** Every `createObjectURL` is tracked and revoked on
   `remove`/`clear`/`destroy`. A leak here is a real memory bug.
9. **Dependency-free.** Zero runtime dependencies beyond the in-repo `shared/` helpers.
   This file imports only `Emitter` from `../shared/emitter.js`. It does **not** use
   `shared/gestures.js` — file intake rides native file-drop events, not pointer-drag
   recognition.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/drag-n-drop-engine/drag-n-drop-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **43**).

The suite (`tests/drag-n-drop-engine/drag-n-drop-engine.test.mjs`, harness in
`tests/drag-n-drop-engine/harness.mjs`) constructs File-like stand-ins
(`{ name, size, type }` — exactly the shape the engine reads) and funnels them
through `add()`, the same path drop/paste/picker use. Coverage maps directly to the
invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createDropZone()` constructs and validates with no `document`; `getState()` is valid synchronously. |
| Import boundary | The engine source imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| DOM-guard discipline | Every module-scope reference to a DOM global (`document`/`window`/`FileReader`/`FileList`/`createObjectURL`) is `typeof`-guarded — no bare access that would throw at load. |
| Type matching | Exact MIME, `image/*` wildcard, extension (case-insensitive, ignores MIME), mixed lists; unknown/empty MIME accepted only via an extension rule or `*`; no rule ⇒ accept all. |
| Size | `maxSize`/`minSize` with inclusive boundaries; zero-byte file accepted when no size rule applies. |
| Count / total caps | `maxFiles` bounds the **collection** across separate adds; `maxPerDrop` bounds one **batch** and resets next batch; `maxTotalSize` rejects the file that would push the sum over. Each emits the right `reason`. |
| Custom validator | `true` accepts; a returned string rejects `CUSTOM` with that string as `message`; a non-string falsey return gets a default message; a thrown error is a rejection (never crashes intake). |
| Partitioning | `accepted`/`rejected`/`files` split, `counts`, `totalSize` (accepted only), and the `source` tag are correct; intake order is preserved. |
| retainRejected | Default `true` keeps rejects (with reason) in state; `false` drops them from state while `add()` still returns every verdict. |
| Dedup | `name+size` (and a custom keyFn) reject a repeat as `DUPLICATE`; different size is not a dup; disabled (default) allows repeats; the seen-set is recomputed from the live collection so re-adding after `remove` works. |
| Collection mgmt | `remove(id)` deletes the right item (incl. a retained reject) and updates counts; `remove(unknown)` is `false`; `clear()` empties. |
| Runtime config | `setOptions` re-validates the existing collection (a file flips accepted⇄rejected; `reason` is cleared on re-acceptance) and applies to subsequent intake; `multiple:false` defaults the cap to 1. |
| State emission | `subscribe` fires on change with the new state (the `File` rides through); `unsubscribe` stops it; `onChange` called on every change; the initial emit is deferred a microtask so a synchronous subscriber still receives it; a no-op batch emits nothing. |
| Lifecycle | `destroy()` makes the instance inert (post-destroy commands are safe no-ops) and is idempotent; `detach()`/`attach(null)` are safe with no DOM. |

**Also confirm nothing else regressed** (each prints its own pass line):
`node tests/toast-engine/toast-engine.test.mjs` (39),
`node tests/color-engine/color-engine.test.mjs` (44),
`node tests/image-cropper-engine/image-cropper-engine.test.mjs` (42),
`node tests/datetime-engine/datetime-engine.test.mjs` (60),
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21),
`node tests/media-engine/run-all.mjs` (68).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/drag-n-drop-engine.html`. The demo
(`demo/drag-n-drop-engine.js`) is a reference **consumer**: it renders the dropzone,
the thumbnail grid, the rejected list and every control from the engine's emitted
state and owns all markup, CSS and DOM events.

Each check below was confirmed in a real browser session against this build by
dispatching genuine `DragEvent`/`ClipboardEvent`/`change` events carrying real `File`
and `DataTransfer` objects (and, for folders, a mock of the entries API that drives
the engine's real recursion).

1. **Drag-over state with no flicker.** `dragenter` sets `isDraggingOver` (the zone
   gains its `over` class). Entering a child (a second `dragenter`) keeps it; the
   first `dragleave` (leaving the child) **keeps it true** — *no flicker*; the final
   `dragleave` clears it. Verified sequence: `false → true → true → true → false`.
   The fix is a per-zone depth counter, not a naive boolean.
2. **`preventDefault` — the browser does not open the file.** `dragenter`,
   `dragover`, and `drop` all report `defaultPrevented: true`. Without the `dragover`
   prevent, `drop` never fires; without the `drop` prevent, the browser navigates to
   / opens the dropped image. Both are prevented.
3. **Pre-drop type peek (best-effort).** Dragging two images with `accept: image/*`
   emits `willAccept: true, fileCount: 2`; dragging a `text/plain` file emits
   `willAccept: false` and the demo tints the zone red (`data-willaccept="no"`). When
   the browser hides types (or only extension rules apply), `willAccept` is `null`.
4. **Drop adds files; multiple in one drop.** Dropping four images at once adds all
   four to the grid; `drag.isDraggingOver` is cleared by the drop.
5. **Rejected files show their reason.** Dropping a `text/plain` file (wrong type)
   and a 7 MB image (over the 5 MB `maxSize`) renders two rejected rows —
   *"wrong type — File type "text/plain" is not accepted"* and *"too large — File is
   larger than the 5.0 MB limit (7.0 MB)"* — branching on the stable `reason` code and
   displaying the engine's `message`.
6. **Image previews render and object URLs are revoked.** Accepted images get a
   `blob:` object URL the consumer renders in an `<img>`. Wrapping
   `URL.createObjectURL`/`revokeObjectURL` showed **2 created** on a 2-image drop, **1
   revoked** on `remove(id)`, and the **remaining revoked** on `clear()` — no leak.
7. **Browse button opens the picker; chosen files funnel in.** `openPicker()` creates
   a hidden `<input type=file>` honoring `accept="image/*"` and `multiple`; a `change`
   with selected files funnels them in with `source: 'picker'`.
8. **Paste an image adds it.** A `paste` event whose `clipboardData` carries an image
   file adds it with `source: 'paste'` (document-scoped, so a focusless dropzone still
   catches `Cmd/Ctrl+V`); non-file clipboard items are ignored.
9. **Folder drop traverses (incl. nesting).** A dropped directory (entries API) is
   walked recursively — a folder containing two files and a subfolder with one file
   yields all three. `readEntries` is looped until empty (its ~100-entry batching is
   handled). Controlled by the `directory` option.
10. **Remove + clear work; runtime re-validation via the UI.** Per-file ✕ removes one
    (revoking its URL); "Clear all" empties. Switching the demo's **Accept** select to
    "Anything" calls `setOptions` and an existing rejected `.txt` flips to accepted
    live.
11. **No upload happens.** The "Upload (app's job)" button only `console.log`s the
    ready files and updates a note; no network request is made by the engine or demo.
12. **No console errors** at any point in the session.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing and uploads nothing. These checks
confirm the boundary holds.

1. **No DOM, no CSS, no transport in the engine.** `drag-n-drop-engine.js` contains no
   stylesheet, no markup, and no default dropzone component. It makes **no network
   call** — there is no `XMLHttpRequest`/`WebSocket`, and the only `fetch` token in the
   file is a comment describing the *consumer's* upload flow. The only DOM element it
   ever creates is the hidden `<input type=file>` the picker drives. Its other DOM/File-API references
   (`addEventListener`, `DataTransfer`, `URL.createObjectURL`, `FileReader`,
   `document.createElement('input')`, the entries API) live inside methods behind
   `typeof` capability checks; the clean Node import (Gate 1) proves none of it runs
   at module scope.
2. **The demo's dropzone UI is entirely consumer-rendered.** The drop zone element,
   its drag-over glow, the thumbnail grid, the rejected list, the browse/clear/upload
   buttons, the stats line — every element, class, color and layout lives in
   `demo/drag-n-drop-engine.html` / `demo/drag-n-drop-engine.js`. Delete the demo and
   the engine is unchanged and still fully tested by Gate 1.
3. **Swapping the rendering needs no engine change.** The consumer reads only emitted
   values — `files`/`accepted`/`rejected` (each with `id`, `name`, `size`, `type`,
   `status`, `reason`, `message`, `source`, `preview`), `counts`, `totalSize`, and
   `drag`. A completely different renderer (different markup, a React/Vue/Svelte
   binding, or none) consumes the same state with zero edits to the engine. The
   element-by-reference handoff and state-out subscription are the only seam.
4. **Uploading is the app's job.** The engine emits the raw `File` objects; the demo's
   "Upload" button proves the consumer — not the engine — owns transport. Removing the
   button changes nothing about intake.

---

## 5. Known scope boundaries (by design)

- **No upload / transport / networking.** No `fetch`/XHR, no progress-for-real-upload,
  no retry, no chunking, no server awareness. The engine intakes and emits; sending is
  the consumer's. (A generic upload-POST helper, if ever wanted, is a separate optional
  file — never part of this engine.)
- **No UI / dropzone component / CSS.** Headless; the engine renders nothing. The
  polished dropzone is the consumer's.
- **No progress bars tied to a real upload** — there is no upload here to show progress
  for.
- **No image processing / cropping / resizing** — that is `image-cropper-engine` or the
  consumer. This engine may *read* an image for a preview; it never transforms it.
- **No pointer-drag recognition** — it does not use `shared/gestures.js`. File intake is
  native HTML5 file-drop + the File API, not pointer gestures (that is the sortable
  engine's domain).
- **No framework or host coupling** — vanilla, element-by-reference, state-out; no
  stores, services, routing, or design tokens.
- **Pre-drop peeking is best-effort** — browsers limit what is visible during a drag
  (often MIME types, never names/sizes), so `willAccept` is `null` when undeterminable.
- **`directory:false` + a dropped folder** — folders are ignored (a flat `.files` drop
  excludes directory contents); turn `directory` on to traverse.
