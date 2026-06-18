// color-engine.js
// A headless color engine — pure color math, functions in → values out.
//
// Color-space conversion, parsing/serialization, WCAG contrast, accessible-color
// adjustment, palette/harmony generation, and gradient interpolation. It renders
// nothing: no DOM, no CSS, no UI, no state, no subscription, no lifecycle. It is
// the purest engine in the kit — a set of pure functions over color values. The
// only in-repo dependency is `clamp` from ../shared/ (channel clamping); it imports
// nothing else.
//
// Four ideas keep it honest:
//   1. Pure + stateless. Same input → same output. No internal mutable state, no
//      Emitter, no DOM. An optional `color(...)` wrapper is thin immutable sugar
//      over the functions — the functions are the real API and what tests target.
//   2. Correctness over cleverness. Every operation uses the established, correct
//      algorithm and is done in the RIGHT space: perceptual operations (gradient
//      interpolation, lightness/contrast adjustment, shades) happen in OKLCH /
//      OKLab, NOT naively in sRGB (which gives muddy, dark, hue-skewed results).
//      sRGB↔linear uses the exact sRGB transfer function; linear↔OKLab uses the
//      exact published matrices. The space each op works in is named in its doc.
//   3. Dependency-free. Zero runtime deps beyond shared/clamp. The math is the
//      deliverable — it is implemented here, not pulled from a color library.
//   4. Format-agnostic I/O. Liberal in what it accepts (with/without `#`, 3/4/6/8
//      -digit hex, comma OR space syntax, deg/turn/%/bare units, optional alpha),
//      strict and canonical in what it outputs (lowercase hex, modern CSS by
//      default). Parsing/serialization is deterministic and bounded, so it is in
//      scope.
//
// ── The canonical internal representation ───────────────────────────────────
// Every function passes around ONE object shape — gamma-encoded ("display") sRGB
// with an alpha channel:
//     { r, g, b, a }
//   • r, g, b are sRGB channel values in the range [0, 255] (kept as full-
//     precision floats internally — NOT quantized to 8-bit until you ask for hex
//     or an integer view), so float round-trips through HSL/OKLCH stay tight.
//   • a is alpha in [0, 1] (1 = opaque). Defaults to 1 when a format omits it.
// `parse()` returns this shape; every function accepts EITHER a format string OR
// this object. The `to*` getters return conventional per-format views (rgb in
// 0–255, hsl in 0–360 / 0–100%, oklch L in 0–1, …) for inspection — those views
// are display output, not re-ingestable object input (round-trip via a string or
// `parse()` instead). All perceptual math converts this sRGB hub to linear-light
// and OKLab/OKLCH internally and back.
//
// ── Spaces & references ─────────────────────────────────────────────────────
//   • sRGB ↔ linear: the IEC 61966-2-1 transfer function (0.04045 / 0.0031308
//     breakpoints, 2.4 gamma). For all 8-bit inputs this is identical to WCAG's
//     literal 0.03928 form (no 8-bit channel falls in the gap), so one transfer
//     function serves both color conversion and WCAG luminance.
//   • linear sRGB ↔ OKLab: Björn Ottosson's exact published matrices
//     (https://bottosson.github.io/posts/oklab/). OKLCH is OKLab in cylindrical
//     form (C = √(a²+b²), H = atan2(b, a)).
//   • Out-of-gamut OKLCH is gamut-mapped back into sRGB by reducing chroma
//     (binary search) while preserving L and H — the CSS Color 4 approach — then
//     any residual float dust is clamped. Preserving L keeps shade ramps
//     monotonic. (Documented in §Gamut.)
//
// Exports (functional API is the real one; `color()` is optional sugar):
//   parse, format, toHex,
//   toRgb, toHsl, toHsv, toOklch, toOklab,
//   relativeLuminance, contrast, meetsWCAG, adjustForContrast,
//   perceivedLightness, isLight, isDark, preferredTextColor, composite,
//   mix, lighten, darken, saturate, desaturate, grayscale, rotateHue,
//   shades, tints, harmony, complement,
//   gradient,
//   color, Format, Space, Harmony, WCAGLevel, TextSize

import { clamp } from '../shared/clamp.js';

// ============================================================================
// Enums (engine-specific; frozen so a typo is a missing-property error).
// ============================================================================

/** Serialization targets for format(). 'hex'/'rgb'/'hsl'/'oklch'/'oklab' are
 *  CSS-valid; 'hsv' is a documented non-CSS extension (symmetric with parsing). */
export const Format = Object.freeze({
  HEX: 'hex',
  RGB: 'rgb',
  HSL: 'hsl',
  HSV: 'hsv',
  OKLCH: 'oklch',
  OKLAB: 'oklab',
});

/** Interpolation spaces for mix()/gradient(). OKLCH is the perceptual default. */
export const Space = Object.freeze({
  OKLCH: 'oklch', // perceptual, cylindrical — even, vivid transitions (default)
  OKLAB: 'oklab', // perceptual, Cartesian — no hue logic, safe through gray
  HSL: 'hsl',     // cylindrical sRGB — legacy "rainbow" look
  SRGB: 'srgb',   // gamma sRGB — the classic muddy/dark-midpoint look
  LRGB: 'lrgb',   // linear-light sRGB — better than gamma, can look washed
});

/** Harmony families — hue rotations (in OKLCH) off the base color. */
export const Harmony = Object.freeze({
  COMPLEMENTARY: 'complementary',
  ANALOGOUS: 'analogous',
  TRIADIC: 'triadic',
  SPLIT_COMPLEMENTARY: 'split-complementary',
  TETRADIC: 'tetradic', // rectangle: 0 / 60 / 180 / 240
  SQUARE: 'square',     // 0 / 90 / 180 / 270
});

// The hue offsets (degrees) each harmony rotates the base color by. The base
// (offset 0) is always included first so the returned array is a full palette.
const HARMONY_ANGLES = Object.freeze({
  complementary: [0, 180],
  analogous: [0, 30, -30],
  triadic: [0, 120, 240],
  'split-complementary': [0, 150, 210],
  tetradic: [0, 60, 180, 240],
  square: [0, 90, 180, 270],
});

/** WCAG conformance levels. */
export const WCAGLevel = Object.freeze({ AA: 'AA', AAA: 'AAA' });

