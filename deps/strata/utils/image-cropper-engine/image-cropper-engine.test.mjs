// image-cropper-engine.test.mjs
// Pure unit tests for the cropper's geometry — the heart of the engine. No DOM, no
// canvas: every assertion is deterministic geometry-in → geometry-out.
//   node image-cropper-engine/image-cropper-engine.test.mjs
//
// Importing image-cropper-engine.js here doubles as a headless-core check: it must not
// touch the DOM (or canvas) at module scope, or this import throws in Node.

import { test, assert, isMain, report } from './harness.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createCropper, CropShape, aspectRatio } from './image-cropper-engine.js';
import { cropToCanvas } from './image-cropper-engine-export.js';

// Minimal canvas stub so cropToCanvas (a browser-only helper) is exercisable in
// Node: it only needs width/height settable and a no-op 2d context. We pass it in
// via options.canvas, so createCanvas() (which needs document/OffscreenCanvas) is
// never reached.
function stubCanvas() {
  const ctx = new Proxy({}, { get: () => () => {} });
  return { width: 0, height: 0, getContext: () => ctx };
}

const near = (a, b, eps = 1e-4) => Math.abs(a - b) <= eps;
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

function invert(m) {
  const [a, b, c, d, e, f] = m;
  const det = a * d - b * c;
  return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det];
}

// Reconstruct the CROP-LOCAL matrix (image-natural → crop-local) from the emitted
// container-space previewMatrix minus the crop origin. This is exactly what the
// engine inverts for the source rect, and what the consumer applies for preview, so
// verifying coverage/source-rect against it is the meaningful guarantee.
function cropLocalMatrix(state) {
  const pm = state.previewMatrix;
  return [pm[0], pm[1], pm[2], pm[3], pm[4] - state.crop.x, pm[5] - state.crop.y];
}

// The four crop corners mapped back into image-natural space (UN-clamped), for the
// coverage check. If the image covers the crop, all four land inside [0,natW]×[0,natH].
function imageSpaceCorners(state) {
  const inv = invert(cropLocalMatrix(state));
  const { width: cw, height: ch } = state.crop;
  return [[0, 0], [cw, 0], [cw, ch], [0, ch]].map(([x, y]) => apply(inv, x, y));
}

function assertCovers(state, msg = '') {
  const { width: nw, height: nh } = state.source;
  for (const [x, y] of imageSpaceCorners(state)) {
    assert.ok(
      x >= -1e-3 && x <= nw + 1e-3 && y >= -1e-3 && y <= nh + 1e-3,
      `${msg} corner (${x.toFixed(3)},${y.toFixed(3)}) outside image ${nw}×${nh}`,
    );
  }
}

// A ready cropper: image + container, default (cover) framing.
function setup(imgW, imgH, contW, contH, opts = {}) {
  return createCropper({
    image: { width: imgW, height: imgH },
    container: { width: contW, height: contH },
    ...opts,
  });
}

// ============================================================================
// Crop-region sizing per ratio (given a viewport + ratio → correct crop box)
// ============================================================================

test('crop sizing — square crop in a square container fills it at (0,0)', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 500) && near(crop.height, 500), `${crop.width}×${crop.height}`);
  assert.ok(near(crop.x, 0) && near(crop.y, 0));
});

test('crop sizing — 16:9 in a 1000×1000 container is width-bound and centered', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: aspectRatio(16, 9) });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 1000), `w ${crop.width}`);
  assert.ok(near(crop.height, 562.5), `h ${crop.height}`);
  assert.ok(near(crop.x, 0) && near(crop.y, 218.75), `pos ${crop.x},${crop.y}`);
});

test('crop sizing — 16:9 in a 1600×900 container fits exactly', () => {
  const c = setup(2000, 2000, 1600, 900, { aspect: '16:9' });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 1600) && near(crop.height, 900), `${crop.width}×${crop.height}`);
  assert.ok(near(crop.x, 0) && near(crop.y, 0));
});

test('crop sizing — 3:2 in a 600×1000 (tall) container is width-bound', () => {
  const c = setup(2000, 2000, 600, 1000, { aspect: aspectRatio(3, 2) });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 600) && near(crop.height, 400), `${crop.width}×${crop.height}`);
  assert.ok(near(crop.y, 300), `y ${crop.y}`);
});

test('crop sizing — free aspect fills the inset container', () => {
  const c = setup(2000, 2000, 800, 600, { aspect: 'free', inset: 20 });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 760) && near(crop.height, 560), `${crop.width}×${crop.height}`);
  assert.ok(near(crop.x, 20) && near(crop.y, 20));
  assert.equal(crop.aspect, null, 'free aspect reported as null');
});

test('crop sizing — locked aspect with a zeroed available height honors the inset on both axes', () => {
  // container 800×400, inset 200 → availableWidth=400, availableHeight=max(0,400-400)=0.
  // The height-bound branch is gated on availableHeight>0 and skipped, so the
  // width-bound fallback used to produce a 400×400 crop spilling past the 200px
  // vertical inset (crop.y=0, full container height). With zero vertical room the
  // crop must collapse instead of overflowing the inset.
  const c = setup(2000, 2000, 800, 400, { aspect: 1, inset: 200 });
  const { crop } = c.getState();
  assert.ok(near(crop.height, 0), `zeroed available height → crop.height 0, got ${crop.height}`);
  assert.ok(crop.y >= 200 - 1e-3, `crop must stay within the vertical inset, got y=${crop.y}`);
  assert.ok(crop.y + crop.height <= 400 - 200 + 1e-3,
    `crop bottom must not pass the inset, got ${crop.y + crop.height}`);
});

// ============================================================================
// Min-zoom = coverage scale
// ============================================================================

test('min-zoom = cover — square image/crop → 0.5', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const s = c.getState();
  assert.ok(near(s.zoom.min, 0.5), `min ${s.zoom.min}`);
  assert.ok(near(s.transform.scale, 0.5), 'default framing sits at the cover floor');
  assert.ok(near(s.zoom.ratio, 1), 'ratio 1 at min');
});

