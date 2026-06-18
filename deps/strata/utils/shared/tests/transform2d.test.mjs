// transform2d.test.mjs
// Pure unit tests for the transform module: fit math, the emitted matrix,
// zoom-to-point, bounds clamping, rotation/flip, fit modes, resets, guards.
//   node transform2d.test.mjs
//
// Importing transform2d.js here doubles as a headless-core check: it must not touch
// the DOM at module scope, or this import throws in Node.

import { test, assert, isMain, report } from './harness.mjs';
import { createTransform, FitMode } from '../transform2d.js';

// Apply a CSS matrix [a,b,c,d,e,f] to a point: X = a·x + c·y + e, Y = b·x + d·y + f.
const applyMatrix = (matrix, x, y) => [
  matrix[0] * x + matrix[2] * y + matrix[4],
  matrix[1] * x + matrix[3] * y + matrix[5],
];
const near = (a, b, tolerance = 1e-6) => Math.abs(a - b) <= tolerance;

// ============================================================================
// Fit math + matrix
// ============================================================================

test('fit (contain): 2000×1000 image in 1000×1000 viewport → scale 0.5, centered', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  const state = transform.getState();
  assert.ok(near(state.scale, 0.5), `scale ${state.scale}`);
  assert.ok(near(state.minScale, 0.5), `minScale ${state.minScale}`);
  // Matrix places the 1000×500 scaled image centered: x offset 0, y offset 250.
  assert.deepEqual(state.matrix.map((value) => +value.toFixed(6)), [0.5, 0, 0, 0.5, 0, 250]);
});

test('matrix identity: 1000×1000 image in 1000×1000 viewport at scale 1 → matrix(1,0,0,1,0,0)', () => {
  const transform = createTransform();
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000); // fit = 1
  assert.deepEqual(transform.getState().matrix, [1, 0, 0, 1, 0, 0]);
});

test('matrix maps image corners into the viewport (fit, contain)', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // scale 0.5
  const matrix = transform.getState().matrix;
  assert.deepEqual(applyMatrix(matrix, 0, 0), [0, 250], 'top-left → (0,250)');
  assert.deepEqual(applyMatrix(matrix, 2000, 1000), [1000, 750], 'bottom-right → (1000,750)');
});

// ============================================================================
// Zoom-to-point — the detail that makes zoom feel right
// ============================================================================

test('zoom-to-point keeps the pointed viewport location fixed', () => {
  const transform = createTransform();
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000); // fit 1
  const before = applyMatrix(transform.getState().matrix, 250, 250); // image point under (250,250)
  transform.zoomTo(2, 250, 250);
  const after = applyMatrix(transform.getState().matrix, 250, 250);
  // The same image-space point must still land at (250,250).
  assert.ok(near(after[0], before[0]) && near(after[1], before[1]), `${after} vs ${before}`);
  assert.deepEqual(
    transform.getState().matrix.map((value) => +value.toFixed(6)),
    [2, 0, 0, 2, -250, -250],
  );
});

test('zoom about center: pan scales with zoom (pan1 = k·pan0)', () => {
  const transform = createTransform();
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000);
  transform.zoomTo(2, 500, 500); // center → pan stays 0
  assert.ok(near(transform.getState().x, 0) && near(transform.getState().y, 0));
  // Now pan, then zoom about center again: pan should double.
  transform.panBy(100, 0); // within bounds (scale 2 → bound 500)
  assert.ok(near(transform.getState().x, 100));
  transform.zoomTo(4, 500, 500);
  assert.ok(near(transform.getState().x, 200), `pan ${transform.getState().x} expected 200`);
});

test('zoomBy multiplies; scale clamps to [min,max]', () => {
  const transform = createTransform({ maxZoomFactor: 4 }); // 1000² → fit 1, max 4
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000);
  transform.zoomBy(10); // 1 * 10 → clamp to 4
  assert.ok(near(transform.getState().scale, 4), `scale ${transform.getState().scale}`);
  transform.zoomBy(0.001); // → clamp to min (fit) 1
  assert.ok(near(transform.getState().scale, 1));
});

// ============================================================================
// Pan bounds clamping (zoom- and rotation-aware)
// ============================================================================

