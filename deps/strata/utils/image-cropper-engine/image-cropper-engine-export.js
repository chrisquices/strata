// image-cropper-engine-export.js
// The optional convenience that turns image-cropper-engine's emitted OUTPUT GEOMETRY into
// actual pixels — a canvas draw returning a Blob, a data URL, or the canvas itself.
//
// This is the ONLY place the cropper touches a canvas, deliberately kept in its own
// file so the pure core (`image-cropper-engine.js`) never imports canvas code and stays
// importable in Node. The geometry path works without ever calling this — a
// consumer can take `cropper.getOutputGeometry()` and draw it however they like, or
// send the numbers to a server. This helper just spares the consumer who wants the
// draw done for them.
//
// It depends on nothing — not even shared/. You give it (a) a drawable source image
// and (b) the geometry the core emitted; it bakes the rotation/flip into the output
// pixels (the output is the TRANSFORMED crop, not the original orientation) at the
// geometry's target size.
//
// Exports: { cropToCanvas, cropToBlob, cropToDataURL }

/**
 * A source the canvas 2D context can draw: a loaded <img>, an ImageBitmap, a
 * <canvas>/OffscreenCanvas, or a <video> frame.
 * @typedef {CanvasImageSource} DrawableSource
 */

const DEGREES_TO_RADIANS = Math.PI / 180;

// Safety cap on the output canvas. Image dimensions cross a trust boundary in an
// upload flow — a "dimension bomb" (a tiny file declaring e.g. 30000×30000 px)
// would otherwise make us allocate gigabytes here, and canvases past the browser's
// per-side limit (~16384 in Chrome/Firefox, less on iOS) silently fail to draw.
// Oversized requests are scaled down proportionally to this per-side cap.
// Override with options.maxDimension (Infinity disables the cap entirely).
const DEFAULT_MAX_DIMENSION = 8192;

/**
 * Draw the framed crop into a canvas, baking in rotation + flips at the target
 * output size. The single source of truth the Blob/DataURL helpers build on.
 *
 * @param {DrawableSource} image  the ORIGINAL source image (full, untransformed)
 * @param {import('./image-cropper-engine.js').OutputGeometry} geometry
 *        from `cropper.getOutputGeometry()`
 * @param {Object} [options]
 * @param {number} [options.width]   override output width (default geometry.width)
 * @param {number} [options.height]  override output height (default geometry.height)
 * @param {number} [options.maxDimension=8192]  per-side cap on the output canvas;
 *        larger requests are scaled down proportionally (pass Infinity to disable)
 * @param {string} [options.background]  fill color drawn under the crop (e.g. for
 *        JPEG, which has no alpha). Omit to keep transparency (PNG/WebP).
 * @param {HTMLCanvasElement|OffscreenCanvas} [options.canvas]  reuse a canvas
 * @returns {HTMLCanvasElement|OffscreenCanvas}
 */
export function cropToCanvas(image, geometry, options = {}) {
  if (!geometry || !geometry.sourceRect) {
    throw new TypeError('cropToCanvas: geometry with a sourceRect is required');
  }
  const maxDimension =
    options.maxDimension > 0 ? options.maxDimension : DEFAULT_MAX_DIMENSION;
  // A non-finite requested dimension (Infinity/NaN — e.g. leaked from
  // geometry.width or passed via options) must collapse to the cap, NOT slip
  // through. `Math.round(Infinity)` is Infinity and `Infinity * (cap/Infinity)`
  // is NaN, which `canvas.width` coerces to 0 — so the dimension-bomb cap below
  // would be silently bypassed. Clamp to a finite cap first.
  let outputWidth = resolveRequestedDimension(options.width || geometry.width, maxDimension);
  let outputHeight = resolveRequestedDimension(options.height || geometry.height, maxDimension);

  const largestSide = Math.max(outputWidth, outputHeight);
  if (largestSide > maxDimension) {
    const scaleDown = maxDimension / largestSide;
    outputWidth = Math.max(1, Math.round(outputWidth * scaleDown));
    outputHeight = Math.max(1, Math.round(outputHeight * scaleDown));
  }

  const { sourceRect, rotation = 0 } = geometry;
  const flippedHorizontally = !!geometry.flippedHorizontally;
  const flippedVertically = !!geometry.flippedVertically;

  const canvas = options.canvas || createCanvas(outputWidth, outputHeight);
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext('2d');
  context.save();
  context.clearRect(0, 0, outputWidth, outputHeight);
  if (options.background) {
    context.fillStyle = options.background;
    context.fillRect(0, 0, outputWidth, outputHeight);
  }
  context.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in context) context.imageSmoothingQuality = 'high';

  // Compose, working in the output's center: translate → rotate → flip → draw.
  // A drawn point goes T·R·S(point), so the flip is applied in the image's own
  // frame and the rotation on top — exactly transform2d's Rotate·Scale(±) order,
  // so the exported pixels match the live preview's orientation.
  context.translate(outputWidth / 2, outputHeight / 2);
  if (rotation) context.rotate(rotation * DEGREES_TO_RADIANS);
  if (flippedHorizontally || flippedVertically) {
    context.scale(flippedHorizontally ? -1 : 1, flippedVertically ? -1 : 1);
  }

  // A 90°/270° rotation swaps which output edge the destination spans before the
  // rotate, so the source rect lands filling outputWidth×outputHeight after it.
  const rotationSwapsAxes = rotation === 90 || rotation === 270;
  const destinationWidth = rotationSwapsAxes ? outputHeight : outputWidth;
  const destinationHeight = rotationSwapsAxes ? outputWidth : outputHeight;
  context.drawImage(
    image,
    sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height,
    -destinationWidth / 2, -destinationHeight / 2, destinationWidth, destinationHeight,
  );
  context.restore();
  return canvas;
}