test('min-zoom = cover — landscape image in a square crop → 0.5', () => {
  // cover = max(cropW/imgW, cropH/imgH) = max(500/2000, 500/1000) = 0.5
  const c = setup(2000, 1000, 500, 500, { aspect: 1 });
  assert.ok(near(c.getState().zoom.min, 0.5));
});

test('min-zoom = cover — image SMALLER than crop upscales to cover (>1)', () => {
  // cover = max(500/100, 500/100) = 5 → the tiny image is blown up to fill the crop
  const c = setup(100, 100, 500, 500, { aspect: 1 });
  assert.ok(near(c.getState().zoom.min, 5), `min ${c.getState().zoom.min}`);
});

test('min-zoom = cover — non-square crop, matches max(cropW/eff, cropH/eff)', () => {
  const c = setup(2000, 1000, 800, 400, { aspect: aspectRatio(2, 1) }); // crop 800×400
  const cover = Math.max(800 / 2000, 400 / 1000); // 0.4
  assert.ok(near(c.getState().zoom.min, cover), `min ${c.getState().zoom.min} vs ${cover}`);
});

test('transform — no redundant fitScale field (minScale is the lone cover floor)', () => {
  // The engine locks FitMode.FILL, so transform2d's fitScale === minScale forever.
  // The emitted transform must NOT expose fitScale as if it were an independent signal;
  // minScale (and zoom.min) carry the cover floor.
  const c = setup(2000, 1000, 800, 400, { aspect: aspectRatio(2, 1) });
  const { transform, zoom } = c.getState();
  assert.ok(!('fitScale' in transform), 'redundant fitScale field is not emitted');
  const cover = Math.max(800 / 2000, 400 / 1000); // 0.4
  assert.ok(near(transform.minScale, cover), `minScale ${transform.minScale} vs ${cover}`);
  assert.ok(near(transform.minScale, zoom.min), 'minScale matches zoom.min');
});

// ============================================================================
// Output geometry — known framings → EXACT source-pixel rect (hand-computed)
// ============================================================================

test('output geometry — centered cover framing returns the whole square image', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 }); // scale 0.5, pan 0
  const g = c.getOutputGeometry();
  assert.ok(near(g.sourceRect.x, 0) && near(g.sourceRect.y, 0));
  assert.ok(near(g.sourceRect.width, 1000) && near(g.sourceRect.height, 1000), JSON.stringify(g.sourceRect));
  assert.equal(g.rotation, 0);
});

test('output geometry — zoomed to native (scale 1) returns the centered 500² region', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  c.zoomTo(1.0); // anchored at center → pan stays 0
  const { sourceRect: sr } = c.getOutputGeometry();
  assert.ok(near(sr.x, 250) && near(sr.y, 250), `${sr.x},${sr.y}`);
  assert.ok(near(sr.width, 500) && near(sr.height, 500), `${sr.width}×${sr.height}`);
});

test('output geometry — panning the image right shifts the source rect left', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  c.zoomTo(1.0); // scale 1, overhang ±250
  c.panTo(100, 0); // within bounds
  const { sourceRect: sr } = c.getOutputGeometry();
  // srcX = natW/2 - (cropW/2 + panX)/scale = 500 - (250+100) = 150
  assert.ok(near(sr.x, 150) && near(sr.y, 250), `${sr.x},${sr.y}`);
  assert.ok(near(sr.width, 500) && near(sr.height, 500));
});

test('output geometry — landscape image, square crop at cover → centered 1000² strip', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1 }); // crop 1000², cover 1
  const { sourceRect: sr } = c.getOutputGeometry();
  assert.ok(near(sr.x, 500) && near(sr.y, 0), `${sr.x},${sr.y}`);
  assert.ok(near(sr.width, 1000) && near(sr.height, 1000));
});

// ============================================================================
// Coverage invariant — across pan & zoom extremes, combinations, rotations
// ============================================================================

test('coverage invariant — holds across the full pan × zoom × rotation range', () => {
  const cases = [
    [1000, 1000, 500, 500, 1],
    [2000, 1000, 500, 500, 1],
    [2000, 1000, 800, 450, aspectRatio(16, 9)],
    [900, 1600, 600, 600, 1],
    [100, 100, 500, 500, 1], // image smaller than crop
    [3000, 2000, 700, 500, aspectRatio(3, 2)],
  ];
  for (const [iw, ih, cw, ch, aspect] of cases) {
    const c = setup(iw, ih, cw, ch, { aspect, maxZoom: 6 });
    for (const rot of [0, 90, 180, 270]) {
      c.reset();
      if (rot) c.rotateBy(rot);
      const { zoom } = c.getState();
      const scales = [zoom.min, zoom.min * 1.5, (zoom.min + zoom.max) / 2, zoom.max];
      for (const scale of scales) {
        c.zoomTo(scale);
        // Hammer pan to the extremes on both axes (the engine clamps to bounds).
        for (const [px, py] of [[0, 0], [1e6, 1e6], [-1e6, -1e6], [1e6, -1e6], [-1e6, 1e6]]) {
          c.panTo(px, py);
          assertCovers(c.getState(), `img ${iw}×${ih} crop ${cw}×${ch} rot ${rot} scale ${scale.toFixed(3)}`);
        }
      }
    }
  }
});

test('coverage invariant — pan cannot be pushed past the bounds (clamps)', () => {
  const c = setup(2000, 1000, 500, 500, { aspect: 1 });
  c.zoomTo(1.0); // scale 1 → x overhang (2000-500)/2... no: crop is the viewport (500)
  // image 2000×1000 at scale 1, crop 500 → overhang x=(2000-500)/2=750, y=(1000-500)/2=250
  c.panTo(99999, 99999);
  const s = c.getState();
  assert.ok(near(s.transform.x, 750) && near(s.transform.y, 250), `clamped pan ${s.transform.x},${s.transform.y}`);
  assertCovers(s);
});

// ============================================================================
// Rotation — recompute coverage, bounds, and output orientation
// ============================================================================