test('pan clamps to ±(scaledWidth−viewportWidth)/2; locked centered when image fits axis', () => {
  const transform = createTransform();
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000);
  transform.zoomTo(2, 500, 500); // scaled width 2000 → bound 500
  transform.panTo(10000, -10000);
  assert.ok(
    near(transform.getState().x, 500) && near(transform.getState().y, -500),
    'clamped to ±500'
  );
  // Zoom back to fit → no overhang → locked centered.
  transform.resetZoom();
  transform.panTo(300, 300);
  assert.ok(
    near(transform.getState().x, 0) && near(transform.getState().y, 0),
    'fit → centered, pan ignored'
  );
});

test('bounds after rotation use swapped effective dimensions', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // fit 0.5
  transform.rotateBy(90); // refit; rotated fit also 0.5
  transform.zoomTo(transform.getFitScale() * 2, 500, 500); // scale 1
  // Rotated effective width = naturalHeight·scale = 1000 == viewport → x bound 0;
  // effective height = naturalWidth·scale = 2000 → y bound 500.
  const bounds = transform.getBounds();
  assert.ok(near(bounds.x, 0), `x bound ${bounds.x}`);
  assert.ok(near(bounds.y, 500), `y bound ${bounds.y}`);
});

// ============================================================================
// Rotation & flip
// ============================================================================

test('rotate 90 from fit produces the expected matrix (2000×1000 in 1000×1000)', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  transform.rotateBy(90);
  const state = transform.getState();
  assert.equal(state.rotation, 90);
  assert.ok(near(state.scale, 0.5), 'stays fitted after rotation');
  assert.deepEqual(state.matrix.map((value) => +value.toFixed(6)), [0, 0.5, -0.5, 0, 750, 0]);
});

test('rotation wraps 0→90→180→270→0 and normalizes negatives', () => {
  const transform = createTransform();
  transform.setNaturalSize(800, 600).setViewport(1000, 1000);
  transform.rotateRight();
  assert.equal(transform.getState().rotation, 90);
  transform.rotateLeft().rotateLeft(); // 90 → 0 → 270
  assert.equal(transform.getState().rotation, 270);
  transform.rotateRight(); // → 0
  assert.equal(transform.getState().rotation, 0);
});

test('flip horizontal negates the x linear term', () => {
  const transform = createTransform();
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000); // scale 1
  transform.flipHorizontal();
  const matrix = transform.getState().matrix;
  assert.ok(near(matrix[0], -1), `a ${matrix[0]}`);
  // Image left edge (0,0) maps to the right edge; right edge (1000,0) to x=0.
  assert.ok(near(applyMatrix(matrix, 0, 0)[0], 1000) && near(applyMatrix(matrix, 1000, 0)[0], 0));
});

// ============================================================================
// Fit modes
// ============================================================================

test('fit modes: small 100×100 image — FIT upscales, FIT_NO_UPSCALE caps at 1, FILL covers', () => {
  const transform = createTransform({ fitMode: FitMode.FIT });
  transform.setNaturalSize(100, 100).setViewport(1000, 1000);
  assert.ok(near(transform.getFitScale(), 10), 'FIT upscales to 10');
  transform.setFitMode(FitMode.FIT_NO_UPSCALE);
  assert.ok(near(transform.getFitScale(), 1), 'no-upscale caps at 1');
  assert.ok(near(transform.getState().scale, 1), 'snapped to the new fit');
  transform.setFitMode(FitMode.FILL);
  assert.ok(near(transform.getFitScale(), 10), 'FILL covers (same as FIT for a square in a square)');
});

test('fit modes: wide 2000×500 image in 1000×1000 — FILL covers (scale 2), FIT contains (0.5)', () => {
  const transform = createTransform({ fitMode: FitMode.FILL });
  transform.setNaturalSize(2000, 500).setViewport(1000, 1000);
  assert.ok(near(transform.getFitScale(), 2), 'cover = max(0.5, 2) = 2');
  transform.setFitMode(FitMode.FIT);
  assert.ok(near(transform.getFitScale(), 0.5), 'contain = min(0.5, 2) = 0.5');
});

// ============================================================================
// double-tap target, isZoomed, capability
// ============================================================================

test('doubleTapTarget toggles fit ↔ configured level (default 100%)', () => {
  const transform = createTransform(); // doubleTapScale default 1
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // fit 0.5
  assert.ok(near(transform.doubleTapTarget(), 1), 'from fit → 100%');
  transform.zoomTo(1, 500, 500); // now at 100% (zoomed past fit)
  assert.ok(near(transform.doubleTapTarget(), 0.5), 'from zoomed → back to fit');
});

