// shared/enums.js
// Canonical shared frozen enums. These string VALUES cross module boundaries at
// runtime (a gesture's Axis, a transform's FitMode are compared in more than one
// module), so there must be exactly one source of truth — a value mismatch would
// silently break things. Consolidated here from the former duplicates (Axis in
// gestures and the media engine's old types.js; FitMode in transform2d and that
// same old file); the values are unchanged. Frozen so a typo is a missing-property
// error, not a silent mismatch. Bottom layer: imports nothing.

/** Axis a not-zoomed drag locked onto. */
export const Axis = Object.freeze({
  NONE: 'none',
  HORIZONTAL: 'horizontal',
  VERTICAL: 'vertical',
});

/**
 * Image fit modes (PhotoSwipe's `imageScaleMethod`):
 *   FIT            — always fit the viewport (may upscale a small image)
 *   FIT_NO_UPSCALE — fit, but never enlarge beyond native pixels
 *   FILL           — fill the viewport, cropping overflow (cover)
 */
export const FitMode = Object.freeze({
  FIT: 'fit',
  FIT_NO_UPSCALE: 'fit-no-upscale',
  FILL: 'fill',
});