test('rotation — 90° on a landscape/square-crop keeps the same source rect, flags rotation', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1 }); // cover 1
  c.rotateRight();
  const g = c.getOutputGeometry();
  assert.equal(g.rotation, 90);
  // The crop still samples the centered 1000² of the image; the OUTPUT is rotated.
  assert.ok(near(g.sourceRect.x, 500) && near(g.sourceRect.y, 0), JSON.stringify(g.sourceRect));
  assert.ok(near(g.sourceRect.width, 1000) && near(g.sourceRect.height, 1000));
  assertCovers(c.getState(), 'after 90');
});

test('rotation — non-square crop, 90°: source rect swaps to crop aspect', () => {
  const c = setup(2000, 1000, 800, 400, { aspect: aspectRatio(2, 1) }); // crop 800×400, cover 0.4
  c.rotateRight(); // cover recomputes to 0.8 (effective image 1000×2000)
  const g = c.getOutputGeometry();
  assert.equal(g.rotation, 90);
  assert.ok(near(g.sourceRect.x, 750) && near(g.sourceRect.y, 0), JSON.stringify(g.sourceRect));
  assert.ok(near(g.sourceRect.width, 500) && near(g.sourceRect.height, 1000), `${g.sourceRect.width}×${g.sourceRect.height}`);
  // base output is the source rect ORIENTED to the crop (90° swaps) → 1000×500 = 2:1
  assert.ok(near(g.width / g.height, 2), `output aspect ${g.width}/${g.height}`);
  assertCovers(c.getState(), 'after 90 non-square');
});

test('rotation — output aspect always equals the crop aspect, every quarter turn', () => {
  const c = setup(3000, 2000, 800, 450, { aspect: aspectRatio(16, 9) });
  for (const rot of [0, 90, 180, 270]) {
    c.reset();
    if (rot) c.rotateBy(rot);
    const g = c.getOutputGeometry();
    assert.ok(near(g.width / g.height, 16 / 9, 0.02), `rot ${rot}: aspect ${g.width}/${g.height}`);
    assertCovers(c.getState(), `rot ${rot}`);
  }
});

test('rotation — wraps 0→90→180→270→0', () => {
  const c = setup(1600, 900, 500, 500, { aspect: 1 });
  c.rotateRight();
  assert.equal(c.getState().transform.rotation, 90);
  c.rotateLeft().rotateLeft();
  assert.equal(c.getState().transform.rotation, 270);
  c.rotateRight();
  assert.equal(c.getState().transform.rotation, 0);
});

// ============================================================================
// Flip — reflected in the output orientation
// ============================================================================

test('flip — flippedHorizontally sets the output flag, leaves the source rect (mirrored at export)', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1 });
  const before = c.getOutputGeometry().sourceRect;
  c.flipHorizontal();
  const g = c.getOutputGeometry();
  assert.equal(g.flippedHorizontally, true);
  assert.equal(g.flippedVertically, false);
  // Mirroring about the image center leaves the centered crop's source rect put.
  assert.ok(near(g.sourceRect.x, before.x) && near(g.sourceRect.width, before.width), JSON.stringify(g.sourceRect));
  assertCovers(c.getState());
});

test('flip — flippedVertically sets only the vertical flag; toggles off again', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1 });
  c.flipVertical();
  assert.equal(c.getOutputGeometry().flippedVertically, true);
  c.flipVertical();
  assert.equal(c.getOutputGeometry().flippedVertically, false);
});

// ============================================================================
// Target-size / output-dimension math (incl. upscale + cap)
// ============================================================================

test('output size — default is the framed source rect resolution, no upscale', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1 }); // cover 0.5 → whole image framed
  const g = c.getOutputGeometry();
  assert.ok(near(g.width, 2000) && near(g.height, 2000), `${g.width}×${g.height}`);
  assert.equal(g.upscale, false);
});

test('output size — target width drives a proportional height', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1, output: { width: 512 } });
  const g = c.getOutputGeometry();
  assert.ok(near(g.width, 512) && near(g.height, 512));
  assert.equal(g.upscale, false, '512 < 2000 available → downscale');
});

test('output size — max-dimension cap downsizes a huge source', () => {
  const c = setup(4000, 4000, 1000, 1000, { aspect: 1, output: { maxDimension: 512 } });
  const g = c.getOutputGeometry();
  assert.ok(near(g.width, 512) && near(g.height, 512), `${g.width}×${g.height}`);
  assert.equal(g.upscale, false);
});

test('output size — low-res source upscaled to target is flagged upscale:true', () => {
  const c = setup(100, 100, 500, 500, { aspect: 1, output: { width: 512 } });
  const g = c.getOutputGeometry();
  assert.ok(near(g.sourceRect.width, 100) && near(g.sourceRect.height, 100), 'whole tiny image framed');
  assert.ok(near(g.width, 512) && near(g.height, 512));
  assert.equal(g.upscale, true, '512 asked from 100 available → upscale');
});

test('output size — pinning both width and height honors them exactly', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1, output: { width: 300, height: 200 } });
  const g = c.getOutputGeometry();
  assert.ok(near(g.width, 300) && near(g.height, 200));
});

test('output size — setOutput updates the target live', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1 });
  c.setOutput({ maxDimension: 256 });
  const g = c.getOutputGeometry();
  assert.ok(near(g.width, 256) && near(g.height, 256));
});

test('output size — non-finite output.{width,height,maxDimension} are ignored, never leaked', () => {
  // Infinity > 0 is true, so a bare `> 0` check would let it through and emit
  // output.width = Infinity (and upscale = true). The finite-guard must drop it,
  // falling back to the source-rect resolution (the no-target default).
  for (const key of ['width', 'height', 'maxDimension']) {
    for (const bad of [Infinity, -Infinity, NaN]) {
      const c = setup(2000, 2000, 1000, 1000, { aspect: 1, output: { [key]: bad } });
      const g = c.getOutputGeometry();
      assert.ok(Number.isFinite(g.width) && Number.isFinite(g.height),
        `output.${key}=${bad} → finite geometry, got ${g.width}×${g.height}`);
      assert.ok(near(g.width, 2000) && near(g.height, 2000),
        `output.${key}=${bad} → falls back to source resolution, got ${g.width}×${g.height}`);
      assert.equal(g.upscale, false, `output.${key}=${bad} must not flag a spurious upscale`);
    }
  }
});