test('doubleTapTarget falls back to a real zoom-in when 100% is below fit (tiny image)', () => {
  const transform = createTransform();
  transform.setNaturalSize(100, 100).setViewport(1000, 1000); // fit 10 (>1)
  const target = transform.doubleTapTarget();
  assert.ok(
    target > transform.getFitScale(),
    `target ${target} must exceed fit ${transform.getFitScale()}`
  );
});

test('isZoomed false at fit, true after zooming in', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  assert.equal(transform.isZoomed(), false);
  transform.zoomBy(2);
  assert.equal(transform.isZoomed(), true);
});

test('isZoomed is the exact complement of doubleTapTarget(): no overlap band just above fit', () => {
  // Regression: isFitted() used tolerance fitScale*1e-4 + EPSILON (with <=) while
  // isZoomed() used scale > fitScale*(1+1e-4) (no EPSILON, strict >). That left a
  // band just above fit where BOTH returned true, so doubleTapTarget() treated the
  // scale as "fitted, zoom in" while isZoomed() reported "zoomed". With fit 0.5 a
  // scale of 0.500050000001 sits inside isFitted's tolerance band.
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // fit 0.5
  const fit = transform.getFitScale();
  assert.ok(near(fit, 0.5), `fit ${fit}`);
  // A scale inside isFitted's tolerance band (just above fit) must NOT be zoomed.
  transform.zoomTo(fit + fit * 1e-4 + 1e-7, 500, 500);
  assert.equal(transform.isZoomed(), false, 'near-fit scale is fitted, not zoomed');
  // doubleTapTarget() must agree: still "fitted" → zoom IN to the configured level,
  // never the contradictory "zoomed → back to fit" branch.
  assert.ok(
    transform.doubleTapTarget() > transform.getFitScale(),
    'doubleTapTarget zooms in (treats it as fitted), consistent with isZoomed()=false'
  );
  // Clearly beyond the tolerance band → zoomed, and doubleTapTarget snaps back to fit.
  transform.zoomTo(fit * 1.5, 500, 500);
  assert.equal(transform.isZoomed(), true, 'clearly past fit is zoomed');
  assert.ok(
    near(transform.doubleTapTarget(), transform.getFitScale()),
    'doubleTapTarget returns to fit (treats it as zoomed), consistent with isZoomed()=true'
  );
});

test('zoom capability descriptor reflects current/min/max/ready/fitAvailable', () => {
  const transform = createTransform();
  let capability = transform.getZoomCapability();
  assert.equal(capability.ready, false, 'not ready before dimensions');
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  capability = transform.getZoomCapability();
  assert.equal(capability.ready, true);
  assert.ok(near(capability.min, 0.5) && near(capability.current, 0.5));
  assert.equal(capability.fitAvailable, false, 'at fit → nothing to fit');
  transform.zoomBy(2);
  assert.equal(transform.getZoomCapability().fitAvailable, true, 'zoomed → fit is now meaningful');
});

test('fitAvailable agrees with isFitted()/isZoomed() inside the near-fit tolerance band', () => {
  // Regression: fitAvailable used an ABSOLUTE epsilon (|scale-fit| > 1e-6) while
  // isFitted()/isZoomed()/doubleTapTarget() share a RELATIVE tolerance
  // (fitScale*1e-4 + EPSILON). A scale 3e-5 above fit 0.5 sits inside isFitted's
  // band (tolerance 5.1e-5) so the module calls it "fitted" — yet the old
  // fitAvailable reported true (3e-5 > 1e-6), contradicting isFitted(). It must
  // route through the same predicate: at-fit ⇒ fitAvailable:false.
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // fit 0.5
  const fit = transform.getFitScale();
  transform.zoomTo(fit + 3e-5, 500, 500); // 0.50003 — inside isFitted's tolerance band
  assert.equal(transform.isZoomed(), false, 'near-fit scale is fitted, not zoomed');
  assert.equal(
    transform.getZoomCapability().fitAvailable,
    false,
    'fitAvailable agrees with isFitted(): already at fit → nothing to snap to'
  );
  // And just past the band it must agree the other way.
  transform.zoomTo(fit * 1.5, 500, 500);
  assert.equal(transform.isZoomed(), true, 'clearly past fit is zoomed');
  assert.equal(
    transform.getZoomCapability().fitAvailable,
    true,
    'fitAvailable agrees with isZoomed(): zoomed → fit is meaningful'
  );
});

