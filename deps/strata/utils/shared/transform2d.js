// shared/transform2d.js
// Zoom / pan / rotate / flip state for a single image, plus the matrix math and
// bounds clamping that make zoom feel right. A self-contained leaf module: pure,
// no DOM, no external deps — clamp() and the FitMode enum come from core helpers.
// The image renderer consumes it; the future image editor / cropper can consume
// it standalone. It imports cleanly in Node and every method is deterministic,
// so the whole thing is unit-testable.
//
// COORDINATE MODEL (the thing to understand before reading the math)
// ------------------------------------------------------------------
// The engine emits a 2-D affine matrix [a,b,c,d,e,f] meant to be applied to an
// <img> that the consumer has placed at the viewport's top-left (0,0) at its
// NATURAL pixel size, with `transform-origin: 0 0`. The matrix bakes in
// centering, scaling, rotation, flipping and panning, so the consumer needs no
// knowledge of any of it — it writes one `transform: matrix(...)`. The letters
// a–f are kept because they are the CSS `matrix(a, b, c, d, e, f)` spec names.
//
// The transform is the composition (applied right-to-left to a point p):
//
//     M(p) = Translate(viewportCenter + pan) · Rotate(θ) · Scale(±s,±s)
//            · Translate(-imageCenter) · p
//
// i.e. flip/scale the image about its own center, rotate about its center,
// then drop its center at viewportCenter + pan. `scale` is ABSOLUTE: scale 1 is
// 100% native pixels; "fit" is whatever scale makes the (possibly rotated)
// image fit the viewport.
//
// Exports: { createTransform, FitMode }

// clamp() and FitMode are shared, single-source core helpers.
// FitMode is re-exported below so this module's public API is unchanged.
import { clamp } from './clamp.js';
import { FitMode } from './enums.js';

export { FitMode };

const EPSILON = 1e-6;

// Validate a FitMode against the enum, throwing on unknown values — matching the
// repo convention (color/datetime throw TypeError on unknown enum inputs) rather
// than silently falling back to FIT and emitting a garbage fitMode in state.
const FIT_MODE_VALUES = new Set(Object.values(FitMode));
function validateFitMode(mode) {
  if (!FIT_MODE_VALUES.has(mode)) {
    throw new TypeError('Unknown fit mode: ' + mode);
  }
  return mode;
}

// Cosine/sine for the only four legal rotations — exact integers, so rotation
// introduces zero floating-point error into the matrix.
const TRIGONOMETRY_BY_ROTATION = {
  0: { cosine: 1, sine: 0 },
  90: { cosine: 0, sine: 1 },
  180: { cosine: -1, sine: 0 },
  270: { cosine: 0, sine: -1 },
};

/**
 * @param {Object} [options]
 * @param {string} [options.fitMode='fit']        initial fit mode (FitMode.*)
 * @param {number} [options.maxScale]             absolute max scale; overrides the factor
 * @param {number} [options.maxZoomFactor=4]      max = max(1, fitScale) * this, when maxScale absent
 * @param {number} [options.doubleTapScale=1]     scale double-tap zooms TO from fit (1 = 100% native)
 */
