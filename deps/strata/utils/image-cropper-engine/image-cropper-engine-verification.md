# image-cropper-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — touching
the crop-region sizing, the coverage constraint, the output-geometry math, the
shape/ratio handling, the transform/gesture wiring, the output-dimension math, or
the export helper. It is the definition of "still working."

It mirrors `media-engine`, `virtualization-engine`, `toast-engine`,
`datetime-engine` and `color-engine`'s suites: layered gates, run in order. A
failure at an earlier gate makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser, no
  canvas. The whole point of this engine is *provably correct geometry*, so the
  tests assert against **hand-computed source-pixel rectangles** for known framings
  (not just self-consistency), and prove the **coverage invariant** can't be
  violated by any pan/zoom/rotation in range. No clock, no randomness, no DOM —
  every assertion is exact. Run on every change; if red, stop and fix first.
- **Gate 2 — Browser verification protocol.** The interactive surface `node` can't
  reach: drag/pinch/wheel framing (bounded so the crop stays covered), ratio/shape
  switching, the circular mask, rotate/flip with correct re-clamp, and — the
  headline — **the export actually producing a correctly-cropped, correctly-
  oriented, correctly-sized output image**. The export helper (the only canvas
  code) is browser-verified here, not in Gate 1.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no CSS, the demo's
  chrome is entirely consumer-rendered, the pure core is canvas/DOM-free (the export
  helper is the only canvas, isolated in its own file), and the core imports only
  from `shared/`.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs`
from the repository root, then open
`http://localhost:8788/demo/image-cropper-engine.html`. ES-module imports are blocked over
`file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Headless.** The engine creates no chrome DOM and ships no CSS. It owns the
   crop/transform geometry and emits state via `getState()` + `subscribe()`/
   `onChange`; the consumer renders the image, the crop frame, the handles, the
   shape mask, the dimmed exterior and every button. The only DOM it ever touches is
   the image element it is handed (read natural size; optionally write the preview
   transform) and the optional ResizeObserver/gesture conveniences — all confined to
   method bodies, never module scope.
2. **Reuse `shared/`, don't reinvent.** Pan/zoom/rotate/flip + bounds math is
   `transform2d`; pinch/wheel/drag recognition is `gestures`. The cropper consumes
   them and adds only the crop-region model, the coverage constraint, shape/ratio
   handling, output-geometry math, and the export. It imports `createTransform`,
   `createGestureRecognizer`, `Emitter`, `clamp` and `FitMode` from `shared/` — and
   nothing else.
3. **The coverage invariant is inherited, not re-derived.** The image must always
   fully cover the crop region — pan and zoom can never frame empty space. This is
   achieved by handing transform2d the **crop window as its viewport** in
   `FitMode.FILL`: its `minScale` becomes the cover scale (the coverage floor) and
   its pan bounds keep the crop inside the image. Rotation swaps the image's
   effective dimensions and re-clamps. The invariant holds across pan, zoom, and
   after every 90° rotation.
4. **Min-zoom = coverage.** The minimum allowed zoom is exactly the scale at which
   the image just covers the crop — including the image-smaller-than-crop case,
   where the cover scale is `> 1` (the source upscales, and the engine flags it).
5. **Output geometry is the deliverable, and it's exact.** Given the current crop +
   transform, the engine emits the **source-pixel rectangle in the original,
   untransformed image's coordinate space** plus the orientation (rotation/flip) and
   the final output dimensions. Because rotation is locked to 0/90/180/270, the crop
   maps to an axis-aligned rectangle in image space, so the rect is exact, not
   approximate. A consumer can take these numbers to its own canvas or a server.
6. **Output aspect = crop aspect; sizing is honest.** The output's aspect ratio
   always equals the crop's (every quarter turn). The default output size is the
   framed source rect's own resolution (the most pixels available without
   enlarging); a target width/height and a max-dimension cap override it; enlarging
   beyond the source is reported as `upscale: true`, never silently.
7. **Shape is a flag, not pixel math.** The crop math is always the bounding
   rectangle. `SQUARE`/`CIRCLE` only constrain the aspect to 1:1; `CIRCLE`
   additionally sets `round` so the consumer renders a circular mask. The engine
   does no non-rectangular pixel cropping.
8. **State out, paint in, deferred initial emit.** Changing ratio/shape, rotating,
   flipping, zooming, panning or resizing the container all re-clamp and emit a new
   snapshot. The initial snapshot is emitted one microtask after construction (so a
   synchronous `subscribe()` still receives it), and `getState()` is valid
   synchronously before then.
9. **Edge cases don't explode.** No image or no container → `ready:false`, `output:
   null`, finite `previewMatrix`, no throw. Low-res source → coverage still holds,
   output upscales, flagged. Ratio/viewport change while zoomed → re-clamp, framing
   preserved as far as possible. Slow/failed load → `loading`/`error` emitted, never
   a hard fail.
10. **Canvas is isolated and optional.** The pure core (`image-cropper-engine.js`) never
    imports canvas code. The single canvas draw lives in `image-cropper-engine-export.js`,
    which depends on nothing (not even `shared/`); the geometry path works without it.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/image-cropper-engine/image-cropper-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **42**).

The suite (`tests/image-cropper-engine/image-cropper-engine.test.mjs`, harness in
`tests/image-cropper-engine/harness.mjs`) is fully deterministic — no clock, no randomness,
no DOM, no canvas. Coverage maps directly to the invariants:

| Area | What it pins |
| --- | --- |
| **Crop-region sizing** | Given a container + ratio, the crop box has the right dimensions and is centered: square fills a square container; 16:9 is width-bound in a 1000² container (1000×562.5, y 218.75) and exact in 1600×900; 3:2 is width-bound in a tall container; `free` fills the inset container and reports `aspect:null`. |
| **Min-zoom = cover** | `minScale` equals `max(cropW/effW, cropH/effH)` — 0.5 for a square image/crop, 0.5 for a landscape image in a square crop, **5** for a 100² image in a 500² crop (upscales to cover), and the exact cover for a non-square crop. Default framing sits exactly on the floor (`ratio` 1). |
| **Output geometry (exact)** | Hand-computed source rects: centered cover framing of a square image → the **whole image**; zoomed to native → the **centered 500²**; pan the image right by 100 → source rect shifts left to `x:150`; a landscape image in a square crop at cover → the centered `500,0,1000,1000` strip. |
| **Coverage invariant** | Across six image/crop/ratio cases × four rotations × four scales (min → max) × five pan extremes (incl. ±10⁶), all four crop corners map **inside** `[0,natW]×[0,natH]` — coverage can't be violated by any pan/zoom in range. A separate test confirms pan **clamps** to the exact bound (`750,250`) instead of running off. |
| **Rotation recompute** | After 90°, coverage holds, the source rect is correct and `rotation:90` is flagged; for a non-square crop the source rect **swaps** to keep the output at the crop aspect; output aspect equals the crop aspect at **every** quarter turn; rotation wraps 0→90→180→270→0. |
| **Flip** | `flippedHorizontally`/`flippedVertically` set the correct output flags and leave the (center-symmetric) source rect put — the mirror is applied at export, not double-counted; flags toggle off again. |
| **Output-dimension math** | Default = the framed source rect's resolution (no upscale); a target width drives a proportional height; a max-dimension cap downsizes a 4000² source to 512²; a 100² source asked for 512 is flagged `upscale:true`; pinning both width and height is honored exactly; `setOutput` updates live. |
| **Shape** | `CIRCLE` forces a 1:1 crop and sets `round:true` with crop math **identical** to `SQUARE` (only the flag differs); `SQUARE` in a wide container is the min dimension, centered; switching to circle reshapes a non-square crop and re-covers. |
| **Ratio / viewport re-clamp** | Changing the aspect while zoomed re-clamps the scale to the new cover floor and keeps coverage valid; shrinking the container recomputes the crop and re-covers; growing it keeps the crop covered. |
| **previewMatrix** | The container-space matrix equals the crop-local matrix shifted by the crop origin — the image point under the crop's top-left maps back to the crop's container position. |
| **Guards / lifecycle** | Not ready before image **and** container (output `null`, finite matrix, ops don't throw); ready once both are set; `getState()` valid synchronously after construction; `subscribe()` receives the deferred initial snapshot; `reset()` returns to centered cover framing. |
| **Headless boundary** | The static `import` runs clean in Node (proving DOM/canvas-free module scope); a comment-stripped source scan asserts **no** `canvas`/`getContext`/`document`/`OffscreenCanvas`; the source's `from` specifiers are **all** under `../shared/` and never the export helper. |

**Determinism is part of the gate.** There is no `Date`, `Math.random`, timezone or
locale anywhere in the engine, so the suite's result does not depend on the machine
or the clock. A drift in a "hand-computed rect" test means the geometry changed —
that is the bug, not the test.

**Also confirm nothing else regressed:**
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21),
`node tests/color-engine/color-engine.test.mjs` (44),
`node tests/datetime-engine/datetime-engine.test.mjs` (60),
`node tests/toast-engine/toast-engine.test.mjs` (39),
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/media-engine/run-all.mjs` (68).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/image-cropper-engine.html`. The demo
(`demo/image-cropper-engine.js`) is a reference **consumer**: it renders the image's
transform, the crop frame, the circular mask, the dimmed exterior, the
rule-of-thirds grid, the zoom readout and the result — all from the engine's emitted
state. It hands the engine **no** image element; it applies the emitted
`previewMatrix` itself, so the demo proves the engine renders nothing.

Each check below was confirmed in a real browser session against this build.

1. **Framing renders from state.** The portrait `image-2.3.jpg` (2000×3000) loads and
   covers the square crop at the cover scale (`0.243×`, `ratio` 1.00) — verified the
   emitted matrix scale equals `max(486.5/2000, 486.5/3000) = 0.243` and the source
   rect is the centered `2000×2000 @ (0,500)`. The dimmed exterior, the bright frame
   and the grid are all consumer-drawn at the emitted crop rect.
2. **Drag pans 1:1 and clamps at coverage.** A within-bounds drag of 60 px moves the
   image by exactly 60 px. Dragging past the bound **clamps** (the vertical offset
   pins to the symmetric coverage bounds `[-229.25, +14]` around the centered
   `-107.6`, ±121.6 overhang); horizontal drag is **locked** because a portrait in a
   square crop has no horizontal overhang. You cannot pan empty space into the crop.
3. **Wheel zoom is anchored and bounded.** Wheel-in raises the scale (`0.33×` →
   `1.39×`, "4.22× of cover") anchored at the pointer; the zoom slider tracks
   `min..maxRatio` and the readout updates live. (Pinch shares the same
   `gestures` path, unit-tested in `tests/gestures`.)
4. **Ratio + shape switching.** 1:1 → 16:9 reshapes the crop to aspect **1.778**
   (658×370 frame) and re-clamps; rect/square/circle switch the crop; **circle** sets
   `round` and the consumer renders a `border-radius:50%` mask whose dim follows the
   circle.
5. **Rotate + flip re-clamp.** Rotating the circular crop 90° keeps coverage (the
   re-clamped matrix is a clean quarter-turn), keeps the source rect (`2000×2000 @
   (0,500)`) and flags `rotation:90`. Flip toggles the output flags.
6. **Export — the real deliverable.** "Export crop" calls
   `cropToBlob(img, cropper.getOutputGeometry(), …)` and shows the result. For the
   rotated circular crop it produced a **512×512** PNG from source rect `2000×2000 @
   (0,500)` at `rot 90°`. The exported pixels were checked **against an independent,
   geometry-derived mapping of the source** (re-derived from the math, not the helper
   code): mean absolute luminance difference **0.95 / 255** — i.e. the export bakes
   in the exact source rect **and** the 90° rotation correctly. The result preview is
   masked round for a circle crop, and the max-dimension target (512) downsizes the
   large source.
7. **No console errors or warnings** at any point during the above.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it owns geometry and renders nothing. These checks
confirm the boundary holds.

1. **No CSS, no chrome DOM in the engine.** `image-cropper-engine.js` ships no stylesheet
   and no markup. The only DOM it touches is the handed image element (read
   `naturalWidth`/`naturalHeight`; optionally write `style.transform` for the live
   preview) and the optional `attachInput`/`observe` conveniences (gesture +
   ResizeObserver wiring on the consumer's surface) — all inside method bodies,
   guarded, never at module scope. The clean Node import in Gate 1 proves nothing
   DOM-related runs at module scope.
2. **The pure core is canvas-free; canvas is isolated.** The Gate-1 source scan
   asserts `image-cropper-engine.js` references no `canvas`/`getContext`/`document`/
   `OffscreenCanvas`, and never imports `image-cropper-engine-export.js`. The single canvas
   draw lives in `image-cropper-engine-export.js`, which imports nothing — so requiring the
   core can never pull in canvas code, and the geometry path runs in Node.
3. **Imports only from `shared/`.** The core's `from` specifiers are exactly
   `../shared/transform2d.js`, `../shared/gestures.js`, `../shared/emitter.js`,
   `../shared/clamp.js`, `../shared/enums.js` (asserted by the source scan). It mints no
   new copy of anything that lives in `shared/` — `FitMode` is imported, not redefined.
4. **The demo is entirely consumer-rendered.** Every visible thing — the image's
   `matrix(...)`, the frame's position/size, the circular mask, the dim, the grid,
   the slider, the result — lives in `demo/image-cropper-engine.html` /
   `demo/image-cropper-engine.js`, built from the engine's return values. Delete the demo
   and the engine is unchanged and still fully tested by Gate 1. Swap the renderer
   (different markup, a framework, or none) and the engine does not change — it emits
   geometry; the consumer owns all rendering. The demo even declines `attachImage`
   and applies `previewMatrix` itself to make this explicit.

---

## 5. Known scope boundaries (by design)

- **Frame-and-crop only, not an image editor.** No filters, brushes, text, stickers,
  adjustments, drawing or layers. That is a different, un-reusable product. The hard
  line is deliberate; the `gestures` + `transform2d` modules this consumes are the
  same ones a future editor could use, but the cropper is view-and-crop only.
- **Fixed-window framing model.** "Move the image behind a fixed crop window" (the
  avatar-cropper feel) is the built, tested model. A movable/resizable crop rectangle
  over a fixed image is intentionally **not** built (it is a different interaction).
- **90° rotation steps only.** Quarter-turn rotation is the required baseline and
  what `transform2d` supports exactly (zero floating-point error). Free-angle
  rotation is **not** built — it would require extending `transform2d`'s matrix/
  bounds math, out of scope for v1.
- **Non-rectangular cropping is a consumer mask.** Circle/rounded is a
  consumer-rendered mask over a rectangular crop, not pixel-level non-rect cropping.
  The engine's crop math and the exported pixels are always the bounding rectangle.
- **Export is optional and browser-only.** `image-cropper-engine-export.js` is the only
  canvas code; it is verified in Gate 2, not Gate 1 (the pure suite is canvas-free).
  A headless consumer can take the emitted geometry to its own canvas, an
  `OffscreenCanvas` worker, or a server and never load the helper.
- **The engine produces output; it does not upload it.** Emitting the geometry (or a
  Blob/dataURL via the helper) is the deliverable; sending it anywhere is the
  consumer's job.
- **No host coupling.** No stores, services, data schema, design tokens, routing or
  framework hooks. The engine takes an image + config and emits state.