test('getState() emits no redundant fitScale field; minScale is the lone zoom floor', () => {
  // Regression: getState() used to emit BOTH fitScale and minScale, but minScale()
  // is an unconditional alias of fitScale() — byte-for-byte identical for every
  // call — so the pair misled consumers into treating the floor as an independent
  // signal that could sit below the fit point. Mirroring image-cropper-engine's
  // fix (AUDIT.md line 390), getState() now emits only minScale.
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000); // fit/min 0.5
  const state = transform.getState();
  assert.ok(!('fitScale' in state), 'redundant fitScale field is not emitted');
  assert.ok(near(state.minScale, 0.5), `minScale ${state.minScale} is the cover floor`);
  // The named accessors still agree and equal the emitted floor, across fit modes
  // and rotation — the invariant minScale === fitScale holds forever.
  assert.ok(near(transform.getMinScale(), state.minScale), 'getMinScale() matches emitted minScale');
  assert.ok(near(transform.getFitScale(), state.minScale), 'getFitScale() === minScale (alias)');
  transform.setFitMode(FitMode.FILL);
  assert.ok(
    near(transform.getMinScale(), transform.getFitScale()),
    'minScale === fitScale under FILL too'
  );
  transform.rotateBy(90);
  assert.ok(
    near(transform.getMinScale(), transform.getFitScale()),
    'minScale === fitScale after rotation too'
  );
  assert.ok(
    near(transform.getState().minScale, transform.getFitScale()),
    'emitted minScale tracks the fit point'
  );
});

// ============================================================================
// Resets
// ============================================================================

test('reset() restores rotation 0, no flips, fit mode, fitted & centered', () => {
  const transform = createTransform({ fitMode: FitMode.FIT });
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  transform.zoomBy(3).panBy(100, 50).rotateBy(90).flipHorizontal().setFitMode(FitMode.FILL);
  transform.reset();
  const state = transform.getState();
  assert.equal(state.rotation, 0);
  assert.equal(state.flippedHorizontally, false);
  assert.equal(state.flippedVertically, false);
  assert.equal(state.fitMode, FitMode.FIT);
  assert.ok(near(state.scale, 0.5) && near(state.x, 0) && near(state.y, 0));
});

// ============================================================================
// Guards
// ============================================================================

test('guard: no dimensions → fit 1, bounds 0, finite matrix, no NaN', () => {
  const transform = createTransform();
  const state = transform.getState();
  assert.ok(near(state.minScale, 1) && near(state.bounds.x, 0) && near(state.bounds.y, 0));
  assert.equal(state.ready, false);
  assert.ok(state.matrix.every(Number.isFinite), 'matrix finite without dimensions');
  transform.zoomTo(5, 10, 10).panBy(50, 50); // must not throw or NaN
  assert.ok(transform.getState().matrix.every(Number.isFinite), 'still finite after ops');
});

test('guard: setNaturalSize(0,0) does not crash and yields finite state', () => {
  const transform = createTransform();
  transform.setViewport(800, 600).setNaturalSize(0, 0);
  assert.ok(transform.getState().matrix.every(Number.isFinite));
});

test('guard: non-finite zoom/pan/rotate input is ignored, never poisons state', () => {
  // Regression: rotateBy(NaN) used to poison `rotation` and crash the matrix
  // lookup; zoomTo(NaN) used to set scale to NaN permanently.
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  const before = transform.getState();
  transform.zoomTo(NaN).zoomBy(Infinity).panBy(NaN, 5).panTo(5, NaN).rotateBy(NaN);
  const after = transform.getState();
  assert.deepEqual(after, before, 'state unchanged by non-finite input');
  assert.ok(after.matrix.every(Number.isFinite), 'matrix still finite');
});

test('guard: setViewport(Infinity) is rejected like NaN — finite matrix, not ready', () => {
  // Regression: `width > 0` let Infinity through (Infinity > 0 is true), so
  // Infinity became a persistent dimension; hasDimensions()→true, fitScale()→
  // Infinity, and computeMatrix() emitted [Infinity, NaN, NaN, Infinity, NaN, NaN].
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(Infinity, Infinity);
  const state = transform.getState();
  assert.equal(state.ready, false, 'Infinity viewport rejected → not ready');
  assert.ok(state.matrix.every(Number.isFinite), 'matrix finite, not poisoned');
  assert.ok(Number.isFinite(state.minScale), `minScale ${state.minScale} finite`);
});

test('guard: setNaturalSize(Infinity) is rejected like NaN — finite matrix, not ready', () => {
  const transform = createTransform();
  transform.setViewport(1000, 1000).setNaturalSize(Infinity, Infinity);
  const state = transform.getState();
  assert.equal(state.ready, false, 'Infinity natural size rejected → not ready');
  assert.ok(state.matrix.every(Number.isFinite), 'matrix finite, not poisoned');
});