/** Text-size class — picks the WCAG threshold (large text gets a lower bar). */
export const TextSize = Object.freeze({ NORMAL: 'normal', LARGE: 'large' });

// ============================================================================
// Constants
// ============================================================================

const DEGREES_TO_RADIANS = Math.PI / 180;
const RADIANS_TO_DEGREES = 180 / Math.PI;

// Chroma at/below this (OKLCH C, whose scale is ~0–0.4) is treated as achromatic
// (gray): hue is undefined and reported as 0, and hue math is skipped so grays
// never produce NaN.
const ACHROMATIC = 1e-4;

// Slack when testing whether linear-derived sRGB channels are inside [0,1].
// Set a touch above float-dust level (~1/4000 of full range) so a channel that
// overshoots the boundary by sub-LSB rounding error — e.g. pure blue serialized
// to a rounded OKLCH string and re-parsed — is treated as in-gamut and simply
// clamped, rather than triggering a full chroma reduction that would wash a
// boundary color toward gray. Genuinely out-of-gamut OKLCH is many LSBs out and
// still reduces.
const GAMUT_EPS = 1e-3;

// WCAG contrast thresholds by level + text size.
const WCAG_THRESHOLDS = Object.freeze({
  normal: { AA: 4.5, AAA: 7 },
  large: { AA: 3, AAA: 4.5 },
});

// ============================================================================
// sRGB transfer function — gamma-encoded sRGB ([0,1]) ↔ linear-light ([0,1]).
// Exact IEC 61966-2-1 form. These are per-channel and may briefly exceed [0,1]
// during gamut work (handled by the caller); the linear branch keeps small
// negatives finite (no NaN), and the power branch only ever sees positive input.
// ============================================================================

/** Gamma-encoded sRGB channel → linear-light. */
function srgbToLinear(channel) {
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

/** Linear-light channel → gamma-encoded sRGB. */
function linearToSrgb(channel) {
  return channel <= 0.0031308 ? 12.92 * channel : 1.055 * channel ** (1 / 2.4) - 0.055;
}

// ============================================================================
// linear sRGB ↔ OKLab — Ottosson's exact matrices (do not "simplify" these).
// ============================================================================

/** Linear sRGB {r,g,b} (each ~[0,1]) → OKLab {L,a,b}. */
function linearToOklab({ r, g, b }) {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

/** OKLab {L,a,b} → linear sRGB {r,g,b} (may be out of [0,1] — gamut-map after). */
function oklabToLinear({ L, a, b }) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  };
}

// ============================================================================
// OKLCH helpers (OKLab in cylindrical form) and gamut mapping.
// ============================================================================

const normalizeDegrees = (h) => ((h % 360) + 360) % 360;

/** OKLCH (L, C, H°) → linear sRGB. */
function oklchToLinear(L, C, H) {
  const hr = H * DEGREES_TO_RADIANS;
  return oklabToLinear({ L, a: C * Math.cos(hr), b: C * Math.sin(hr) });
}

/** OKLCH (L, C, H°) → gamma sRGB {r,g,b} in [0,1], NOT yet gamut-checked. */
function oklchToSrgb01(L, C, H) {
  const lin = oklchToLinear(L, C, H);
  return { r: linearToSrgb(lin.r), g: linearToSrgb(lin.g), b: linearToSrgb(lin.b) };
}

/** Are all three gamma-sRGB channels inside [0,1] (within float slack)? */
function inGamut01({ r, g, b }) {
  return (
    r >= -GAMUT_EPS && r <= 1 + GAMUT_EPS &&
    g >= -GAMUT_EPS && g <= 1 + GAMUT_EPS &&
    b >= -GAMUT_EPS && b <= 1 + GAMUT_EPS
  );
}

/**
 * Map an OKLCH color into displayable sRGB by reducing chroma while preserving L
 * and H (binary search), then clamping residual float dust. Preserving lightness
 * is what keeps shade/tint ramps monotonic. Returns gamma sRGB {r,g,b} in [0,1].
 * (v1 gamut policy: chroma-reduce then clamp. Documented in the verification doc.)
 */
function gamutMapOklch(L, C, H) {
  L = clamp(L, 0, 1);
  C = Math.max(0, C);
  let rgb = oklchToSrgb01(L, C, H);
  if (!inGamut01(rgb)) {
    let lo = 0;        // in-gamut (C=0 at a clamped L is always displayable)
    let hi = C;        // out of gamut
    for (let i = 0; i < 25; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut01(oklchToSrgb01(L, mid, H))) lo = mid;
      else hi = mid;
    }
    rgb = oklchToSrgb01(L, lo, H);
  }
  return { r: clamp(rgb.r, 0, 1), g: clamp(rgb.g, 0, 1), b: clamp(rgb.b, 0, 1) };
}

// ============================================================================
// HSL / HSV ↔ sRGB — operate on [0,1] channels. Standard formulas; achromatic
// inputs (max==min) short-circuit to h=0,s=0 so gray/black/white never NaN.
// ============================================================================

/** sRGB {r,g,b} in [0,1] → {h:0–360, s:0–1, l:0–1}. */
function rgbToHsl({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d > 1e-12) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, l };
}

/** {h:any°, s:0–1, l:0–1} → sRGB {r,g,b} in [0,1]. */
function hslToRgb({ h, s, l }) {
  h = normalizeDegrees(h) / 360;
  if (s <= 0) return { r: l, g: l, b: l };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    t = (t % 1 + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return { r: hue(h + 1 / 3), g: hue(h), b: hue(h - 1 / 3) };
}

/** sRGB {r,g,b} in [0,1] → {h:0–360, s:0–1, v:0–1}. */
function rgbToHsv({ r, g, b }) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max <= 0 ? 0 : d / max;
  let h = 0;
  if (d > 1e-12) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s, v };
}

/** {h:any°, s:0–1, v:0–1} → sRGB {r,g,b} in [0,1]. */
function hsvToRgb({ h, s, v }) {
  h = normalizeDegrees(h) / 60;
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (((i % 6) + 6) % 6) {
    case 0: return { r: v, g: t, b: p };
    case 1: return { r: q, g: v, b: p };
    case 2: return { r: p, g: v, b: t };
    case 3: return { r: p, g: q, b: v };
    case 4: return { r: t, g: p, b: v };
    default: return { r: v, g: p, b: q };
  }
}

