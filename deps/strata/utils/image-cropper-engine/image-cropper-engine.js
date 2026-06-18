// image-cropper-engine.js
// A headless image crop + transform engine for uploads (avatars, cover photos,
// product images). The user frames an image — move, zoom, rotate, flip — behind a
// fixed-shape crop window, and the engine produces the exact crop geometry. It is
// the bounded "frame and crop for upload" interaction (the Cropper.js /
// react-easy-crop niche), NOT an image editor: no filters, brushes, text, layers
// or adjustments.
//
// HEADLESS. The engine creates no chrome DOM and ships no CSS. It owns the
// crop/transform geometry and emits state; the CONSUMER renders everything
// visible: the image, the crop frame, drag handles, the shape mask (circle/
// square), the dimmed exterior, and all buttons/sliders. There is no built-in
// cropper UI. The only DOM it ever touches is the image element it is handed (to
// read natural dimensions, and optionally to write the live-preview transform) and
// the optional ResizeObserver/gesture-input conveniences — all confined to method
// bodies, never module scope, so the pure core imports clean in Node.
//
// IT REUSES shared/. The pan/zoom/rotate/flip matrix + bounds math is
// `transform2d`; pinch/wheel/drag recognition is `gestures`. This file is largely
// transform2d + gestures + crop-region logic + output-geometry math. It does NOT
// reinvent any of that.
//
// THE CENTRAL TRICK (why this engine is thin)
// -------------------------------------------
// transform2d already clamps pan/scale so the image covers its *viewport*. So we
// hand transform2d the CROP WINDOW as its viewport and run it in FitMode.FILL:
//   - fitScale(FILL) = cover = the scale at which the image just covers the crop
//     ⇒ minScale = "image just covers the crop" (the coverage floor, for free).
//   - panBounds = the image's half-overhang beyond the crop ⇒ pan can never pull
//     empty space into the crop.
//   - rotation swaps the image's effective outputDimensions and re-clamps (transform2d's
//     reflow) ⇒ coverage re-asserts after every 90° step.
// The COVERAGE INVARIANT — the image always fully covers the crop region — is thus
// inherited from transform2d, not re-derived here.
//
// COORDINATE SPACES (understand these three before the geometry math)
//   1. CONTAINER space — the consumer's stage (containerWidth × containerHeight). The <img>
//      is rendered here; the crop window sits within it. previewMatrix is here.
//   2. CROP-LOCAL space — origin at the crop's top-left, size cropW × cropH. This
//      is transform2d's "viewport". transform2d's matrix M maps image-natural
//      pixels → crop-local.
//   3. IMAGE-NATURAL space — the original image's pixels, [0,naturalWidth]×[0,naturalHeight]. The
//      emitted output geometry (the deliverable) lives here.
//
// THE OUTPUT GEOMETRY (the actual point of the tool) is the source-pixel rectangle
// in image-natural space that is currently framed, plus the orientation to bake
// in. We get it by inverting M (crop-local → image-natural) and mapping the four
// crop corners; their bounding box is the source rect. Because rotation is locked
// to 0/90/180/270, that box is exact (corners map to corners). The pixel draw is
// the separate `image-cropper-engine-export.js` (the only canvas code) — the geometry
// path never needs it.
//
// Exports: { createCropper, CropShape, aspectRatio }

import { createTransform } from '../shared/transform2d.js';
import { createGestureRecognizer } from '../shared/gestures.js';
import { Emitter } from '../shared/emitter.js';
import { clamp } from '../shared/clamp.js';
import { FitMode } from '../shared/enums.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/**
 * Crop window shape. The engine's crop MATH is always the bounding rectangle —
 * SQUARE and CIRCLE only constrain the aspect to 1:1, and CIRCLE additionally
 * sets `round` in the emitted state so the consumer renders a circular mask.
 * There is no non-rectangular pixel cropping (that is a consumer-rendered mask).
 */