test('setFitMode throws TypeError on an unknown mode (does not silently fall back to FIT)', () => {
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  assert.throws(() => transform.setFitMode('garbage'), TypeError, 'unknown mode throws');
  // State unchanged: still the default FIT mode, not 'garbage'.
  assert.equal(transform.getState().fitMode, FitMode.FIT);
});

test('createTransform throws TypeError on an unknown fitMode option', () => {
  assert.throws(() => createTransform({ fitMode: 'garbage' }), TypeError, 'unknown option throws');
});

test('guard: rotateBy with a large finite degrees keeps rotation a legal multiple of 90', () => {
  // Regression: rotateBy() guarded only non-finite input. For a large finite
  // magnitude (~1e17+), `Math.round(degrees/90)*90` exceeds float spacing and is
  // no longer an exact multiple of 90, so `% 360` stored a value like 264/48/280.
  // That value is not a key in TRIGONOMETRY_BY_ROTATION, so computeMatrix()
  // destructured undefined and getState() threw permanently (TypeError).
  const transform = createTransform();
  transform.setNaturalSize(2000, 1000).setViewport(1000, 1000);
  for (const degrees of [1e17, -1e17, 1e18, 1e21]) {
    const fresh = createTransform();
    fresh.setNaturalSize(2000, 1000).setViewport(1000, 1000);
    fresh.rotateBy(degrees);
    const state = fresh.getState(); // must not throw
    assert.ok(
      [0, 90, 180, 270].includes(state.rotation),
      `rotateBy(${degrees}) yielded illegal rotation ${state.rotation}`
    );
    assert.ok(state.matrix.every(Number.isFinite), `matrix finite after rotateBy(${degrees})`);
  }
  // And it stays usable afterward: another rotate still lands on a legal step.
  transform.rotateBy(1e17).rotateBy(90);
  assert.ok([0, 90, 180, 270].includes(transform.getState().rotation));
});

test('rotateBy(45) and rotateBy(135) still round to the nearest 90° step', () => {
  // The step-count normalization must preserve the documented "round to nearest
  // step" behavior for small non-multiples (45 → 90, 135 → 180).
  const transform = createTransform();
  transform.setNaturalSize(800, 600).setViewport(1000, 1000);
  transform.rotateBy(45);
  assert.equal(transform.getState().rotation, 90, '45 rounds to 90');
  transform.resetRotation();
  transform.rotateBy(135);
  assert.equal(transform.getState().rotation, 180, '135 rounds to 180');
});

test('guard: maxScale: NaN falls back to the factor-based cap (does not disable the cap)', () => {
  // Regression: an unguarded maxScale: NaN made maxScale() return NaN, so the
  // upper clamp never capped and getState().maxScale emitted NaN.
  const transform = createTransform({ maxScale: NaN, maxZoomFactor: 4 });
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000); // fit 1 → factor cap 4
  const state = transform.getState();
  assert.ok(near(state.maxScale, 4), `maxScale ${state.maxScale} should be the factor cap 4`);
  transform.zoomTo(100, 500, 500); // must be capped, not 100
  assert.ok(near(transform.getState().scale, 4), `scale ${transform.getState().scale} capped at 4`);
  assert.ok(Number.isFinite(transform.getZoomCapability().max), 'capability.max finite');
});

test('guard: maxZoomFactor: Infinity falls back to the default factor 4 (does not disable the cap)', () => {
  // Regression: maxZoomFactor used a bare `> 0` guard that accepted Infinity,
  // so maxScale() = max(1, fitScale) * Infinity = Infinity, poisoning emitted
  // state and disabling the upper zoom clamp (zoomTo(1e9) yielded scale 1e9).
  const transform = createTransform({ maxZoomFactor: Infinity });
  transform.setNaturalSize(1000, 1000).setViewport(1000, 1000); // fit 1 → factor cap 4
  const state = transform.getState();
  assert.ok(near(state.maxScale, 4), `maxScale ${state.maxScale} should be the default factor cap 4`);
  assert.ok(Number.isFinite(transform.getZoomCapability().max), 'capability.max finite');
  transform.zoomTo(1e9, 500, 500); // must be capped at 4, not a runaway 1e9
  assert.ok(near(transform.getState().scale, 4), `scale ${transform.getState().scale} capped at 4`);
  assert.ok(transform.getState().matrix.every(Number.isFinite), 'matrix stays finite');
});

if (isMain(import.meta.url)) report({ exit: true });