// ============================================================================
// Bridges between the canonical {r,g,b∈[0,255], a∈[0,1]} hub and the math
// spaces. Internal — public getters wrap these.
// ============================================================================

const toUnitRgb = (color) => ({ r: color.r / 255, g: color.g / 255, b: color.b / 255 });
const rgba = (r, g, b, a) => ({ r, g, b, a: a == null ? 1 : clamp(a, 0, 1) });
const fromUnitRgb = ({ r, g, b }, a) => rgba(r * 255, g * 255, b * 255, a);

/** canonical → OKLab {l, a, b, alpha}. (alpha keyed separately: OKLab has an a-axis.) */
function rgbaToOklab(color) {
  const lin = { r: srgbToLinear(color.r / 255), g: srgbToLinear(color.g / 255), b: srgbToLinear(color.b / 255) };
  const { L, a, b } = linearToOklab(lin);
  return { l: L, a, b, alpha: color.a };
}

/** canonical → OKLCH {l, c, h, a}. Hue forced to 0 (not NaN) when achromatic. */
function rgbaToOklch(color) {
  const { l, a, b, alpha } = rgbaToOklab(color);
  const C = Math.hypot(a, b);
  const h = C < ACHROMATIC ? 0 : normalizeDegrees(Math.atan2(b, a) * RADIANS_TO_DEGREES);
  return { l, c: C, h, a: alpha };
}

/** OKLCH {l, c, h, a} → canonical (gamut-mapped). */
function oklchToRgba({ l, c, h, a }) {
  return fromUnitRgb(gamutMapOklch(l, Math.max(0, c), h || 0), a);
}

/** OKLab {l, a, b, alpha} → canonical (via OKLCH gamut mapping). */
function oklabToRgba({ l, a, b, alpha }) {
  const c = Math.hypot(a, b);
  const h = c < ACHROMATIC ? 0 : normalizeDegrees(Math.atan2(b, a) * RADIANS_TO_DEGREES);
  return oklchToRgba({ l, c, h, a: alpha });
}

// ============================================================================
// Parsing — liberal acceptance, returns the canonical object or null.
//
// parse() is the SOFT form: null on anything it can't read. Every other public
// function coerces with asColor(), which THROWS a TypeError on un-parseable
// input. (Soft "try" parse vs strict ops — one consistent contract.)
// ============================================================================

// CSS numbers, including scientific notation (1e3, 2.5e-2).
const NUM = '[-+]?(?:\\d+\\.?\\d*|\\.\\d+)(?:e[-+]?\\d+)?';
const FUNCTION_PATTERN = /^([a-z]+)\(([^)]*)\)$/;
// A longer token cannot be a sane number; refusing it up front also defuses the
// quadratic regex backtracking a giant digit string could otherwise trigger.
const MAX_NUMBER_TOKEN_LENGTH = 64;

/**
 * Parse a numeric token (optionally `%`-suffixed), returning NaN on failure.
 * Strictly anchored: trailing garbage is a failure, not silently ignored
 * (the old prefix match read "50abc" as 50).
 */
const numOf = (token) => {
  if (typeof token !== 'string' || token.length > MAX_NUMBER_TOKEN_LENGTH) return NaN;
  const match = new RegExp(`^(${NUM})%?$`).exec(token);
  return match ? parseFloat(match[1]) : NaN;
};

/** Alpha token → [0,1]. `%` allowed. null/undefined → 1. */
function parseAlpha(token) {
  if (token == null) return 1;
  const isPercent = token.endsWith('%');
  const n = numOf(token);
  if (Number.isNaN(n)) return NaN;
  return clamp(isPercent ? n / 100 : n, 0, 1);
}

/** rgb channel token → [0,255]. `%` is 0–100% of 255; bare is 0–255. */
function parseRgbChannel(token) {
  const isPercent = token.endsWith('%');
  const n = numOf(token);
  if (Number.isNaN(n)) return NaN;
  return isPercent ? clamp(n, 0, 100) / 100 * 255 : clamp(n, 0, 255);
}

/** hue token (deg/grad/rad/turn/bare) → degrees (un-normalized). */
function parseHue(token) {
  if (typeof token !== 'string' || token.length > MAX_NUMBER_TOKEN_LENGTH) return NaN;
  const m = new RegExp(`^(${NUM})(deg|grad|rad|turn)?$`).exec(token);
  if (!m) return NaN;
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case 'turn': return n * 360;
    case 'grad': return n * 0.9;
    case 'rad': return n * RADIANS_TO_DEGREES;
    default: return n; // deg or bare
  }
}

/** Signed percent token → [-1,1]. For axes that are legitimately negative
 *  (OKLab a/b: ±100% maps to ±1 of the axis scale). */
function parseSignedPercent(token) {
  const n = numOf(token);
  if (Number.isNaN(n)) return NaN;
  return clamp(n, -100, 100) / 100;
}

/** percent-or-fraction token → [0,1]. `50%`, `50` (treated as %), or already a
 *  fraction is ambiguous, so for s/l/v we always read on the 0–100 scale. */
function parsePctScale(token) {
  const n = numOf(token);
  if (Number.isNaN(n)) return NaN;
  return clamp(n, 0, 100) / 100;
}

/** Split a "name(body)" function form into name + value tokens + alpha token. */
function splitFunctionNotation(str) {
  const m = FUNCTION_PATTERN.exec(str);
  if (!m) return null;
  let body = m[2].trim();
  let alpha = null;
  const slash = body.split('/');
  if (slash.length === 2) { body = slash[0].trim(); alpha = slash[1].trim(); }
  else if (slash.length > 2) return null;
  const tokens = body.split(/[\s,]+/).filter(Boolean);
  // legacy comma form `rgba(r,g,b,a)` carries alpha as a 4th token
  if (alpha == null && tokens.length === 4) alpha = tokens.pop();
  return { name: m[1], tokens, alpha };
}

function parseHex(str) {
  const h = str[0] === '#' ? str.slice(1) : str;
  if (!/^[0-9a-f]+$/.test(h)) return null;
  const dup = (x) => x + x;
  let r, g, b, a = 255;
  if (h.length === 3) { [r, g, b] = [...h].map((x) => parseInt(dup(x), 16)); }
  else if (h.length === 4) { [r, g, b, a] = [...h].map((x) => parseInt(dup(x), 16)); }
  else if (h.length === 6) { r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); }
  else if (h.length === 8) { r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16); a = parseInt(h.slice(6, 8), 16); }
  else return null;
  return rgba(r, g, b, a / 255);
}