test('output size — setOutput rejects non-finite dims (keeps geometry finite)', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1 });
  c.setOutput({ width: Infinity, height: Infinity, maxDimension: Infinity });
  const g = c.getOutputGeometry();
  assert.ok(Number.isFinite(g.width) && Number.isFinite(g.height), `${g.width}×${g.height}`);
  assert.ok(near(g.width, 2000) && near(g.height, 2000));
  assert.equal(g.upscale, false);
});

test('output size — overflowing pinned dimension + maxDimension stays finite (no Infinity*0=NaN)', () => {
  // A pinned target on the order of MAX_VALUE/cropAspect overflows the proportional
  // derivation to Infinity; the maxDimension cap then computes maxDimension/Infinity = 0
  // and Infinity*0 = NaN, poisoning the emitted output.{width,height}. The finite-guard
  // must keep both axes finite (and non-NaN).
  const c = createCropper({
    image: { width: 1000, height: 10000 },
    container: { width: 100, height: 1000 },
    aspect: null,
    output: { width: 1e308, maxDimension: 2000 },
  });
  const g = c.getOutputGeometry();
  assert.ok(Number.isFinite(g.width) && Number.isFinite(g.height),
    `pinned-width overflow → finite geometry, got ${g.width}×${g.height}`);
  assert.ok(Number.isFinite(c.getState().output.width) && Number.isFinite(c.getState().output.height),
    `emitted output must be finite, got ${JSON.stringify(c.getState().output)}`);
  // Symmetric: pinned height overflow on a landscape source.
  const c2 = createCropper({
    image: { width: 10000, height: 1000 },
    container: { width: 1000, height: 100 },
    aspect: null,
    output: { height: 1e308, maxDimension: 2000 },
  });
  const g2 = c2.getOutputGeometry();
  assert.ok(Number.isFinite(g2.width) && Number.isFinite(g2.height),
    `pinned-height overflow → finite geometry, got ${g2.width}×${g2.height}`);
});

test('output size — setOutput(null) clears the target instead of throwing', () => {
  // An explicit null slips past the `= {}` default; reading .width off null
  // used to throw "Cannot read properties of null (reading 'width')". It must
  // now behave like setOutput() with no args: clear the target to all-null,
  // falling back to the source-rect resolution.
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1 });
  c.setOutput({ maxDimension: 256 }); // set a real target first
  assert.ok(near(c.getOutputGeometry().width, 256));
  assert.doesNotThrow(() => c.setOutput(null), 'setOutput(null) must not throw');
  const g = c.getOutputGeometry();
  assert.ok(Number.isFinite(g.width) && Number.isFinite(g.height), `${g.width}×${g.height}`);
  assert.ok(near(g.width, 2000) && near(g.height, 2000),
    `cleared target → source resolution, got ${g.width}×${g.height}`);
  assert.equal(g.upscale, false);
});

// ============================================================================
// Export helper — dimension-bomb cap survives a non-finite requested dimension
// ============================================================================

test('cropToCanvas — Infinity requested dimension collapses to the per-side cap, not NaN/0', () => {
  const geometry = { sourceRect: { x: 0, y: 0, width: 100, height: 100 }, width: 100, height: 100 };
  const canvas = stubCanvas();
  // Without the finite-guard: Math.round(Infinity)=Infinity, Infinity*(8192/Infinity)=NaN,
  // and canvas.width = NaN coerces to 0 — a broken zero-size canvas.
  cropToCanvas({}, geometry, { width: Infinity, height: Infinity, canvas });
  assert.ok(Number.isFinite(canvas.width) && Number.isFinite(canvas.height),
    `canvas dims must be finite, got ${canvas.width}×${canvas.height}`);
  assert.equal(canvas.width, 8192, 'width clamped to DEFAULT_MAX_DIMENSION');
  assert.equal(canvas.height, 8192, 'height clamped to DEFAULT_MAX_DIMENSION');
});

test('cropToCanvas — non-finite geometry.width collapses to the cap (no NaN canvas)', () => {
  const geometry = { sourceRect: { x: 0, y: 0, width: 100, height: 100 }, width: Infinity, height: Infinity };
  const canvas = stubCanvas();
  cropToCanvas({}, geometry, { canvas });
  assert.equal(canvas.width, 8192, 'width clamped to cap');
  assert.equal(canvas.height, 8192, 'height clamped to cap');
});

test('cropToCanvas — Infinity request with cap disabled (maxDimension:Infinity) stays finite', () => {
  const geometry = { sourceRect: { x: 0, y: 0, width: 100, height: 100 }, width: 100, height: 100 };
  const canvas = stubCanvas();
  // Cap disabled, but a non-finite *request* still cannot produce an infinite canvas;
  // it must collapse to the default per-side cap rather than NaN/0.
  cropToCanvas({}, geometry, { width: Infinity, maxDimension: Infinity, canvas });
  assert.ok(Number.isFinite(canvas.width) && canvas.width > 0,
    `width must be finite & positive, got ${canvas.width}`);
  assert.equal(canvas.width, 8192, 'non-finite request collapses to DEFAULT_MAX_DIMENSION');
});

// ============================================================================
// Shape — circle constrains to square + sets the round flag; math == square
// ============================================================================

test('shape — circle forces a 1:1 crop and sets round, with identical crop math', () => {
  const square = setup(1600, 900, 1000, 600, { shape: CropShape.SQUARE });
  const circle = setup(1600, 900, 1000, 600, { shape: CropShape.CIRCLE });
  const cs = square.getState().crop;
  const cc = circle.getState().crop;
  assert.equal(cs.round, false);
  assert.equal(cc.round, true, 'circle sets the round flag for the consumer mask');
  // Same bounding-rect geometry — only the flag differs.
  assert.ok(near(cs.width, cc.width) && near(cs.height, cc.height));
  assert.ok(near(cc.width, cc.height), 'circle crop is square');
  assert.equal(cc.aspect, 1);
});