export function createTransform(options = {}) {
  const initialFitMode = validateFitMode(options.fitMode || FitMode.FIT);
  // A non-finite/non-positive maxZoomFactor falls back to the default 4.
  // `Number.isFinite` rejects NaN AND Infinity (which `> 0` alone would let
  // through, disabling the zoom cap and poisoning maxScale → Infinity).
  const maxZoomFactor =
    Number.isFinite(options.maxZoomFactor) && options.maxZoomFactor > 0 ? options.maxZoomFactor : 4;
  // A non-finite/non-positive maxScale is treated as absent (fall back to the
  // factor-based cap), mirroring the maxZoomFactor guard above. Without this,
  // maxScale: NaN disables the zoom cap and poisons getState().maxScale.
  const explicitMaxScale =
    Number.isFinite(options.maxScale) && options.maxScale > 0 ? options.maxScale : null;
  const doubleTapScale = options.doubleTapScale != null ? options.doubleTapScale : 1;

  // ---- mutable state ----
  let naturalWidth = 0; // intrinsic image px (0 = dimensions unknown yet)
  let naturalHeight = 0;
  let viewportWidth = 0; // viewport px
  let viewportHeight = 0;
  let scale = 1;
  let panX = 0;
  let panY = 0;
  let rotation = 0; // 0 | 90 | 180 | 270
  let flippedHorizontally = false;
  let flippedVertically = false;
  let fitMode = initialFitMode;

  function hasDimensions() {
    return naturalWidth > 0 && naturalHeight > 0 && viewportWidth > 0 && viewportHeight > 0;
  }

  // Effective natural dimensions after rotation — 90°/270° swap width & height.
  // This single helper is why rotation "just works" in fit and bounds math.
  function naturalSizeAfterRotation() {
    if (rotation === 90 || rotation === 270) {
      return { width: naturalHeight, height: naturalWidth };
    }
    return { width: naturalWidth, height: naturalHeight };
  }

  function fitScaleForMode(mode) {
    if (!hasDimensions()) return 1;
    const { width, height } = naturalSizeAfterRotation();
    const containScale = Math.min(viewportWidth / width, viewportHeight / height);
    const coverScale = Math.max(viewportWidth / width, viewportHeight / height);
    if (mode === FitMode.FILL) return coverScale;
    if (mode === FitMode.FIT_NO_UPSCALE) return Math.min(containScale, 1);
    return containScale; // FitMode.FIT
  }

  function fitScale() {
    return fitScaleForMode(fitMode);
  }

  // The image may never be smaller than its fit scale (no zooming into empty
  // space around it). Max is either an explicit absolute cap or a generous
  // multiple of the larger of "fits the screen" and "100% native".
  //
  // minScale is an UNCONDITIONAL ALIAS of fitScale(): the zoom floor IS the fit
  // point — there is no input, fit mode, rotation, or dimension state under which
  // they differ. It exists as a named accessor for the zoom-floor role (consumers
  // and getState() read `minScale`, not `fitScale`); it is NOT an independent
  // signal that could ever sit below the fit point. getState() therefore emits
  // only `minScale` (see the comment there), mirroring the image-cropper fix.
  function minScale() {
    return fitScale();
  }

  function maxScale() {
    const floor = minScale();
    const cap =
      explicitMaxScale != null ? explicitMaxScale : Math.max(1, fitScale()) * maxZoomFactor;
    return Math.max(cap, floor);
  }

  // Pan is symmetric about center because the image is centered: the half-overhang
  // of the (rotated, scaled) image beyond the viewport on each axis. When the
  // image is smaller than the viewport on an axis, the bound is 0 → locked centered.
  function panBounds() {
    const { width, height } = naturalSizeAfterRotation();
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    return {
      x: Math.max(0, (scaledWidth - viewportWidth) / 2),
      y: Math.max(0, (scaledHeight - viewportHeight) / 2),
    };
  }

  function clampPanToBounds() {
    const bounds = panBounds();
    panX = clamp(panX, -bounds.x, bounds.x);
    panY = clamp(panY, -bounds.y, bounds.y);
  }

  function clampScaleToLimits() {
    scale = clamp(scale, minScale(), maxScale());
  }

  // Was the image sitting (within tolerance) exactly at its fit scale? Used to
  // decide, after a viewport/rotation/dimension change, whether to re-fit
  // (keep it fitted) or merely re-clamp (preserve an explicit zoom). Evaluated
  // against the CURRENT (pre-change) fit, so call it before mutating.
  function isFitted() {
    return Math.abs(scale - fitScale()) <= fitScale() * 1e-4 + EPSILON;
  }

  // Run a mutation that may change the fit basis (dimensions/viewport/rotation),
  // then either re-fit or re-clamp depending on whether we were fitted beforehand.
  function reflow(applyChange) {
    const shouldRefit = isFitted();
    applyChange();
    if (shouldRefit) {
      snapToFit();
    } else {
      clampScaleToLimits();
      clampPanToBounds();
    }
  }

  function snapToFit() {
    scale = fitScale();
    panX = 0;
    panY = 0;
  }

  // ---- matrix ----
  // a,b,c,d,e,f for CSS matrix(), assuming transform-origin: 0 0 and the element
  // at natural size at the viewport origin. Derivation in the header comment.
  function computeMatrix() {
    const { cosine, sine } = TRIGONOMETRY_BY_ROTATION[rotation];
    const scaleX = scale * (flippedHorizontally ? -1 : 1);
    const scaleY = scale * (flippedVertically ? -1 : 1);
    const a = scaleX * cosine;
    const b = scaleX * sine;
    const c = -scaleY * sine;
    const d = scaleY * cosine;
    const imageCenterX = naturalWidth / 2;
    const imageCenterY = naturalHeight / 2;
    const e = viewportWidth / 2 + panX - (a * imageCenterX + c * imageCenterY);
    const f = viewportHeight / 2 + panY - (b * imageCenterX + d * imageCenterY);
    // Normalize signed zero (−0 from e.g. −scaleY·sine where sine is 0) so the
    // emitted matrix stringifies as "0", not "-0". `value === 0` is true for ±0.
    return [a, b, c, d, e, f].map((value) => (value === 0 ? 0 : value));
  }

  return {
    // ---- inputs --------------------------------------------------------------

    /** Set intrinsic image dimensions (e.g. from img.naturalWidth on load). */
    setNaturalSize(width, height) {
      reflow(() => {
        // A finite positive number, else 0. `Number.isFinite` rejects NaN AND
        // Infinity (which `> 0` alone would let through, poisoning the matrix).
        naturalWidth = Number.isFinite(width) && width > 0 ? width : 0;
        naturalHeight = Number.isFinite(height) && height > 0 ? height : 0;
      });
      return this;
    },

    /** Set the viewport (container) dimensions. */
    setViewport(width, height) {
      reflow(() => {
        viewportWidth = Number.isFinite(width) && width > 0 ? width : 0;
        viewportHeight = Number.isFinite(height) && height > 0 ? height : 0;
      });
      return this;
    },

    /** Change fit mode and snap to that mode's fit (the point of changing it). */
    setFitMode(mode) {
      fitMode = validateFitMode(mode);
      snapToFit();
      return this;
    },

    // ---- zoom ----------------------------------------------------------------

    /**
     * Zoom to an absolute scale, keeping the viewport point (anchorX, anchorY)
     * fixed under the cursor / pinch midpoint. Omitting the point zooms about
     * the center. Scale is clamped to [min, max]; pan is re-clamped afterward.
     * Non-finite input (NaN/Infinity) is ignored rather than poisoning state.
     *
     * Math: with u = anchor relative to viewport center and k = newScale/oldScale,
     *   newPan = k·oldPan − (k−1)·u
     * keeps the content under the anchor stationary (see header for the model).
     */
    zoomTo(targetScale, anchorX, anchorY) {
      if (!Number.isFinite(targetScale)) return this;
      const previousScale = scale;
      const newScale = clamp(targetScale, minScale(), maxScale());
      const scaleRatio = previousScale > 0 ? newScale / previousScale : 1;
      const anchorPointX = Number.isFinite(anchorX) ? anchorX : viewportWidth / 2;
      const anchorPointY = Number.isFinite(anchorY) ? anchorY : viewportHeight / 2;
      const anchorOffsetX = anchorPointX - viewportWidth / 2;
      const anchorOffsetY = anchorPointY - viewportHeight / 2;
      panX = scaleRatio * panX - (scaleRatio - 1) * anchorOffsetX;
      panY = scaleRatio * panY - (scaleRatio - 1) * anchorOffsetY;
      scale = newScale;
      clampPanToBounds();
      return this;
    },

    /** Multiply current scale by `factor`, anchored at (anchorX, anchorY). */
    zoomBy(factor, anchorX, anchorY) {
      if (!Number.isFinite(factor)) return this;
      return this.zoomTo(scale * factor, anchorX, anchorY);
    },

    /**
     * The scale a double-tap / double-click at a point should jump to: from fit,
     * zoom in to the configured level (default 100% native); otherwise zoom back
     * to fit. Guards the degenerate case where the configured level is not
     * actually more zoomed than fit (a small image whose fit already upscales
     * past 100%) by falling back to a meaningful zoom-in.
     */
    doubleTapTarget() {
      const fit = fitScale();
      if (!isFitted()) return fit; // currently zoomed → go back to fit
      let target = doubleTapScale;
      if (!(target > fit + EPSILON)) {
        target = Math.min(maxScale(), Math.max(fit * 2, fit + 1));
      }
      return clamp(target, minScale(), maxScale());
    },

    // ---- pan -----------------------------------------------------------------

    /** Translate by (deltaX, deltaY) px, clamped to bounds. Non-finite input is ignored. */
    panBy(deltaX, deltaY) {
      if (!Number.isFinite(deltaX) || !Number.isFinite(deltaY)) return this;
      panX += deltaX;
      panY += deltaY;
      clampPanToBounds();
      return this;
    },

    /** Set the pan offset, clamped to bounds. Non-finite input is ignored. */
    panTo(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y)) return this;
      panX = x;
      panY = y;
      clampPanToBounds();
      return this;
    },

    // ---- rotate / flip -------------------------------------------------------

    /**
     * Rotate by a multiple of 90° (±90 typical; other values round to the
     * nearest step). Re-fits or re-clamps. Non-finite input is ignored —
     * a NaN here used to poison `rotation` and crash the matrix lookup.
     */
    rotateBy(degrees) {
      if (!Number.isFinite(degrees)) return this;
      reflow(() => {
        // Reduce to a quarter-turn count (0..3) BEFORE scaling by 90 so the
        // float spacing of a large finite `degrees` (where Math.round(degrees/90)
        // * 90 is no longer an exact multiple of 90) cannot leak a non-90 residue
        // into `rotation` and break the TRIGONOMETRY_BY_ROTATION lookup.
        const quarterTurns = (((Math.round(degrees / 90) % 4) + 4) % 4);
        rotation = (rotation + quarterTurns * 90) % 360;
      });
      return this;
    },

    rotateLeft() {
      return this.rotateBy(-90);
    },
    rotateRight() {
      return this.rotateBy(90);
    },

    flipHorizontal() {
      flippedHorizontally = !flippedHorizontally;
      clampPanToBounds();
      return this;
    },
    flipVertical() {
      flippedVertically = !flippedVertically;
      clampPanToBounds();
      return this;
    },

    // ---- resets --------------------------------------------------------------

    /** Reset everything: rotation 0, no flips, initial fit mode, fitted, centered. */
    reset() {
      rotation = 0;
      flippedHorizontally = false;
      flippedVertically = false;
      fitMode = initialFitMode;
      snapToFit();
      return this;
    },
    resetZoom() {
      snapToFit();
      return this;
    },
    resetPan() {
      panX = 0;
      panY = 0;
      clampPanToBounds();
      return this;
    },
    resetRotation() {
      reflow(() => {
        rotation = 0;
      });
      return this;
    },
    resetFlip() {
      flippedHorizontally = false;
      flippedVertically = false;
      clampPanToBounds();
      return this;
    },

    // ---- queries -------------------------------------------------------------

    /** True when zoomed beyond the fit level — the gesture module's pan/swipe switch. */
    isZoomed() {
      // Exact complement of isFitted() above the fit point: "zoomed" means NOT
      // sitting at fit (within isFitted's tolerance) and strictly larger than
      // fit. Sharing isFitted()'s single tolerance closes the overlap band where
      // a near-fit scale (e.g. fit 0.5, scale 0.50005) was reported as BOTH
      // fitted and zoomed, giving doubleTapTarget() and the gesture pan/swipe
      // switch contradictory verdicts on the same scale.
      return !isFitted() && scale > fitScale();
    },

    /** Current pan bounds {x, y} (the max |pan| on each axis). */
    getBounds() {
      return panBounds();
    },

    getFitScale() {
      return fitScale();
    },
    getMinScale() {
      return minScale();
    },
    getMaxScale() {
      return maxScale();
    },

    /** Full emitted state, including the ready-to-apply matrix. */
    getState() {
      return {
        scale,
        x: panX,
        y: panY,
        rotation,
        flippedHorizontally,
        flippedVertically,
        fitMode,
        matrix: computeMatrix(),
        // Emit ONLY minScale as the zoom floor. fitScale() and minScale() are
        // byte-for-byte identical for every call (minScale is an unconditional
        // alias of fitScale), so emitting both misled consumers into treating
        // them as independent signals — the floor sitting below the fit point.
        // Dropped fitScale here mirroring image-cropper-engine.js's fix
        // (AUDIT.md: "Emitted transform.fitScale was always identical to
        // minScale (redundant); dropped"). The named accessor getFitScale()
        // remains for callers that want the fit point by that name.
        minScale: minScale(),
        maxScale: maxScale(),
        ready: hasDimensions(),
        bounds: panBounds(),
      };
    },

    /** The `zoom` facet of the renderer's capability descriptor. */
    getZoomCapability() {
      return {
        supported: true,
        min: minScale(),
        max: maxScale(),
        current: scale,
        fitAvailable: !isFitted(),
        ready: hasDimensions(),
      };
    },
  };
}