// Finite check, not just NaN: a 400-digit token parses to Infinity, which used
// to sail through and emit NaN channels downstream.
const valid = (...values) => values.every((value) => Number.isFinite(value));

/**
 * Parse a color string in any supported format. Returns the canonical object
 * `{ r, g, b, a }` (r,g,b in 0–255, a in 0–1), or `null` if it can't be read.
 *
 * Accepts: hex (#rgb, #rgba, #rrggbb, #rrggbbaa, with or without `#`); rgb()/
 * rgba() (comma or space, `%` or 0–255 channels); hsl()/hsla(); hsv()/hsb()
 * (non-CSS, accepted for symmetry); oklch(); oklab(). Whitespace, `deg`/`turn`/
 * `grad`/`rad` hue units, and `/ alpha` are all tolerated. Named CSS colors are
 * out of scope for v1 (see the verification doc).
 */
export function parse(input) {
  if (input == null) return null;
  if (typeof input !== 'string') return null;
  const str = input.trim().toLowerCase();
  if (!str) return null;

  // hex (with or without leading #) — parseHex itself rejects bad charsets/lengths
  if (str[0] === '#' || /^[0-9a-f]{3,8}$/.test(str)) return parseHex(str);

  const f = splitFunctionNotation(str);
  if (!f) return null;
  const { name, tokens, alpha } = f;
  const a = parseAlpha(alpha);
  if (Number.isNaN(a)) return null;

  switch (name) {
    case 'rgb':
    case 'rgba': {
      if (tokens.length !== 3) return null;
      const [r, g, b] = tokens.map(parseRgbChannel);
      return valid(r, g, b) ? rgba(r, g, b, a) : null;
    }
    case 'hsl':
    case 'hsla': {
      if (tokens.length !== 3) return null;
      const h = parseHue(tokens[0]);
      const s = parsePctScale(tokens[1]);
      const l = parsePctScale(tokens[2]);
      return valid(h, s, l) ? fromUnitRgb(hslToRgb({ h, s, l }), a) : null;
    }
    case 'hsv':
    case 'hsb': {
      if (tokens.length !== 3) return null;
      const h = parseHue(tokens[0]);
      const s = parsePctScale(tokens[1]);
      const v = parsePctScale(tokens[2]);
      return valid(h, s, v) ? fromUnitRgb(hsvToRgb({ h, s, v }), a) : null;
    }
    case 'oklch': {
      if (tokens.length !== 3) return null;
      const l = tokens[0].endsWith('%') ? parsePctScale(tokens[0]) : numOf(tokens[0]);
      const c = tokens[1].endsWith('%') ? parsePctScale(tokens[1]) * 0.4 : numOf(tokens[1]);
      const h = parseHue(tokens[2]);
      return valid(l, c, h) ? oklchToRgba({ l, c, h, a }) : null;
    }
    case 'oklab': {
      if (tokens.length !== 3) return null;
      const l = tokens[0].endsWith('%') ? parsePctScale(tokens[0]) : numOf(tokens[0]);
      // Signed: the a/b axes are negative half the time, and the old unsigned
      // percent parse silently clamped "-50%" to 0.
      const aAxis = tokens[1].endsWith('%') ? parseSignedPercent(tokens[1]) * 0.4 : numOf(tokens[1]);
      const bAxis = tokens[2].endsWith('%') ? parseSignedPercent(tokens[2]) * 0.4 : numOf(tokens[2]);
      return valid(l, aAxis, bAxis) ? oklabToRgba({ l, a: aAxis, b: bAxis, alpha: a }) : null;
    }
    default:
      return null;
  }
}

/**
 * Coerce any accepted input into a fresh canonical object. Accepts a format
 * string OR a canonical `{ r, g, b, a }` object (r,g,b in 0–255). Throws a
 * TypeError on anything else (the strict counterpart to parse()'s soft null).
 */
function asColor(input) {
  if (input && typeof input === 'object' &&
      Number.isFinite(input.r) && Number.isFinite(input.g) && Number.isFinite(input.b) &&
      (input.a == null || Number.isFinite(input.a))) {
    // Finite checks, not typeof: NaN channels used to pass and poison everything
    // downstream (toHex emitted "#NaN0000"). Non-finite objects now hit the
    // TypeError below, exactly like an unreadable string.
    return rgba(clamp(input.r, 0, 255), clamp(input.g, 0, 255), clamp(input.b, 0, 255),
      input.a == null ? 1 : input.a);
  }
  if (typeof input === 'string') {
    const parsed = parse(input);
    if (parsed) return parsed;
  }
  throw new TypeError(`Invalid color: ${typeof input === 'string' ? JSON.stringify(input) : String(input)}`);
}

// ============================================================================
// Serialization — canonical, CSS-valid (modern syntax by default).
// ============================================================================

/** Round to `dp` decimals, drop trailing zeros, normalize -0 → 0. */
function num(x, dp) {
  const f = 10 ** dp;
  let r = Math.round(x * f) / f;
  if (r === 0) r = 0; // kill -0
  return String(r);
}

const round = (x, dp) => Number(num(x, dp));
const toHexPair = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
const toIntegerRgb = (color) => ({ r: clamp(Math.round(color.r), 0, 255), g: clamp(Math.round(color.g), 0, 255), b: clamp(Math.round(color.b), 0, 255) });
const modernAlpha = (a) => (a < 1 ? ` / ${num(a, 4)}` : '');

/**
 * Hex string for a color. Lowercase, `#rrggbb`, upgraded to `#rrggbbaa` when the
 * color has alpha < 1. Options: `{ alpha: 'auto' | 'always' | 'never' }`
 * (default 'auto').
 */
export function toHex(input, { alpha = 'auto' } = {}) {
  if (alpha !== 'auto' && alpha !== 'always' && alpha !== 'never') {
    throw new TypeError(`Unknown hex alpha mode: ${alpha}`);
  }
  const color = asColor(input);
  const { r, g, b } = toIntegerRgb(color);
  let s = `#${toHexPair(r)}${toHexPair(g)}${toHexPair(b)}`;
  if (alpha === 'always' || (alpha === 'auto' && color.a < 1)) s += toHexPair(color.a * 255);
  return s;
}