test('shape — SQUARE in a wide container is the min dimension, centered', () => {
  const c = setup(2000, 2000, 1000, 600, { shape: CropShape.SQUARE });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 600) && near(crop.height, 600), `${crop.width}×${crop.height}`);
  assert.ok(near(crop.x, 200) && near(crop.y, 0), `centered ${crop.x},${crop.y}`);
});

test('shape — switching to circle reshapes a non-square crop and re-covers', () => {
  const c = setup(2000, 1000, 1000, 600, { aspect: aspectRatio(16, 9) });
  c.setShape(CropShape.CIRCLE);
  const s = c.getState();
  assert.equal(s.crop.round, true);
  assert.ok(near(s.crop.width, s.crop.height), 'now square');
  assertCovers(s, 'after shape→circle');
});

// ============================================================================
// Ratio / viewport change → re-clamp, coverage preserved
// ============================================================================

test('re-clamp — changing aspect while zoomed keeps coverage valid', () => {
  const c = setup(3000, 2000, 800, 800, { aspect: 1, maxZoom: 6 });
  c.zoomTo((c.getState().zoom.min + c.getState().zoom.max) / 2); // zoom in
  c.panTo(120, -80);
  c.setAspectRatio(aspectRatio(16, 9)); // reshape
  const s = c.getState();
  assert.ok(near(s.crop.width / s.crop.height, 16 / 9, 0.02), 'crop reshaped to 16:9');
  assert.ok(s.transform.scale >= s.zoom.min - 1e-6, 'scale re-clamped to the new cover floor');
  assertCovers(s, 'after aspect change');
});

test('re-clamp — shrinking the container recomputes the crop and re-covers', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: 1 });
  c.zoomTo(c.getState().zoom.min * 2);
  c.setContainerSize(400, 400);
  const s = c.getState();
  assert.ok(near(s.crop.width, 400) && near(s.crop.height, 400), 'crop follows the smaller container');
  assertCovers(s, 'after container shrink');
});

test('re-clamp — growing the container keeps the crop covered', () => {
  const c = setup(1200, 800, 600, 400, { aspect: aspectRatio(3, 2) });
  c.setContainerSize(1200, 800);
  const s = c.getState();
  assert.ok(near(s.crop.width, 1200) && near(s.crop.height, 800));
  assertCovers(s, 'after container grow');
});

// ============================================================================
// previewMatrix — container-space, positions the image to cover the crop
// ============================================================================

test('previewMatrix — equals the crop-local matrix shifted by the crop origin', () => {
  const c = setup(2000, 2000, 1000, 1000, { aspect: aspectRatio(16, 9) }); // crop offset in y
  const s = c.getState();
  // The crop's top-left corner in image space, mapped through previewMatrix, must
  // land exactly at the crop's container position.
  const local = cropLocalMatrix(s);
  const inv = invert(local);
  const [ix, iy] = apply(inv, 0, 0); // image pt under crop's top-left
  const [bx, by] = apply(s.previewMatrix, ix, iy); // back to container space
  assert.ok(near(bx, s.crop.x) && near(by, s.crop.y), `${bx},${by} vs ${s.crop.x},${s.crop.y}`);
});

// ============================================================================
// Guards + lifecycle
// ============================================================================

test('guard — not ready before image/container; no throw, output null', () => {
  const c = createCropper();
  const s = c.getState();
  assert.equal(s.ready, false);
  assert.equal(s.output, null);
  assert.ok(s.previewMatrix.every(Number.isFinite));
  c.zoomTo(3).panBy(50, 50).rotateRight(); // must not throw
  assert.equal(c.getOutputGeometry(), null);
});

test('guard — ready once both image and container are set', () => {
  const c = createCropper({ aspect: 1 });
  c.setImageSize(1000, 1000);
  assert.equal(c.getState().ready, false, 'image alone is not ready');
  c.setContainerSize(500, 500);
  assert.equal(c.getState().ready, true);
  assert.ok(c.getOutputGeometry() !== null);
});

test('lifecycle — getState() is valid synchronously after construction', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const s = c.getState(); // before any microtask
  assert.equal(s.ready, true);
  assert.ok(s.output && near(s.output.width, 1000));
});

test('lifecycle — subscribe receives the deferred initial snapshot', async () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const seen = await new Promise((resolve) => {
    c.subscribe((state) => resolve(state));
  });
  assert.equal(seen.ready, true);
  assert.ok(near(seen.crop.width, 500));
});

test('lifecycle — reset returns to centered cover framing', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1 });
  c.zoomTo(2).panBy(100, 50).rotateRight().flipHorizontal();
  c.reset();
  const s = c.getState();
  assert.ok(near(s.transform.scale, s.zoom.min) && near(s.transform.x, 0) && near(s.transform.y, 0));
  assert.equal(s.transform.rotation, 0);
  assert.equal(s.transform.flippedHorizontally, false);
});

// ============================================================================
// Non-finite poisoning + subscription-surface guards (audit regressions)
// ============================================================================

test('guard — non-finite maxScale does not poison the upper zoom bound', () => {
  // NaN maxScale used to flow verbatim into transform2d (NaN != null is true),
  // leaking zoom.max=NaN / zoom.maxRatio=NaN and disabling the upper clamp so
  // setZoomRatio(100) drove scale to min×100 unbounded. The finite-guard now
  // falls back to the maxZoom-factor cap.
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1, maxScale: NaN });
  const s = c.getState();
  assert.ok(Number.isFinite(s.zoom.max), 'zoom.max stays finite');
  assert.ok(Number.isFinite(s.zoom.maxRatio), 'zoom.maxRatio stays finite');
  assert.ok(Number.isFinite(s.transform.maxScale), 'transform.maxScale stays finite');
  c.setZoomRatio(100);
  const after = c.getState();
  assert.ok(
    near(after.transform.scale, after.zoom.max),
    `scale clamps to the upper bound, got ${after.transform.scale} vs max ${after.zoom.max}`,
  );
});