/**
 * Render the crop and resolve to a Blob (async; uses canvas.toBlob/convertToBlob).
 *
 * @param {DrawableSource} image
 * @param {import('./image-cropper-engine.js').OutputGeometry} geometry
 * @param {Object} [options]
 * @param {string} [options.type='image/png']  'image/png' | 'image/jpeg' | 'image/webp'
 * @param {number} [options.quality]  0..1 for lossy types
 * @param {number} [options.width]   override output width
 * @param {number} [options.height]  override output height
 * @param {number} [options.maxDimension]  per-side cap (see cropToCanvas)
 * @param {string} [options.background]  fill under the crop (recommended for JPEG)
 * @returns {Promise<Blob>}
 */
export function cropToBlob(image, geometry, options = {}) {
  const type = options.type || 'image/png';
  const quality = options.quality;
  // JPEG has no alpha; default a white backing so transparent areas aren't black.
  const background =
    options.background !== undefined
      ? options.background
      : type === 'image/jpeg'
        ? '#ffffff'
        : undefined;
  const canvas = cropToCanvas(image, geometry, { ...options, background });

  // OffscreenCanvas exposes convertToBlob; HTMLCanvasElement exposes toBlob.
  if (typeof canvas.convertToBlob === 'function') {
    return canvas.convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas.toBlob produced no blob'))),
      type,
      quality,
    );
  });
}

/**
 * Render the crop and return a data URL (sync; uses canvas.toDataURL). Note:
 * OffscreenCanvas has no toDataURL — pass an HTMLCanvasElement via options.canvas,
 * or use cropToBlob there.
 *
 * @param {DrawableSource} image
 * @param {import('./image-cropper-engine.js').OutputGeometry} geometry
 * @param {Object} [options]  same as cropToBlob's type/quality/width/height/background
 * @returns {string}
 */
export function cropToDataURL(image, geometry, options = {}) {
  const type = options.type || 'image/png';
  const background =
    options.background !== undefined
      ? options.background
      : type === 'image/jpeg'
        ? '#ffffff'
        : undefined;
  const canvas = cropToCanvas(image, geometry, { ...options, background });
  if (typeof canvas.toDataURL !== 'function') {
    throw new Error('cropToDataURL needs an HTMLCanvasElement (OffscreenCanvas has no toDataURL)');
  }
  return canvas.toDataURL(type, options.quality);
}

// Round a requested output side to a positive integer, collapsing a non-finite
// request (Infinity/NaN) to `maxDimension` so the per-side cap can never be
// defeated by `Infinity * 0 === NaN` (which `canvas.width` would coerce to 0).
function resolveRequestedDimension(value, maxDimension) {
  if (!Number.isFinite(value)) {
    value = Number.isFinite(maxDimension) ? maxDimension : DEFAULT_MAX_DIMENSION;
  }
  return Math.max(1, Math.round(value));
}

/** Make a canvas, preferring OffscreenCanvas when there is no document (worker/headless). */
function createCanvas(width, height) {
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  throw new Error('no canvas implementation available in this environment');
}