/**
 * Serialize a color to a canonical CSS string in the named format.
 * `targetFormat` ∈ Format. Options: `{ legacy: boolean }` to emit comma syntax for
 * rgb/hsl (default modern, space-separated with `/ alpha`); for the HEX target,
 * `{ alpha: 'auto' | 'always' | 'never' }` is forwarded to toHex(). 'hsv' is non-CSS.
 */
export function format(input, targetFormat = Format.HEX, options = {}) {
  const color = asColor(input);
  const a = color.a;
  switch (targetFormat) {
    case Format.HEX:
      return toHex(color, options);
    case Format.RGB: {
      const { r, g, b } = toIntegerRgb(color);
      if (options.legacy) return a < 1 ? `rgba(${r}, ${g}, ${b}, ${num(a, 4)})` : `rgb(${r}, ${g}, ${b})`;
      return `rgb(${r} ${g} ${b}${modernAlpha(a)})`;
    }
    case Format.HSL: {
      const { h, s, l } = rgbToHsl(toUnitRgb(color));
      const H = num(h, 2), S = num(s * 100, 2), L = num(l * 100, 2);
      if (options.legacy) return a < 1 ? `hsla(${H}, ${S}%, ${L}%, ${num(a, 4)})` : `hsl(${H}, ${S}%, ${L}%)`;
      return `hsl(${H} ${S}% ${L}%${modernAlpha(a)})`;
    }
    case Format.HSV: {
      const { h, s, v } = rgbToHsv(toUnitRgb(color));
      return `hsv(${num(h, 2)} ${num(s * 100, 2)}% ${num(v * 100, 2)}%${modernAlpha(a)})`;
    }
    case Format.OKLCH: {
      const { l, c: ch, h } = rgbaToOklch(color);
      return `oklch(${num(l, 4)} ${num(ch, 4)} ${num(h, 2)}${modernAlpha(a)})`;
    }
    case Format.OKLAB: {
      const { l, a: aAxis, b: bAxis } = rgbaToOklab(color);
      return `oklab(${num(l, 4)} ${num(aAxis, 4)} ${num(bAxis, 4)}${modernAlpha(a)})`;
    }
    default:
      throw new TypeError(`Unknown format: ${targetFormat}`);
  }
}

// ── Component getters (conventional-unit views for inspection) ──────────────

/** {r,g,b: integers 0–255, a: 0–1}. */
export function toRgb(input) {
  const color = asColor(input);
  const { r, g, b } = toIntegerRgb(color);
  return { r, g, b, a: round(color.a, 4) };
}

/** {h: 0–360, s: 0–100, l: 0–100, a: 0–1}. */
export function toHsl(input) {
  const color = asColor(input);
  const { h, s, l } = rgbToHsl(toUnitRgb(color));
  return { h: round(h, 2), s: round(s * 100, 2), l: round(l * 100, 2), a: round(color.a, 4) };
}

/** {h: 0–360, s: 0–100, v: 0–100, a: 0–1}. */
export function toHsv(input) {
  const color = asColor(input);
  const { h, s, v } = rgbToHsv(toUnitRgb(color));
  return { h: round(h, 2), s: round(s * 100, 2), v: round(v * 100, 2), a: round(color.a, 4) };
}

/** {l: 0–1, c: 0–~0.4, h: 0–360, a: 0–1}. Hue is 0 for achromatic colors. */
export function toOklch(input) {
  const { l, c, h, a } = rgbaToOklch(asColor(input));
  return { l: round(l, 5), c: round(c, 5), h: round(h, 3), a: round(a, 4) };
}

/** {l: 0–1, a: ±, b: ±, alpha: 0–1} — the Cartesian OKLab form. */
export function toOklab(input) {
  const { l, a, b, alpha } = rgbaToOklab(asColor(input));
  return { l: round(l, 5), a: round(a, 5), b: round(b, 5), alpha: round(alpha, 4) };
}

// ============================================================================
// WCAG contrast.
//
// Alpha policy: contrast is defined for OPAQUE colors. These functions IGNORE
// alpha (they read the rgb channels as-is). To get the real on-screen contrast
// of a translucent color, flatten it first with composite(fg, bg) and pass the
// result. Documented in the verification doc.
// ============================================================================