test('guard — non-positive maxScale falls back like maxZoom (no zero/negative cap)', () => {
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1, maxScale: 0 });
  const s = c.getState();
  assert.ok(s.zoom.max > s.zoom.min, 'upper bound is above the cover floor, not 0');
  assert.ok(Number.isFinite(s.zoom.maxRatio) && s.zoom.maxRatio >= 1);
});

test('guard — Infinity maxZoom falls back to the documented 8, not transform2d default 4', () => {
  // `Infinity > 0` is true, so the old bare guard stored maxZoom=Infinity and
  // passed it as maxZoomFactor:Infinity. transform2d rejects the non-finite
  // factor and silently uses ITS OWN default of 4 — a contradictory boundary
  // verdict (maxZoom<=0 and maxZoom=NaN both fall back to 8, Infinity to 4).
  // Geometry: 1000×1000 crop window over a 2000×1000 image at FILL has
  // coverScale=1, so zoom.max == max(1,coverScale) × maxZoom == maxZoom.
  const c = setup(2000, 1000, 1000, 1000, { aspect: 1, maxZoom: Infinity });
  const s = c.getState();
  assert.ok(Number.isFinite(s.zoom.max), 'zoom.max stays finite');
  assert.ok(
    near(s.zoom.max, 8),
    `Infinity maxZoom falls back to the documented 8, got ${s.zoom.max}`,
  );
  assert.ok(near(s.transform.maxScale, 8), `transform.maxScale follows the 8 fallback, got ${s.transform.maxScale}`);
});

test('guard — on() returns a no-op after destroy and never re-registers a dead handler', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  c.destroy();
  let fired = false;
  const off = c.on('change', () => {
    fired = true;
  });
  assert.equal(typeof off, 'function', 'on() still returns an unsubscribe function');
  c.zoomTo(2); // notify() early-returns when destroyed; the handler must never fire
  assert.equal(fired, false, 'no dead subscription resurrected after destroy');
  off();
});

test('guard — on() rejects a non-function handler with a no-op, mirroring subscribe()', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const off = c.on('change', 'not a function');
  assert.equal(typeof off, 'function', 'on() returns a no-op for a bad handler');
  off();
});

test('guard — Infinity container size is rejected (no Infinity/NaN leaks into state)', () => {
  // `x > 0 ? x : 0` lets Infinity through (Infinity > 0 is true), which fed
  // computeCropRect (Infinity-Infinity)/2 = NaN into crop x/y and previewMatrix,
  // while reporting ready:true. The finite-guard mirrors transform2d: Infinity → 0.
  const c = createCropper({ aspect: 1 });
  c.setImageSize(1000, 1000);
  c.setContainerSize(Infinity, Infinity);
  const s = c.getState();
  assert.equal(s.ready, false, 'Infinity container is not a known size → not ready');
  assert.ok(near(s.container.width, 0) && near(s.container.height, 0), `container ${s.container.width}×${s.container.height}`);
  assert.ok(s.crop.width === 0 || Number.isFinite(s.crop.width), `crop width finite, got ${s.crop.width}`);
  assert.ok(Number.isFinite(s.crop.x) && Number.isFinite(s.crop.y), `crop origin finite, got ${s.crop.x},${s.crop.y}`);
  assert.ok(s.previewMatrix.every(Number.isFinite), `previewMatrix all finite, got ${s.previewMatrix}`);
  assert.equal(s.output, null, 'no output geometry when container is unknown');
});

test('guard — Infinity image size is rejected (source stays null, dims agree with transform)', () => {
  // setImageSize(Infinity,...) used to report ready:true and source:{Infinity,...}
  // while transform2d treated the image as having NO dimensions — the two diverged.
  const c = createCropper({ aspect: 1 });
  c.setContainerSize(500, 500);
  c.setImageSize(Infinity, Infinity);
  const s = c.getState();
  assert.equal(s.ready, false, 'Infinity image is not a known size → not ready');
  assert.equal(s.source, null, 'source stays null, never {Infinity,Infinity}');
  assert.ok(s.previewMatrix.every(Number.isFinite), `previewMatrix all finite, got ${s.previewMatrix}`);
  assert.equal(c.getOutputGeometry(), null, 'no output geometry');
});

test('guard — Infinity container via the constructor option is rejected, not ready', () => {
  const c = createCropper({ aspect: 1, image: { width: 1000, height: 1000 }, container: { width: Infinity, height: Infinity } });
  const s = c.getState();
  assert.equal(s.ready, false);
  assert.ok(near(s.container.width, 0) && near(s.container.height, 0), `container ${s.container.width}×${s.container.height}`);
  assert.ok(s.previewMatrix.every(Number.isFinite));
});

test('shape — unknown CropShape throws TypeError (mirrors transform2d validateFitMode)', () => {
  const c = setup(1600, 900, 1000, 600, { aspect: 1 });
  assert.throws(() => c.setShape('oval'), /Unknown crop shape: oval/);
  // The rejected shape must not have mutated state — still the default RECT.
  assert.equal(c.getState().crop.shape, CropShape.RECT, 'state unchanged after a rejected shape');
});

test('shape — unknown shape in the constructor throws TypeError', () => {
  assert.throws(
    () => createCropper({ shape: 'triangle' }),
    /Unknown crop shape: triangle/,
  );
});

test('shape — null/undefined shape defaults to RECT (documented default, no throw)', () => {
  const fromNull = setup(1600, 900, 1000, 600, { shape: null });
  assert.equal(fromNull.getState().crop.shape, CropShape.RECT);
  const c = setup(1600, 900, 1000, 600, { shape: CropShape.CIRCLE });
  c.setShape(undefined);
  assert.equal(c.getState().crop.shape, CropShape.RECT, 'setShape(undefined) resets to RECT');
});

