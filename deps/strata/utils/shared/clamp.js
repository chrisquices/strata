// shared/clamp.js
// The canonical clamp — constrain a value to an inclusive range. The single
// shared copy (previously duplicated in transform2d and the media engine's
// utils.js). Bottom layer: imports nothing.

/** Clamp `value` into the inclusive range [minimum, maximum]. */
export function clamp(value, minimum, maximum) {
  if (value < minimum) return minimum;
  if (value > maximum) return maximum;
  return value;
}