/** WCAG 2.x relative luminance (0–1) of a color (alpha ignored). */
export function relativeLuminance(input) {
  const color = asColor(input);
  const R = srgbToLinear(color.r / 255);
  const G = srgbToLinear(color.g / 255);
  const B = srgbToLinear(color.b / 255);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/** WCAG contrast ratio between two colors, in [1, 21] (alpha ignored). */
export function contrast(a, b) {
  const luminanceA = relativeLuminance(a);
  const luminanceB = relativeLuminance(b);
  const hi = Math.max(luminanceA, luminanceB);
  const lo = Math.min(luminanceA, luminanceB);
  return (hi + 0.05) / (lo + 0.05);
}

const CONTRAST_EPSILON = 1e-9;

/** Threshold ratio for a given level + size. Unknown values throw (the sibling
 *  enums all do) rather than silently substituting AA/normal. */
function targetRatio(level, size) {
  const row = Object.prototype.hasOwnProperty.call(WCAG_THRESHOLDS, size) ? WCAG_THRESHOLDS[size] : null;
  if (!row) throw new TypeError(`Unknown text size: ${size}`);
  // Own-property guard on `level` too: inherited Object.prototype names
  // ('toString', 'hasOwnProperty', 'constructor', '__proto__', …) resolve to a
  // Function (not null), so a bare `row[level] == null` check would let them
  // through and substitute a non-numeric threshold (a self-contradictory verdict).
  if (!Object.prototype.hasOwnProperty.call(row, level)) throw new TypeError(`Unknown WCAG level: ${level}`);
  return row[level];
}

/**
 * Evaluate a foreground/background pair against WCAG. Returns the ratio, every
 * level/size verdict, and `passes` for the requested `{ level, size }`.
 *   { ratio, AA, AAA, AALarge, AAALarge, passes }
 */
export function meetsWCAG(a, b, { level = WCAGLevel.AA, size = TextSize.NORMAL } = {}) {
  const ratio = contrast(a, b);
  // One epsilon for every field: `passes` and the named flags used to use
  // different tolerances, so a boundary ratio could contradict itself.
  const meets = (threshold) => ratio >= threshold - CONTRAST_EPSILON;
  const verdict = {
    ratio,
    AA: meets(WCAG_THRESHOLDS.normal.AA),
    AAA: meets(WCAG_THRESHOLDS.normal.AAA),
    AALarge: meets(WCAG_THRESHOLDS.large.AA),
    AAALarge: meets(WCAG_THRESHOLDS.large.AAA),
  };
  verdict.passes = meets(targetRatio(level, size));
  return verdict;
}

/**
 * Adjust a color until it meets a contrast target against a background, by
 * moving ONLY its OKLCH lightness (hue and chroma preserved; chroma is reduced
 * only if a lightness extreme pushes it out of gamut). Both lighter and darker
 * directions are searched and the smaller move that meets the target wins. If the
 * target is unreachable (even pure black/white can't meet it against this bg),
 * the best achievable color is returned with `met: false` — reported honestly,
 * never faked.
 *
 * @returns {{ color, ratio, met, level, size, lightnessDelta }}
 *   `color` is the canonical adjusted color (original alpha preserved).
 */
export function adjustForContrast(input, bg, { level = WCAGLevel.AA, size = TextSize.NORMAL } = {}) {
  const color = asColor(input);
  const bgc = asColor(bg);
  const target = targetRatio(level, size);
  const { l: L0, c: C, h: H, a } = rgbaToOklch(color);

  const at = (L) => oklchToRgba({ l: L, c: C, h: H, a });
  const ratioAt = (L) => contrast(at(L), bgc);
  // One epsilon for every "meets target" comparison (fast-path, reachability
  // gates, and binary-search predicates), exactly as meetsWCAG funnels every
  // field through a single tolerance — otherwise the fast-path and the search
  // can disagree at a boundary ratio.
  const meets = (L) => ratioAt(L) >= target - CONTRAST_EPSILON;

  const result = (L, ratio, met) => ({
    color: at(L), ratio, met, level, size, lightnessDelta: L - L0,
  });

  if (meets(L0)) return result(L0, ratioAt(L0), true);

  // Largest L ≤ L0 (darker) that meets target — minimal downward move.
  let dark = null;
  if (meets(0)) {
    let lo = 0, hi = L0;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (meets(m)) lo = m; else hi = m; }
    dark = lo;
  }
  // Smallest L ≥ L0 (lighter) that meets target — minimal upward move.
  let light = null;
  if (meets(1)) {
    let lo = L0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (meets(m)) hi = m; else lo = m; }
    light = hi;
  }

  if (dark == null && light == null) {
    // Unreachable — return whichever extreme has the most contrast.
    const L = ratioAt(0) >= ratioAt(1) ? 0 : 1;
    return result(L, ratioAt(L), false);
  }
  let L;
  if (dark != null && light != null) L = Math.abs(dark - L0) <= Math.abs(light - L0) ? dark : light;
  else L = dark != null ? dark : light;
  return result(L, ratioAt(L), true);
}

// ============================================================================
// Perceptual utilities.
// ============================================================================

/** Perceptual lightness = OKLab L (0–1). The principled "how light" measure. */
export function perceivedLightness(input) {
  return round(rgbaToOklab(asColor(input)).l, 5);
}

// Luminance flip point where black vs white text have equal WCAG contrast:
// (L+0.05) = 1.05/(L+0.05) → L = √0.0525 − 0.05 ≈ 0.17913.
const LIGHT_THRESHOLD = Math.sqrt(1.05 * 0.05) - 0.05;

/** True when black text reads better than white on this color (alpha ignored). */
export function isLight(input) {
  return relativeLuminance(input) > LIGHT_THRESHOLD;
}

/** Complement of isLight. */
export function isDark(input) {
  return !isLight(input);
}

/** Black or white (whichever has higher contrast on the color) as a canonical color. */
export function preferredTextColor(input) {
  return isLight(input) ? rgba(0, 0, 0, 1) : rgba(255, 255, 255, 1);
}

/**
 * Alpha-composite a (possibly translucent) foreground over a background — the
 * "source-over" operator, done in gamma sRGB to match the browser's default
 * compositing. Returns a canonical color (opaque if the result is fully opaque).
 */
export function composite(fg, bg) {
  const f = asColor(fg);
  const b = asColor(bg);
  const af = f.a;
  const ab = b.a;
  const ao = af + ab * (1 - af);
  if (ao <= 0) return rgba(0, 0, 0, 0);
  const ch = (cf, colorB) => (cf * af + colorB * ab * (1 - af)) / ao;
  return rgba(ch(f.r, b.r), ch(f.g, b.g), ch(f.b, b.b), ao);
}

// ============================================================================
// Transforms — perceptual, done in OKLCH (hue/chroma/lightness are independent).
// Amounts are ABSOLUTE deltas on the OKLCH axis (L and C are ~0–1 / ~0–0.4).
// ============================================================================

/** Apply fn to the OKLCH form and convert back. */
function mapOklch(input, fn) {
  const ok = rgbaToOklch(asColor(input));
  return oklchToRgba(fn(ok));
}

/** Lighten by raising OKLCH L (clamped to 1). amount is an absolute L delta. */
export function lighten(input, amount) {
  requireFiniteNumber(amount, 'lighten amount');
  return mapOklch(input, (oklch) => ({ ...oklch, l: clamp(oklch.l + amount, 0, 1) }));
}

/** Darken by lowering OKLCH L (clamped to 0). */
export function darken(input, amount) {
  requireFiniteNumber(amount, 'darken amount');
  return mapOklch(input, (oklch) => ({ ...oklch, l: clamp(oklch.l - amount, 0, 1) }));
}

/** Increase OKLCH chroma. No-op on achromatic colors (no hue to push toward). */
export function saturate(input, amount) {
  requireFiniteNumber(amount, 'saturate amount');
  return mapOklch(input, (oklch) => (oklch.c < ACHROMATIC ? oklch : { ...oklch, c: Math.max(0, oklch.c + amount) }));
}

/** Decrease OKLCH chroma (clamped at 0). */
export function desaturate(input, amount) {
  requireFiniteNumber(amount, 'desaturate amount');
  return mapOklch(input, (oklch) => ({ ...oklch, c: Math.max(0, oklch.c - amount) }));
}