// ============================================================================
// attachImage / detachImage — element-tracking state (loading/error)
// ============================================================================

// Minimal <img> stub: the engine reads naturalWidth/Height + style and wires
// load/error listeners. fire('load'|'error') replays what the browser would do.
function stubImg(naturalWidth = 0, naturalHeight = 0) {
  const listeners = { load: [], error: [] };
  return {
    naturalWidth,
    naturalHeight,
    style: {},
    addEventListener(type, fn) { (listeners[type] ||= []).push(fn); },
    removeEventListener(type, fn) {
      const arr = listeners[type] || [];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    },
    fire(type, ev) { for (const fn of (listeners[type] || []).slice()) fn(ev); },
  };
}

test('detachImage — a still-loading detach clears loading (cannot outlive the element)', () => {
  const c = createCropper();
  const img = stubImg(0, 0); // not yet loaded → attach sets loading:true
  c.attachImage(img);
  assert.equal(c.getState().loading, true, 'loading while attached + not loaded');
  c.detachImage();
  assert.equal(c.getState().loading, false, 'loading reset on detach — no element behind it');
  assert.equal(c.getState().error, null, 'error stays null');
});

test('detachImage — an errored detach clears error (cannot outlive the element)', () => {
  const c = createCropper();
  const img = stubImg(0, 0);
  c.attachImage(img);
  img.fire('error', new Error('boom')); // load failed → error set, loading cleared
  assert.notEqual(c.getState().error, null, 'error recorded while attached');
  c.detachImage();
  assert.equal(c.getState().error, null, 'error reset on detach — no element behind it');
  assert.equal(c.getState().loading, false, 'loading stays false');
});

test('detachImage — emits a change so subscribers see the cleared state', () => {
  let last = null;
  const c = createCropper({ onChange: (s) => { last = s; } });
  const img = stubImg(0, 0);
  c.attachImage(img);
  last = null; // ignore the attach emission
  c.detachImage();
  assert.notEqual(last, null, 'detach notified subscribers');
  assert.equal(last.loading, false);
  assert.equal(last.error, null);
});

// ============================================================================
// Headless boundary — pure core, canvas isolated, imports only from shared/
// ============================================================================

test('boundary — the pure core imports clean in Node (proven by this file loading)', () => {
  assert.equal(typeof createCropper, 'function');
  assert.equal(typeof CropShape, 'object');
});

test('boundary — core source touches no canvas and no document at module scope', () => {
  const src = readFileSync(fileURLToPath(new URL('./image-cropper-engine.js', import.meta.url)), 'utf8');
  // Strip block + line comments so prose in the header (which discusses canvas/DOM)
  // doesn't trip the scan — only real code is examined.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const tok of ['canvas', 'getContext', 'document', 'OffscreenCanvas']) {
    assert.ok(!code.includes(tok), `core must not reference \`${tok}\` (canvas is the export helper's job)`);
  }
});

test('boundary — core imports ONLY from ../shared/ and never the export helper', () => {
  const src = readFileSync(fileURLToPath(new URL('./image-cropper-engine.js', import.meta.url)), 'utf8');
  const specs = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specs.length > 0, 'has imports');
  for (const s of specs) {
    assert.ok(s.startsWith('../shared/'), `unexpected import ${s}`);
  }
  assert.ok(!specs.includes('./image-cropper-engine-export.js'), 'core never pulls in the canvas helper');
});

// ============================================================================
// attachInput / observe — stale per-call detach must not tear down a LATER call
// ============================================================================

// Minimal surface element: the gesture recognizer's attach() only needs
// add/removeEventListener (+ optional pointer-capture, getBoundingClientRect).
// `listenerCount` lets a test assert whether THIS surface is still wired.
function stubSurface() {
  let listenerCount = 0;
  return {
    addEventListener() { listenerCount++; },
    removeEventListener() { listenerCount--; },
    setPointerCapture() {},
    releasePointerCapture() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }),
    get listenerCount() { return listenerCount; },
  };
}

test('attachInput — a stale detach from a superseded attachInput() is a no-op (does not detach the live surface)', () => {
  const c = setup(400, 300, 200, 200);
  const a = stubSurface();
  const b = stubSurface();

  const off1 = c.attachInput(a);
  assert.ok(a.listenerCount > 0, 'surface A wired after first attach');

  // Re-attach to a new surface: this detaches A and wires B.
  c.attachInput(b);
  assert.equal(a.listenerCount, 0, 'surface A detached by the re-attach');
  const bWired = b.listenerCount;
  assert.ok(bWired > 0, 'surface B wired by the second attach');

  // The stale detach (A is long gone) must NOT touch B's live bindings.
  off1();
  assert.equal(b.listenerCount, bWired, 'stale off1() left surface B fully wired');
});

test('attachInput — the live call\'s own detach still works after a stale detach fired', () => {
  const c = setup(400, 300, 200, 200);
  const a = stubSurface();
  const b = stubSurface();
  const off1 = c.attachInput(a);
  const off2 = c.attachInput(b);
  off1(); // stale, no-op
  assert.ok(b.listenerCount > 0, 'B still wired before its own detach');
  off2(); // the live detach must actually remove B
  assert.equal(b.listenerCount, 0, 'off2() detached surface B');
});

// Minimal ResizeObserver: tracks observed elements and whether it is connected,
// so a test can tell WHICH observer a detach disconnected. Installed on
// globalThis for the duration of the test, then restored.
function withStubResizeObserver(fn) {
  const created = [];
  const Original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = class {
    constructor(cb) { this.cb = cb; this.connected = true; this.observed = []; created.push(this); }
    observe(el) { this.observed.push(el); }
    disconnect() { this.connected = false; }
  };
  try {
    return fn(created);
  } finally {
    if (Original === undefined) delete globalThis.ResizeObserver;
    else globalThis.ResizeObserver = Original;
  }
}

function stubContainer() {
  return { getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200 }) };
}