export const CropShape = Object.freeze({
  RECT: 'rect',
  SQUARE: 'square',
  CIRCLE: 'circle',
});

// Validate a CropShape against the enum, throwing on unknown values — matching the
// repo convention (color/datetime/transform2d throw TypeError on unknown enum
// inputs) rather than silently storing a bogus shape that effectiveAspect()/isRound()
// then quietly treat as RECT. null/undefined is the documented RECT default.
const SHAPE_VALUES = new Set(Object.values(CropShape));
function validateShape(shape) {
  if (shape == null) return CropShape.RECT;
  if (!SHAPE_VALUES.has(shape)) {
    throw new TypeError('Unknown crop shape: ' + shape);
  }
  return shape;
}

// ============================================================================
// Small pure helpers
// ============================================================================

/** A positive aspect ratio (width/height) from a width and height. `aspectRatio(16,9)`. */
export function aspectRatio(width, height) {
  return width > 0 && height > 0 ? width / height : null;
}

/**
 * Normalize an aspect input to a positive number (width/height) or null (= free / unlocked).
 * Accepts a number, `null`/`'free'`, or a `"width:height"` / `"width/height"` string.
 */
function normalizeAspect(aspect) {
  if (aspect == null || aspect === 'free') return null;
  if (typeof aspect === 'number') {
    return aspect > 0 && Number.isFinite(aspect) ? aspect : null;
  }
  if (typeof aspect === 'string') {
    // Bound the input before matching: the digit groups are ambiguous, so a long
    // run of digits that fails the whole pattern forces super-linear backtracking
    // (ReDoS). Mirror color-engine's token-length guard (color-engine.js:402).
    if (aspect.length > 64) {
      const parsed = parseFloat(aspect);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }
    const match = /^\s*(\d*\.?\d+)\s*[:/]\s*(\d*\.?\d+)\s*$/.exec(aspect);
    if (match) return aspectRatio(parseFloat(match[1]), parseFloat(match[2]));
    const parsed = parseFloat(aspect);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * The largest rectangle of the given aspect that fits inside the container minus
 * its inset, centered. `aspect === null` (free) yields the inset container itself.
 * Pure: container/crop sizing is unit-tested through this.
 * @returns {{x:number,y:number,width:number,height:number}}
 */
function computeCropRect(containerWidth, containerHeight, aspect, inset) {
  const availableWidth = Math.max(0, containerWidth - 2 * inset);
  const availableHeight = Math.max(0, containerHeight - 2 * inset);
  let cropWidth;
  let cropHeight;
  if (aspect == null) {
    cropWidth = availableWidth;
    cropHeight = availableHeight;
  } else if (availableHeight > 0 && availableWidth / availableHeight > aspect) {
    // Container is wider than the target box → the box is height-bound.
    cropHeight = availableHeight;
    cropWidth = cropHeight * aspect;
  } else {
    cropWidth = availableWidth;
    cropHeight = aspect > 0 ? cropWidth / aspect : availableHeight;
    // The width-bound box must still fit the available height: if the derived
    // height overflows it (notably when availableHeight === 0 the height-bound
    // branch above is skipped), re-derive from the height so the inset is
    // honored on BOTH axes instead of spilling past the vertical inset.
    if (aspect > 0 && cropHeight > availableHeight) {
      cropHeight = availableHeight;
      cropWidth = cropHeight * aspect;
    }
  }
  return {
    x: (containerWidth - cropWidth) / 2,
    y: (containerHeight - cropHeight) / 2,
    width: cropWidth,
    height: cropHeight,
  };
}

/** Invert a CSS affine matrix [a,b,c,d,e,f]. Returns null if singular. */
function invertMatrix(matrix) {
  const [a, b, c, d, e, f] = matrix;
  const determinant = a * d - b * c;
  if (Math.abs(determinant) < 1e-12) return null;
  const inverseA = d / determinant;
  const inverseB = -b / determinant;
  const inverseC = -c / determinant;
  const inverseD = a / determinant;
  return [inverseA, inverseB, inverseC, inverseD, (c * f - d * e) / determinant, (b * e - a * f) / determinant];
}

/** Apply a CSS matrix [a,b,c,d,e,f] to a point: (a·x+c·y+e, b·x+d·y+f). */
function applyMatrix(matrix, x, y) {
  return [matrix[0] * x + matrix[2] * y + matrix[4], matrix[1] * x + matrix[3] * y + matrix[5]];
}

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} OutputGeometry  the deliverable: what to cut from the source
 * @property {{x:number,y:number,width:number,height:number}} sourceRect
 *           the rectangle in the ORIGINAL image's pixel space to extract
 * @property {0|90|180|270} rotation  orientation to bake into the output pixels
 * @property {boolean} flippedHorizontally          mirror horizontally when rendering output
 * @property {boolean} flippedVertically          mirror vertically when rendering output
 * @property {number} width           final output width in px (after target/cap)
 * @property {number} height          final output height in px
 * @property {boolean} upscale        output asks for more pixels than the source
 *                                    rect provides (e.g. low-res upload → big avatar)
 */

/**
 * @typedef {Object} CropperState  the full emitted snapshot the consumer renders
 * @property {boolean} ready        image dimensions AND container size are known
 * @property {boolean} loading      an attached image element has not loaded yet
 * @property {*} error              load error, else null
 * @property {{width:number,height:number}|null} source  natural image px
 * @property {{width:number,height:number}} container    the consumer's stage px
 * @property {Object} crop          crop window in CONTAINER space + shape flags
 * @property {Object} transform     raw transform (crop-local): scale/x/y/rotation/flips/min/max
 * @property {number[]} previewMatrix  CONTAINER-space matrix(...) for the <img>
 *                                     (transform-origin 0 0, element at natural size)
 * @property {Object} zoom          { scale, min, max, ratio, maxRatio } for a slider
 * @property {OutputGeometry|null} output  the deliverable geometry (null until ready)
 */

// ============================================================================
// createCropper
// ============================================================================

/**
 * Create a headless image cropper.
 *
 * @param {Object} [options]
 * @param {{width:number,height:number}} [options.container]  initial stage size
 * @param {{width:number,height:number}} [options.image]      initial natural image size
 * @param {number|string|null} [options.aspect=1]   crop aspect (width/height), `"16:9"`, or null/`'free'`
 * @param {string} [options.shape='rect']           CropShape; square/circle force aspect 1
 * @param {number} [options.inset=0]                px margin between crop window and stage edge
 * @param {number} [options.maxZoom=8]              max scale = max(1, coverScale) × this
 * @param {number} [options.maxScale]               absolute max scale (overrides maxZoom)
 * @param {{width?:number,height?:number,maxDimension?:number}} [options.output]
 *           target output sizing; default is the framed source rect's own resolution
 * @param {(state: CropperState) => void} [options.onChange]  called with state on every change
 * @returns {Object} the cropper instance
 */
export function createCropper(options = {}) {
  const config = {
    aspect: normalizeAspect(options.aspect === undefined ? 1 : options.aspect),
    shape: validateShape(options.shape),
    inset: Number.isFinite(options.inset) && options.inset > 0 ? options.inset : 0,
    maxZoom: Number.isFinite(options.maxZoom) && options.maxZoom > 0 ? options.maxZoom : 8,
    maxScale: Number.isFinite(options.maxScale) && options.maxScale > 0 ? options.maxScale : undefined,
    output: {
      width:
        options.output && Number.isFinite(options.output.width) && options.output.width > 0
          ? options.output.width
          : null,
      height:
        options.output && Number.isFinite(options.output.height) && options.output.height > 0
          ? options.output.height
          : null,
      maxDimension:
        options.output &&
        Number.isFinite(options.output.maxDimension) &&
        options.output.maxDimension > 0
          ? options.output.maxDimension
          : null,
    },
  };

  // transform2d runs with the CROP WINDOW as its viewport and FILL fit, so its
  // minScale is the coverage floor and its pan bounds keep the crop covered.
  const transform = createTransform({
    fitMode: FitMode.FILL,
    maxScale: config.maxScale,
    maxZoomFactor: config.maxZoom,
  });

  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;

  // A finite positive dimension, else 0. `Number.isFinite` rejects NaN AND Infinity
  // (which `> 0` alone would let through — `Infinity > 0` is true). transform2d
  // guards its own setNaturalSize/setViewport identically; mirroring it here keeps
  // the engine's local dims, hasDims()/ready, crop, source and previewMatrix
  // consistent with the transform basis instead of leaking Infinity/NaN.
  const finiteDim = (value) => (Number.isFinite(value) && value > 0 ? value : 0);

  // ---- mutable state ----
  let containerWidth = options.container ? finiteDim(options.container.width) : 0;
  let containerHeight = options.container ? finiteDim(options.container.height) : 0;
  let naturalWidth = options.image ? finiteDim(options.image.width) : 0;
  let naturalHeight = options.image ? finiteDim(options.image.height) : 0;
  let crop = { x: 0, y: 0, width: 0, height: 0 };

  let element = null; // attached <img>, when the consumer uses attachImage()
  let loading = false;
  let error = null;
  let destroyed = false;

  // DOM teardown handles (all created lazily inside methods, never module scope).
  let detachElementLoad = null;
  let recognizer = null;
  let removeInputBindings = null;
  let resizeObserver = null;
  let surfaceRect = { left: 0, top: 0 };

  if (naturalWidth > 0) transform.setNaturalSize(naturalWidth, naturalHeight);

  // ---- derived geometry ----

  const hasDims = () => naturalWidth > 0 && naturalHeight > 0 && containerWidth > 0 && containerHeight > 0;

  /** Effective aspect: square/circle force 1; otherwise the configured aspect (or null=free). */
  function effectiveAspect() {
    if (config.shape === CropShape.SQUARE || config.shape === CropShape.CIRCLE) return 1;
    return config.aspect;
  }

  const isRound = () => config.shape === CropShape.CIRCLE;

  /** Recompute the crop window and push it to transform2d as the viewport. */
  function recomputeCrop() {
    crop = computeCropRect(containerWidth, containerHeight, effectiveAspect(), config.inset);
    transform.setViewport(crop.width, crop.height);
  }
  recomputeCrop();

  /**
   * The output geometry: invert the crop-local matrix, map the four crop corners
   * back into image-natural space, take their (exact, axis-aligned) bounding box,
   * and size the output. Returns null until both image and container are known.
   * @returns {OutputGeometry|null}
   */
  function computeOutput() {
    if (!hasDims()) return null;
    const transformState = transform.getState();
    const inverseMatrix = invertMatrix(transformState.matrix);
    if (!inverseMatrix) return null;

    // Four crop corners in crop-local space → image-natural space. Clamp each into
    // the image bounds: the coverage invariant guarantees they are inside, so this
    // only trims sub-pixel float dust (and never distorts the axis-aligned rect).
    const corners = [
      [0, 0],
      [crop.width, 0],
      [crop.width, crop.height],
      [0, crop.height],
    ].map(([cropCornerX, cropCornerY]) => {
      const [imageX, imageY] = applyMatrix(inverseMatrix, cropCornerX, cropCornerY);
      return [clamp(imageX, 0, naturalWidth), clamp(imageY, 0, naturalHeight)];
    });

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y] of corners) {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const sourceRect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };

    // Base (no-upscale) output = the source rect's footprint, ORIENTED to the crop:
    // a 90°/270° rotation swaps which source edge maps to the output width. This is
    // always crop-aspect, and is the most pixels available without enlarging.
    const swap = transformState.rotation === 90 || transformState.rotation === 270;
    const baseWidth = swap ? sourceRect.height : sourceRect.width;
    const baseHeight = swap ? sourceRect.width : sourceRect.height;

    const outputDimensions = resolveOutputDims(baseWidth, baseHeight);
    return {
      sourceRect,
      rotation: transformState.rotation,
      flippedHorizontally: transformState.flippedHorizontally,
      flippedVertically: transformState.flippedVertically,
      width: outputDimensions.width,
      height: outputDimensions.height,
      upscale: outputDimensions.width > baseWidth + 0.5 || outputDimensions.height > baseHeight + 0.5,
    };
  }

  /**
   * Resolve final output dimensions from the base (source-rect) footprint and the
   * configured target. Output aspect always follows the base (= crop) aspect unless
   * the consumer pins BOTH width and height. A max-dimension cap scales down last.
   */
  function resolveOutputDims(baseWidth, baseHeight) {
    const { width: targetWidth, height: targetHeight, maxDimension } = config.output;
    let width;
    let height;
    if (targetWidth && targetHeight) {
      width = targetWidth;
      height = targetHeight;
    } else if (targetWidth) {
      width = targetWidth;
      // The proportional derivation overflows to Infinity when targetWidth is on
      // the order of MAX_VALUE / cropAspect; fall back to the base footprint so a
      // non-finite value never reaches the cap (where maxDimension/Infinity * Infinity
      // would be NaN) or the emitted geometry.
      const derived = targetWidth * (baseHeight / baseWidth);
      height = baseWidth > 0 && Number.isFinite(derived) ? derived : 0;
    } else if (targetHeight) {
      height = targetHeight;
      const derived = targetHeight * (baseWidth / baseHeight);
      width = baseHeight > 0 && Number.isFinite(derived) ? derived : 0;
    } else {
      width = baseWidth;
      height = baseHeight;
    }
    if (maxDimension && Math.max(width, height) > maxDimension) {
      const scaleDownFactor = maxDimension / Math.max(width, height);
      width *= scaleDownFactor;
      height *= scaleDownFactor;
    }
    return { width: Math.max(1, Math.round(width)), height: Math.max(1, Math.round(height)) };
  }

  /** Container-space matrix for the <img>: the crop-local matrix shifted by crop origin. */
  function previewMatrix() {
    const matrix = transform.getState().matrix;
    return [matrix[0], matrix[1], matrix[2], matrix[3], matrix[4] + crop.x, matrix[5] + crop.y];
  }

  // ---- state emission ----

  function buildState() {
    const transformState = transform.getState();
    const min = transformState.minScale;
    const max = transformState.maxScale;
    return {
      ready: hasDims(),
      loading,
      error,
      source: naturalWidth > 0 && naturalHeight > 0 ? { width: naturalWidth, height: naturalHeight } : null,
      container: { width: containerWidth, height: containerHeight },
      crop: {
        x: crop.x,
        y: crop.y,
        width: crop.width,
        height: crop.height,
        shape: config.shape,
        round: isRound(),
        aspect: effectiveAspect(),
      },
      transform: {
        scale: transformState.scale,
        x: transformState.x,
        y: transformState.y,
        rotation: transformState.rotation,
        flippedHorizontally: transformState.flippedHorizontally,
        flippedVertically: transformState.flippedVertically,
        minScale: min,
        maxScale: max,
      },
      previewMatrix: previewMatrix(),
      zoom: {
        scale: transformState.scale,
        min,
        max,
        ratio: min > 0 ? transformState.scale / min : 1,
        maxRatio: min > 0 ? max / min : 1,
      },
      output: computeOutput(),
    };
  }

  function notify() {
    if (destroyed) return;
    // Write the live-preview transform to the attached element (geometry only),
    // mirroring media-engine's image renderer. Consumers that pass dimensions via
    // setImageSize() instead read previewMatrix from the state and apply it themselves.
    if (element) {
      element.style.transformOrigin = '0 0';
      element.style.transform = `matrix(${previewMatrix().join(',')})`;
    }
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }

  /** Run a mutation, then repaint + emit. The single write path. */
  function apply(mutation) {
    if (destroyed) return instance;
    mutation();
    notify();
    return instance;
  }

  // Convert a client/container point to CROP-LOCAL coordinates for zoom anchoring.
  // The gesture surface is the container; the crop sits at (crop.x, crop.y) in it.
  const toCropLocal = (clientX, clientY) => ({
    x: clientX - surfaceRect.left - crop.x,
    y: clientY - surfaceRect.top - crop.y,
  });

  // ============================================================================
  // Public surface
  // ============================================================================

  const instance = {
    // ---- inputs: image -------------------------------------------------------

    /**
     * Set the source image's natural pixel dimensions directly. The pure,
     * DOM-free path — used by headless consumers and the test suite.
     */
    setImageSize(width, height) {
      return apply(() => {
        naturalWidth = finiteDim(width);
        naturalHeight = finiteDim(height);
        transform.setNaturalSize(naturalWidth, naturalHeight);
        recomputeCrop();
      });
    },

    /**
     * Hand the engine a loaded (or loading) <img>. Reads naturalWidth/Height now or
     * on load, wires error state, and (until detached) writes the live-preview
     * transform onto the element. DOM access is confined to this method.
     * @param {HTMLImageElement} imageElement
     */
    attachImage(imageElement) {
      if (destroyed || !imageElement) return instance;
      this.detachImage();
      element = imageElement;
      imageElement.style.transformOrigin = '0 0';
      // (The old `|| (imageElement.complete && imageElement.naturalWidth)` here was dead: any image
      // with naturalWidth > 0 already satisfies the first check.)
      if (imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0) {
        loading = false;
        error = null;
        return this.setImageSize(imageElement.naturalWidth, imageElement.naturalHeight);
      }
      loading = true;
      error = null;
      const handleImageLoad = () => {
        loading = false;
        error = null;
        this.setImageSize(imageElement.naturalWidth, imageElement.naturalHeight);
      };
      const handleImageError = (e) => {
        loading = false;
        error = e || new Error('image load failed');
        notify();
      };
      imageElement.addEventListener('load', handleImageLoad);
      imageElement.addEventListener('error', handleImageError);
      detachElementLoad = () => {
        imageElement.removeEventListener('load', handleImageLoad);
        imageElement.removeEventListener('error', handleImageError);
      };
      notify();
      return instance;
    },

    /** Stop tracking the attached element (keeps the geometry/transform state). */
    detachImage() {
      if (detachElementLoad) {
        detachElementLoad();
        detachElementLoad = null;
      }
      element = null;
      // loading/error describe an attached element; with none, they cannot hold.
      // Clear them (single write path) so a still-loading or errored detach can't
      // leave state.loading:true / state.error non-null with no element behind it.
      loading = false;
      error = null;
      notify();
      return instance;
    },

    // ---- inputs: container / crop --------------------------------------------

    /** Set the stage (container) size; recomputes the crop window and re-clamps. */
    setContainerSize(width, height) {
      return apply(() => {
        containerWidth = finiteDim(width);
        containerHeight = finiteDim(height);
        recomputeCrop();
      });
    },

    /**
     * Set the crop aspect ratio: a number (width/height), a `"16:9"`/`"3/2"` string, or
     * null/`'free'` to unlock it. Reshapes the crop window and re-clamps so the
     * coverage invariant still holds. Ignored under SQUARE/CIRCLE (forced 1:1).
     */
    setAspectRatio(aspect) {
      return apply(() => {
        config.aspect = normalizeAspect(aspect);
        recomputeCrop();
      });
    },

    /** Set the crop shape (CropShape). SQUARE/CIRCLE force a 1:1 crop. */
    setShape(shape) {
      const validated = validateShape(shape);
      return apply(() => {
        config.shape = validated;
        recomputeCrop();
      });
    },

    /** Set the inset (px) between the crop window and the stage edge. */
    setInset(inset) {
      return apply(() => {
        config.inset = Number.isFinite(inset) && inset > 0 ? inset : 0;
        recomputeCrop();
      });
    },

    /** Update the output-size target ({ width, height, maxDimension }). */
    setOutput(outputTarget = {}) {
      // Mirror the constructor's tolerance for a null/absent output object
      // (lines 224-239 gate every read behind `options.output && ...`): an
      // explicit null slips past the `= {}` default, so normalize it here
      // before reading .width/.height/.maxDimension. setOutput(null) thus
      // clears the target to all-null instead of throwing on a null read.
      const target = outputTarget || {};
      return apply(() => {
        config.output = {
          width:
            Number.isFinite(target.width) && target.width > 0 ? target.width : null,
          height:
            Number.isFinite(target.height) && target.height > 0 ? target.height : null,
          maxDimension:
            Number.isFinite(target.maxDimension) && target.maxDimension > 0
              ? target.maxDimension
              : null,
        };
      });
    },

    // ---- zoom ----------------------------------------------------------------

    /** Zoom to an absolute scale, anchored at crop-local (anchorX, anchorY) (default center). */
    zoomTo(scale, anchorX, anchorY) {
      return apply(() => transform.zoomTo(scale, anchorX, anchorY));
    },

    /** Multiply the current scale by `factor`, anchored at crop-local (anchorX, anchorY). */
    zoomBy(factor, anchorX, anchorY) {
      return apply(() => transform.zoomBy(factor, anchorX, anchorY));
    },

    /**
     * Zoom by a RATIO relative to the coverage floor: 1 = just-covers (min), 2 =
     * twice that, etc. The natural unit for a consumer's zoom slider.
     */
    setZoomRatio(ratio, anchorX, anchorY) {
      return apply(() => transform.zoomTo(transform.getMinScale() * Math.max(0, ratio), anchorX, anchorY));
    },

    // ---- pan -----------------------------------------------------------------

    /** Pan the image by (dx, dy) px, clamped so the crop stays covered. */
    panBy(dx, dy) {
      return apply(() => transform.panBy(dx, dy));
    },

    /** Set the pan offset, clamped so the crop stays covered. */
    panTo(x, y) {
      return apply(() => transform.panTo(x, y));
    },

    // ---- orientation ---------------------------------------------------------

    /** Rotate left 90°; coverage and bounds recompute. */
    rotateLeft() {
      return apply(() => transform.rotateLeft());
    },

    /** Rotate right 90°; coverage and bounds recompute. */
    rotateRight() {
      return apply(() => transform.rotateRight());
    },

    /** Rotate by a multiple of 90°. */
    rotateBy(degrees) {
      return apply(() => transform.rotateBy(degrees));
    },

    flipHorizontal() {
      return apply(() => transform.flipHorizontal());
    },

    flipVertical() {
      return apply(() => transform.flipVertical());
    },

    /** Re-center to the default framing: cover scale, centered, rotation 0, no flips. */
    reset() {
      return apply(() => transform.reset());
    },

    // ---- queries -------------------------------------------------------------

    /** The full emitted snapshot. Valid synchronously after construction. */
    getState() {
      return buildState();
    },

    /**
     * The deliverable: the source-pixel rectangle (original image space) + the
     * orientation + the final output dimensions for what is currently framed.
     * Pure — feed it to `image-cropper-engine-export.js`, a server, or your own canvas.
     * @returns {OutputGeometry|null}
     */
    getOutputGeometry() {
      return computeOutput();
    },

    /** Container-space matrix(...) to apply to the <img> (transform-origin 0 0). */
    getPreviewMatrix() {
      return previewMatrix();
    },

    // ---- subscription --------------------------------------------------------

    /** Subscribe to state snapshots. Returns an unsubscribe function. */
    subscribe(callback) {
      if (typeof callback !== 'function' || destroyed) return () => {};
      return emitter.on('change', callback);
    },

    /** Lower-level event subscription (currently only `'change'`). */
    on(eventName, handler) {
      if (typeof handler !== 'function' || destroyed) return () => {};
      return emitter.on(eventName, handler);
    },

    // ---- DOM conveniences (optional; all DOM confined here) -------------------

    /**
     * Wire pinch/wheel/drag input on a surface element (the container) to pan/zoom,
     * reusing shared/gestures. One-finger drag always pans (a cropper has no
     * swipe-to-navigate), pinch and wheel zoom anchored at the gesture point, and
     * double-tap toggles zoom. Returns a detach function; also stored for destroy().
     * @param {HTMLElement} surface
     */
    attachInput(surface) {
      if (destroyed || !surface) return () => {};
      this.detachInput();
      // isZoomed:true forces gestures' rule 1 (drag → pan) always: no nav/dismiss.
      recognizer = createGestureRecognizer({ isZoomed: () => true });
      const measure = () => {
        const rect = surface.getBoundingClientRect();
        surfaceRect = { left: rect.left, top: rect.top };
      };
      recognizer.on('panstart', measure);
      recognizer.on('pinchstart', measure);
      recognizer.on('pan', ({ deltaX, deltaY }) => this.panBy(deltaX, deltaY));
      recognizer.on('pinch', ({ scaleDelta, deltaX, deltaY, centerX, centerY }) => {
        const point = toCropLocal(centerX, centerY);
        apply(() => {
          transform.zoomBy(scaleDelta, point.x, point.y);
          transform.panBy(deltaX, deltaY);
        });
      });
      recognizer.on('wheelzoom', ({ factor, x, y }) => {
        measure();
        const point = toCropLocal(x, y);
        this.zoomBy(factor, point.x, point.y);
      });
      recognizer.on('doubletap', ({ x, y }) => {
        measure();
        const point = toCropLocal(x, y);
        this.zoomTo(transform.doubleTapTarget(), point.x, point.y);
      });
      measure();
      const detachDomListeners = recognizer.attach(surface);
      // Idempotent: callable via the returned function AND instance.detachInput()
      // (destroy() uses the latter) in either order without double-teardown.
      removeInputBindings = () => {
        removeInputBindings = null;
        detachDomListeners();
        if (recognizer) recognizer.reset();
        recognizer = null;
      };
      // Capture THIS call's teardown so a stale detach from a superseded
      // attachInput() is a true no-op: only run it while it is still the active
      // binding (a later attachInput() replaces removeInputBindings).
      const myTeardown = removeInputBindings;
      return () => {
        if (removeInputBindings === myTeardown) removeInputBindings();
      };
    },

    detachInput() {
      if (removeInputBindings) removeInputBindings();
      return instance;
    },

    /**
     * Observe a container element's size with a ResizeObserver, keeping the crop
     * window and clamp in sync. Returns a detach function. DOM confined here.
     * @param {HTMLElement} containerElement
     */
    observe(containerElement) {
      if (destroyed || !containerElement || typeof ResizeObserver === 'undefined') return () => {};
      this.unobserve();
      const sync = () => {
        const rect = containerElement.getBoundingClientRect();
        surfaceRect = { left: rect.left, top: rect.top };
        this.setContainerSize(rect.width, rect.height);
      };
      resizeObserver = new ResizeObserver(sync);
      resizeObserver.observe(containerElement);
      sync();
      // Capture THIS call's observer so a stale detach from a superseded
      // observe() does not disconnect a later observe()'s observer: only
      // unobserve while ours is still the active one.
      const myObserver = resizeObserver;
      return () => {
        if (resizeObserver === myObserver) this.unobserve();
      };
    },

    unobserve() {
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      return instance;
    },

    /** Tear everything down: detach input/observer/element and clear subscribers. */
    destroy() {
      if (destroyed) return;
      destroyed = true;
      this.detachInput();
      this.unobserve();
      this.detachImage();
      emitter.clear();
    },
  };

  // Emit the initial state once after construction — deferred a microtask so a
  // synchronous subscribe() right after creation still receives it (as the other
  // engines do).
  queueMicrotask(() => {
    if (!destroyed) notify();
  });

  return instance;
}