/** Drop all chroma — the perceptual grayscale (preserves OKLab lightness). */
export function grayscale(input) {
  return mapOklch(input, (o) => ({ ...o, c: 0, h: 0 }));
}

/** Rotate hue by `deg` around the OKLCH hue circle. */
export function rotateHue(input, degrees) {
  requireFiniteNumber(degrees, 'rotateHue degrees');
  return mapOklch(input, (oklch) => ({ ...oklch, h: normalizeDegrees(oklch.h + degrees) }));
}

// ============================================================================
// Interpolation — mix() and gradient().
// ============================================================================

const lerp = (x, y, t) => x + (y - x) * t;

/** Throw the engine's standard TypeError for a non-finite numeric argument. */
function requireFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number, got ${value}`);
  }
  return value;
}

/** Throw the engine's standard TypeError for an unknown hue-arc direction. */
function requireHueDirection(dir) {
  if (dir !== 'shorter' && dir !== 'longer') {
    throw new TypeError(`Unknown hue direction: ${dir}`);
  }
  return dir;
}

const SPACE_VALUES = new Set(Object.values(Space));

/** Throw the engine's standard TypeError for an unknown interpolation space. */
function requireSpace(space) {
  if (!SPACE_VALUES.has(space)) {
    throw new TypeError(`Unknown interpolation space: ${space}`);
  }
  return space;
}

/** Interpolate hue (degrees) along the shorter or longer arc. */
function lerpHue(h0, h1, t, dir) {
  let d = ((h1 - h0 + 540) % 360) - 180; // shortest signed delta in [-180, 180)
  if (dir === 'longer') d = d > 0 ? d - 360 : d + 360;
  return normalizeDegrees(h0 + d * t);
}

/** Core two-color interpolation in a chosen space; endpoints returned exactly. */
function interp(colorA, colorB, t, space, hueDirection) {
  if (t <= 0) return { ...colorA };
  if (t >= 1) return { ...colorB };
  const a = lerp(colorA.a, colorB.a, t);

  switch (space) {
    case Space.SRGB:
      return rgba(lerp(colorA.r, colorB.r, t), lerp(colorA.g, colorB.g, t), lerp(colorA.b, colorB.b, t), a);

    case Space.LRGB: {
      const A = toUnitRgb(colorA), B = toUnitRgb(colorB);
      const lin = (x, y) => linearToSrgb(lerp(srgbToLinear(x), srgbToLinear(y), t));
      return fromUnitRgb({ r: lin(A.r, B.r), g: lin(A.g, B.g), b: lin(A.b, B.b) }, a);
    }

    case Space.HSL: {
      const A = rgbToHsl(toUnitRgb(colorA)), B = rgbToHsl(toUnitRgb(colorB));
      let h0 = A.h, h1 = B.h;
      if (A.s < 1e-6) h0 = h1; if (B.s < 1e-6) h1 = h0; // carry hue across gray
      return fromUnitRgb(hslToRgb({ h: lerpHue(h0, h1, t, hueDirection), s: lerp(A.s, B.s, t), l: lerp(A.l, B.l, t) }), a);
    }

    case Space.OKLAB: {
      const A = rgbaToOklab(colorA), B = rgbaToOklab(colorB);
      return oklabToRgba({ l: lerp(A.l, B.l, t), a: lerp(A.a, B.a, t), b: lerp(A.b, B.b, t), alpha: a });
    }

    case Space.OKLCH: {
      const A = rgbaToOklch(colorA), B = rgbaToOklch(colorB);
      let h0 = A.h, h1 = B.h;
      if (A.c < ACHROMATIC) h0 = h1; if (B.c < ACHROMATIC) h1 = h0; // carry hue across gray
      return oklchToRgba({ l: lerp(A.l, B.l, t), c: lerp(A.c, B.c, t), h: lerpHue(h0, h1, t, hueDirection), a });
    }

    default:
      throw new TypeError(`Unknown interpolation space: ${space}`);
  }
}

/**
 * Mix two colors at parameter t ∈ [0,1] (t=0 → a, t=1 → b), in the given space.
 * Defaults to perceptual OKLCH with shortest-path hue.
 * Options: `{ space = 'oklch', hue = 'shorter' | 'longer' }`.
 */
export function mix(a, b, t = 0.5, { space = Space.OKLCH, hue = 'shorter' } = {}) {
  requireFiniteNumber(t, 'mix t');
  requireSpace(space);
  requireHueDirection(hue);
  return interp(asColor(a), asColor(b), clamp(t, 0, 1), space, hue);
}

const toWholeStep = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? v : 0;
};

// Upper bound on consumer-supplied step/segment counts for gradient()/shades()/
// tints(). toWholeStep() rejects non-finite values but imposes no ceiling, so a
// large finite count (e.g. steps: 2_000_000) would allocate that many entries and
// run a per-step OKLCH + gamut binary search, hanging the tab / exhausting memory.
// Mirrors the consumer-count caps elsewhere in the repo (cf. datetime yearsPerPage).
const MAX_STEPS = 1024;
const cappedStep = (n) => Math.min(toWholeStep(n), MAX_STEPS);

/**
 * Build a gradient as an array of `steps` colors.
 *
 *   gradient(from, to, options)        // two-color
 *   gradient([c0, c1, c2, …], options) // multi-stop (≥2 stops)
 *
 * Options: `{ steps = 11, space = 'oklch', hue = 'shorter', includeEnds = true }`.
 * Interpolation defaults to perceptual OKLCH (even, vivid — not the muddy sRGB
 * midpoint). With `includeEnds` the first/last entries are the endpoints exactly;
 * hue takes the short path by default. `steps ≤ 0` → `[]`; `steps === 1` → the
 * start color only.
 */
export function gradient(a, b, gradientOptions) {
  const stops = Array.isArray(a) ? a.map(asColor) : [asColor(a), asColor(b)];
  const options = (Array.isArray(a) ? b : gradientOptions) || {};
  const { space = Space.OKLCH, hue = 'shorter', includeEnds = true } = options;
  const steps = cappedStep(options.steps == null ? 11 : options.steps);

  requireSpace(space);
  requireHueDirection(hue);
  if (stops.length < 2) throw new TypeError('gradient() needs at least two stops');
  if (steps <= 0) return [];
  if (steps === 1) return [{ ...stops[0] }];

  const sample = (t) => {
    const x = t * (stops.length - 1);
    let i = Math.floor(x);
    if (i >= stops.length - 1) i = stops.length - 2; // clamp last segment
    return interp(stops[i], stops[i + 1], x - i, space, hue);
  };

  const out = [];
  for (let i = 0; i < steps; i++) {
    const t = includeEnds ? i / (steps - 1) : (i + 1) / (steps + 1);
    out.push(sample(clamp(t, 0, 1)));
  }
  return out;
}

// ============================================================================
// Palette / harmony — shades/tints in OKLCH lightness, harmonies by hue rotation.
// ============================================================================

/**
 * `steps` progressively DARKER variants of a color (OKLCH lightness lowered in
 * even steps toward black, base excluded). Decreasing perceptual lightness for
 * any base above black; a base already at L=0 (pure black) has nothing darker, so
 * every entry comes back black. Gamut-mapped so every result is displayable.
 * `steps ≤ 0` → `[]`.
 */
export function shades(input, steps = 5) {
  const n = cappedStep(steps);
  if (n <= 0) return [];
  const { l: L0, c, h, a } = rgbaToOklch(asColor(input));
  const out = [];
  for (let i = 1; i <= n; i++) out.push(oklchToRgba({ l: L0 * (n + 1 - i) / (n + 1), c, h, a }));
  return out;
}

/**
 * `steps` progressively LIGHTER variants (OKLCH lightness raised toward white,
 * base excluded). Increasing lightness for any base below white; a base already at
 * L=1 (pure white) has nothing lighter, so every entry comes back white.
 * Gamut-mapped. `steps ≤ 0` → `[]`.
 */
export function tints(input, steps = 5) {
  const n = cappedStep(steps);
  if (n <= 0) return [];
  const { l: L0, c, h, a } = rgbaToOklch(asColor(input));
  const out = [];
  for (let i = 1; i <= n; i++) out.push(oklchToRgba({ l: L0 + (1 - L0) * i / (n + 1), c, h, a }));
  return out;
}

/**
 * Generate a color harmony from a base color by rotating hue (in OKLCH) by the
 * family's standard angles, with the base first. Returns canonical colors.
 *   complementary 0,180 · analogous 0,±30 · triadic 0,±120 ·
 *   split-complementary 0,150,210 · tetradic 0,60,180,240 · square 0,90,180,270
 * Achromatic input has no hue, so every entry is the same gray (reported honestly).
 */
export function harmony(input, type = Harmony.COMPLEMENTARY) {
  // Own-property guard like targetRatio(): HARMONY_ANGLES is a plain object, so a
  // caller-supplied `type` naming an inherited Object.prototype member
  // ('toString', 'constructor', 'valueOf', 'hasOwnProperty', '__proto__', …)
  // resolves to a Function/object (truthy), slipping past a bare `!angles` check
  // and throwing a misleading `angles.map is not a function` instead of the
  // contract's clean `Unknown harmony: <type>`.
  if (!Object.prototype.hasOwnProperty.call(HARMONY_ANGLES, type)) throw new TypeError(`Unknown harmony: ${type}`);
  const angles = HARMONY_ANGLES[type];
  const { l, c, h, a } = rgbaToOklch(asColor(input));
  return angles.map((d) => oklchToRgba({ l, c, h: normalizeDegrees(h + d), a }));
}

/** The complementary color (hue + 180° in OKLCH). */
export function complement(input) {
  return harmony(input, Harmony.COMPLEMENTARY)[1];
}

// ============================================================================
// Optional `color()` wrapper — thin, immutable sugar over the pure functions.
// It parses once and holds a canonical value; transforms return a new wrapper.
// Holds no resources: there is nothing to destroy. The functions above remain
// the real API (and what the tests target).
// ============================================================================

class Color {
  constructor(color) { this._c = color; Object.freeze(this); }
  /** The underlying canonical { r, g, b, a } (a fresh copy). */
  get rgba() { return { ...this._c }; }

  // serialization
  toHex(o) { return toHex(this._c, o); }
  toString(targetFormat, o) { return format(this._c, targetFormat, o); }
  toRgb() { return toRgb(this._c); }
  toHsl() { return toHsl(this._c); }
  toHsv() { return toHsv(this._c); }
  toOklch() { return toOklch(this._c); }
  toOklab() { return toOklab(this._c); }

  // transforms → new Color
  lighten(amount) { return new Color(lighten(this._c, amount)); }
  darken(amount) { return new Color(darken(this._c, amount)); }
  saturate(amount) { return new Color(saturate(this._c, amount)); }
  desaturate(amount) { return new Color(desaturate(this._c, amount)); }
  grayscale() { return new Color(grayscale(this._c)); }
  rotateHue(degrees) { return new Color(rotateHue(this._c, degrees)); }
  mix(other, t, options) { return new Color(mix(this._c, asColor(other instanceof Color ? other._c : other), t, options)); }
  // composite was the one two-color operation the wrapper did not expose
  composite(backdrop) { return new Color(composite(this._c, backdrop instanceof Color ? backdrop._c : backdrop)); }

  // analysis
  luminance() { return relativeLuminance(this._c); }
  perceivedLightness() { return perceivedLightness(this._c); }
  isLight() { return isLight(this._c); }
  isDark() { return isDark(this._c); }
  preferredTextColor() { return new Color(preferredTextColor(this._c)); }
  contrast(background) { return contrast(this._c, background instanceof Color ? background._c : background); }
  meetsWCAG(background, options) { return meetsWCAG(this._c, background instanceof Color ? background._c : background, options); }
  adjustForContrast(background, options) { return new Color(adjustForContrast(this._c, background instanceof Color ? background._c : background, options).color); }

  // palette
  shades(steps) { return shades(this._c, steps).map((shade) => new Color(shade)); }
  tints(steps) { return tints(this._c, steps).map((tint) => new Color(tint)); }
  harmony(type) { return harmony(this._c, type).map((entry) => new Color(entry)); }
  complement() { return new Color(complement(this._c)); }
}

/** Wrap a color for chainable, immutable convenience calls. Thin sugar. */
export function color(input) {
  return new Color(asColor(input));
}