test('observe — a stale detach from a superseded observe() does not disconnect the LATER observer', () => {
  withStubResizeObserver((created) => {
    const c = setup(400, 300, 200, 200);
    const off1 = c.observe(stubContainer());
    const off2 = c.observe(stubContainer());
    assert.equal(created.length, 2, 'two observers created');
    const [oA, oB] = created;
    assert.equal(oA.connected, false, 'observer A disconnected by the re-observe');
    assert.equal(oB.connected, true, 'observer B is the live one');

    off1(); // stale: A already gone — must NOT disconnect B
    assert.equal(oB.connected, true, 'stale off1() left observer B connected');

    off2(); // the live detach disconnects B
    assert.equal(oB.connected, false, 'off2() disconnected observer B');
  });
});

test('inert-after-destroy — geometry/config mutators do not change state after destroy()', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const before = c.getState();

  c.destroy();

  // Every mutator routes through apply(); after destroy() the body must not run,
  // so the freed transform/config/dimension state stays exactly as it was.
  c.zoomTo(2);
  c.zoomBy(2);
  c.setZoomRatio(3);
  c.panBy(100, 100);
  c.panTo(50, 50);
  c.rotateRight();
  c.rotateLeft();
  c.rotateBy(45);
  c.flipHorizontal();
  c.flipVertical();
  c.reset();
  c.setImageSize(2000, 2000);
  c.setContainerSize(800, 800);
  c.setAspectRatio(aspectRatio(16, 9));
  c.setShape(CropShape.CIRCLE);
  c.setInset(20);

  const after = c.getState();
  assert.equal(after.transform.scale, before.transform.scale, 'scale unchanged after destroy()');
  assert.equal(after.transform.rotation, before.transform.rotation, 'rotation unchanged after destroy()');
  assert.equal(after.transform.x, before.transform.x, 'transform.x unchanged after destroy()');
  assert.equal(after.transform.y, before.transform.y, 'transform.y unchanged after destroy()');
  assert.equal(after.transform.flippedHorizontally, before.transform.flippedHorizontally, 'flippedHorizontally unchanged after destroy()');
  assert.equal(after.transform.flippedVertically, before.transform.flippedVertically, 'flippedVertically unchanged after destroy()');
  assert.equal(after.source.width, before.source.width, 'image width unchanged after destroy()');
  assert.equal(after.source.height, before.source.height, 'image height unchanged after destroy()');
  assert.equal(after.crop.width, before.crop.width, 'crop width unchanged after destroy()');
  assert.equal(after.crop.height, before.crop.height, 'crop height unchanged after destroy()');
  assert.equal(after.crop.shape, before.crop.shape, 'crop shape unchanged after destroy()');
});

// ============================================================================
// Regression: ReDoS guard on the aspect-string parser (finding 1)
// ============================================================================

test('aspect string — pathological long input does not hang (ReDoS guard)', () => {
  // Pre-fix this forced quadratic backtracking; a 50k-char input took ~3.9s.
  // The length guard short-circuits to parseFloat, so it must return fast.
  // (100000 '1' digits parseFloat to Infinity → rejected → free aspect; the
  // point is the call returns promptly rather than hanging the main thread.)
  const evil = '1'.repeat(100000) + 'x';
  const start = Date.now();
  const c = setup(1000, 1000, 500, 500, { aspect: evil });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 200, `aspect parse took ${elapsed}ms (expected < 200ms)`);
  // A >64-char input whose parseFloat is finite (leading zeros) still yields a
  // usable locked ratio via the guard's fallback, not just a fast null.
  const c2 = setup(1000, 1000, 500, 500, { aspect: '0'.repeat(70) + '1.5' });
  assert.ok(near(c2.getState().crop.aspect, 1.5), `guarded finite digit run → ${c2.getState().crop.aspect}`);
});

test('aspect string — long unparseable input returns free (null) ratio without hanging', () => {
  const evil = 'x'.repeat(100000);
  const start = Date.now();
  const c = setup(1000, 1000, 500, 500, { aspect: evil });
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 200, `aspect parse took ${elapsed}ms (expected < 200ms)`);
  assert.equal(c.getState().crop.aspect, null, 'unparseable long string → free aspect');
});

test('aspect string — setAspectRatio is also length-guarded', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1 });
  const start = Date.now();
  c.setAspectRatio('1'.repeat(80000) + ':');
  const elapsed = Date.now() - start;
  assert.ok(elapsed < 200, `setAspectRatio took ${elapsed}ms (expected < 200ms)`);
});

// ============================================================================
// Regression: inset finite-guard rejects Infinity/NaN (finding 2)
// ============================================================================

test('inset — Infinity is rejected like sibling numeric options (constructor)', () => {
  const c = setup(1000, 1000, 500, 500, { inset: Infinity, aspect: 1 });
  const { crop } = c.getState();
  // With inset coerced to 0, the crop fills the container (500×500) instead of
  // collapsing to width/height 0 as it did when Infinity was stored verbatim.
  assert.ok(near(crop.width, 500) && near(crop.height, 500), `${crop.width}×${crop.height}`);
});

test('inset — NaN is rejected (constructor falls back to 0)', () => {
  const c = setup(1000, 1000, 500, 500, { inset: NaN, aspect: 1 });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 500) && near(crop.height, 500), `${crop.width}×${crop.height}`);
});

test('inset — setInset(Infinity) falls back to 0 on the live path', () => {
  const c = setup(1000, 1000, 500, 500, { aspect: 1, inset: 20 });
  c.setInset(Infinity);
  const { crop } = c.getState();
  assert.ok(near(crop.width, 500) && near(crop.height, 500), `${crop.width}×${crop.height}`);
});

test('inset — a finite positive inset still applies', () => {
  const c = setup(1000, 1000, 500, 500, { inset: 50, aspect: 1 });
  const { crop } = c.getState();
  assert.ok(near(crop.width, 400) && near(crop.height, 400), `${crop.width}×${crop.height}`);
});

if (isMain(import.meta.url)) report({ exit: true });
