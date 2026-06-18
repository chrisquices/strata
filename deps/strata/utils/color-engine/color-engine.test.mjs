// color-engine.test.mjs
// Pure unit tests for the color engine. No DOM, no browser, no framework:
//   node color-engine/color-engine.test.mjs
//
// The whole point of this engine is provable correctness, so the conversion and
// contrast tests assert against KNOWN, externally-published reference values
// (CSS Color 4 / Ottosson OKLCH for the primaries; WCAG / WebAIM contrast
// ratios) — not just self-consistency. Round-trips, parsing, palette angles and
// gradient behavior pin the rest.
//
// Importing color-engine.js here doubles as the headless-core check: it touches
// no document/window, so this import is trivially clean in Node.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, isMain, report } from './harness.mjs';
import {
  parse, format, toHex,
  toRgb, toHsl, toHsv, toOklch, toOklab,
  relativeLuminance, contrast, meetsWCAG, adjustForContrast,
  perceivedLightness, isLight, isDark, preferredTextColor, composite,
  mix, lighten, darken, saturate, desaturate, grayscale, rotateHue,
  shades, tints, harmony, complement,
  gradient,
  color, Format, Space, Harmony, WCAGLevel, TextSize,
} from './color-engine.js';

// ---- helpers --------------------------------------------------------------

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg || ''} expected ${a} ≈ ${b} (±${tol})`);
const hueNear = (a, b, tol, msg) => {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  assert.ok(d <= tol, `${msg || ''} hue ${a} ≈ ${b} (±${tol}), off by ${d}`);
};
// OKLab L of a color — the perceptual-lightness oracle for ordering checks.
const okL = (c) => toOklab(c).l;

// ============================================================================
// 1. Conversion accuracy — against KNOWN reference values (not self-agreement).
// ============================================================================

test('hex → rgb/hsl for the primaries (sanity anchors)', () => {
  assert.deepEqual(toRgb('#ff0000'), { r: 255, g: 0, b: 0, a: 1 });
  assert.deepEqual(toRgb('#00ff00'), { r: 0, g: 255, b: 0, a: 1 });
  assert.deepEqual(toRgb('#0000ff'), { r: 0, g: 0, b: 255, a: 1 });
  assert.deepEqual(toHsl('#ff0000'), { h: 0, s: 100, l: 50, a: 1 });
  assert.deepEqual(toHsl('#00ff00'), { h: 120, s: 100, l: 50, a: 1 });
  assert.deepEqual(toHsl('#0000ff'), { h: 240, s: 100, l: 50, a: 1 });
  assert.deepEqual(toHsv('#ff0000'), { h: 0, s: 100, v: 100, a: 1 });
});

// Published OKLCH for sRGB primaries (CSS Color 4 / Ottosson). The part most
// likely to be implemented wrong — pinned to the exact reference numbers.
test('OKLCH of the sRGB primaries matches published reference values', () => {
  const red = toOklch('#ff0000');
  near(red.l, 0.627955, 0.001, 'red L'); near(red.c, 0.257683, 0.001, 'red C'); hueNear(red.h, 29.234, 0.1, 'red H');
  const green = toOklch('#00ff00');
  near(green.l, 0.866440, 0.001, 'green L'); near(green.c, 0.294827, 0.001, 'green C'); hueNear(green.h, 142.495, 0.1, 'green H');
  const blue = toOklch('#0000ff');
  near(blue.l, 0.452014, 0.001, 'blue L'); near(blue.c, 0.313214, 0.001, 'blue C'); hueNear(blue.h, 264.052, 0.1, 'blue H');
});

test('OKLCH of white / black / mid-gray: lightness right, chroma ~0, no NaN hue', () => {
  const w = toOklch('#ffffff'); near(w.l, 1, 0.0005, 'white L'); near(w.c, 0, 0.0005, 'white C'); assert.equal(Number.isNaN(w.h), false);
  const k = toOklch('#000000'); near(k.l, 0, 0.0005, 'black L'); near(k.c, 0, 0.0005, 'black C'); assert.equal(k.h, 0);
  const g = toOklch('#808080'); near(g.l, 0.599871, 0.001, 'gray L'); near(g.c, 0, 0.0005, 'gray C'); assert.equal(g.h, 0);
});

test('OKLab a/b axes: red is +a, green is −a, blue is +b-ish (sign sanity)', () => {
  assert.ok(toOklab('#ff0000').a > 0, 'red a>0');
  assert.ok(toOklab('#00ff00').a < 0, 'green a<0');
  assert.ok(toOklab('#0000ff').b < 0, 'blue b<0');
  // gray: both axes ~0
  near(toOklab('#808080').a, 0, 0.0005); near(toOklab('#808080').b, 0, 0.0005);
});

test('relativeLuminance: known anchors', () => {
  near(relativeLuminance('#ffffff'), 1, 1e-9, 'white');
  near(relativeLuminance('#000000'), 0, 1e-9, 'black');
  near(relativeLuminance('#ff0000'), 0.2126, 1e-4, 'red');
  near(relativeLuminance('#00ff00'), 0.7152, 1e-4, 'green');
  near(relativeLuminance('#0000ff'), 0.0722, 1e-4, 'blue');
});

// ============================================================================
// 2. Round-trips — A → B → A within tolerance, across a spread incl. edges.
// ============================================================================

const SPREAD = ['#000000', '#ffffff', '#808080', '#ff0000', '#00ff00', '#0000ff',
  '#1e90ff', '#7b3f9c', '#ffa500', '#0a0a0a', '#fafafa', '#123456'];

test('round-trip hex → every format string → hex (≤1/255 channel drift)', () => {
  for (const hex of SPREAD) {
    const c0 = parse(hex);
    for (const fmt of [Format.RGB, Format.HSL, Format.HSV, Format.OKLCH, Format.OKLAB]) {
      const c1 = parse(format(c0, fmt));
      assert.ok(c1, `${hex} via ${fmt} re-parsed`);
      near(c1.r, c0.r, 1.0, `${hex} via ${fmt} r`);
      near(c1.g, c0.g, 1.0, `${hex} via ${fmt} g`);
      near(c1.b, c0.b, 1.0, `${hex} via ${fmt} b`);
    }
  }
});

test('round-trip preserves alpha through formats that carry it', () => {
  const c0 = parse('#33669980'); // alpha 0x80/255 ≈ 0.5019
  for (const fmt of [Format.HEX, Format.RGB, Format.HSL, Format.OKLCH]) {
    const c1 = parse(format(c0, fmt));
    near(c1.a, c0.a, 0.01, `alpha via ${fmt}`);
  }
});

test('round-trip is tight (sub-0.1/255) for the float formats on a saturated color', () => {
  const c0 = parse('#7b3f9c');
  for (const fmt of [Format.HSL, Format.OKLCH, Format.OKLAB]) {
    const c1 = parse(format(c0, fmt));
    near(c1.r, c0.r, 0.1, `r via ${fmt}`);
    near(c1.g, c0.g, 0.1, `g via ${fmt}`);
    near(c1.b, c0.b, 0.1, `b via ${fmt}`);
  }
});

// ============================================================================
// 3. Parsing — liberal acceptance; clean rejection of garbage.
// ============================================================================

test('hex parsing: 3/4/6/8 digits, with and without #', () => {
  assert.deepEqual(toRgb(parse('#fff')), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(toRgb(parse('fff')), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(toRgb(parse('#ffffff')), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(toRgb(parse('ffffff')), { r: 255, g: 255, b: 255, a: 1 });
  assert.deepEqual(toRgb(parse('#ff8800')), { r: 255, g: 136, b: 0, a: 1 });
  assert.deepEqual(toRgb(parse('#f80')), { r: 255, g: 136, b: 0, a: 1 });
  near(parse('#ffffff80').a, 0.5019, 0.001, '8-digit alpha');
  near(parse('#fff8').a, 0.5333, 0.001, '4-digit alpha');
  assert.equal(parse('  #FFFFFF  ').r, 255, 'trim + uppercase');
});

test('rgb()/rgba(): comma or space, % or 0–255, optional alpha', () => {
  const want = { r: 255, g: 0, b: 0, a: 1 };
  assert.deepEqual(toRgb(parse('rgb(255 0 0)')), want);
  assert.deepEqual(toRgb(parse('rgb(255,0,0)')), want);
  assert.deepEqual(toRgb(parse('rgb(255, 0, 0)')), want);
  assert.deepEqual(toRgb(parse('rgba(255,0,0,1)')), want);
  assert.deepEqual(toRgb(parse('rgb(100% 0% 0%)')), want);
  near(parse('rgb(255 0 0 / 0.5)').a, 0.5, 1e-9, 'modern slash alpha');
  near(parse('rgba(255,0,0,0.25)').a, 0.25, 1e-9, 'legacy 4th-arg alpha');
  near(parse('rgb(255 0 0 / 50%)').a, 0.5, 1e-9, 'percent alpha');
});

test('hsl()/hsv()/hsb(): hue units and percent-or-bare s/l', () => {
  assert.deepEqual(toRgb(parse('hsl(120 100% 50%)')), { r: 0, g: 255, b: 0, a: 1 });
  assert.deepEqual(toRgb(parse('hsl(120, 100%, 50%)')), { r: 0, g: 255, b: 0, a: 1 });
  assert.deepEqual(toRgb(parse('hsl(120 100 50)')), { r: 0, g: 255, b: 0, a: 1 }); // bare s/l
  assert.deepEqual(toRgb(parse('hsl(0.5turn 100% 50%)')), { r: 0, g: 255, b: 255, a: 1 }); // 0.5turn = 180° = cyan
  assert.deepEqual(toRgb(parse('hsl(200grad 100% 50%)')), { r: 0, g: 255, b: 255, a: 1 }); // 200grad = 180° = cyan
  assert.deepEqual(toRgb(parse('hsv(120 100% 100%)')), { r: 0, g: 255, b: 0, a: 1 });
  assert.deepEqual(toRgb(parse('hsb(120 100% 100%)')), { r: 0, g: 255, b: 0, a: 1 });
});

test('oklch()/oklab(): parse to the right color (incl. percent L and C)', () => {
  const red = parse('oklch(0.628 0.2577 29.23)');
  near(toRgb(red).r, 255, 2, 'oklch red r'); near(toRgb(red).g, 0, 2, 'oklch red g'); near(toRgb(red).b, 0, 2, 'oklch red b');
  const red2 = parse('oklch(62.8% 0.2577 29.23)'); // % lightness
  near(toRgb(red2).r, 255, 2, 'oklch % red r');
  near(parse('oklch(0.7 0.1 120 / 0.5)').a, 0.5, 1e-9, 'oklch alpha');
  const k = parse('oklab(0 0 0)'); assert.deepEqual(toRgb(k), { r: 0, g: 0, b: 0, a: 1 });
});

test('invalid input: parse() returns null, ops throw', () => {
  for (const bad of ['', 'not-a-color', '#12345', '#xyz', 'rgb(1,2)', 'rgb()', 'hsl(1 2)',
    'oklch(1 2)', 'rgb(1/2/3)', 'potato', '#', 'rgb(1,2,3,4,5)', null, undefined, 42, {}]) {
    assert.equal(parse(bad), null, `parse(${JSON.stringify(bad)}) → null`);
  }
  assert.throws(() => toHex('not-a-color'), TypeError);
  assert.throws(() => contrast('#fff', 'garbage'), TypeError);
  assert.throws(() => toOklch('#12345'), TypeError);
});

test('canonical object input is accepted by every function', () => {
  const c = { r: 255, g: 0, b: 0, a: 1 };
  assert.equal(toHex(c), '#ff0000');
  near(contrast(c, '#fff'), 3.998, 0.01);
  assert.equal(toHex(lighten(c, 0)), '#ff0000');
});

// ============================================================================
// 4. Serialization — canonical, CSS-valid output.
// ============================================================================

test('serialization is canonical and clean', () => {
  assert.equal(toHex('#FF0000'), '#ff0000', 'lowercase hex');
  assert.equal(toHex('rgba(255,0,0,0.5)'), '#ff000080', 'alpha → 8-digit hex');
  assert.equal(toHex('rgba(255,0,0,0.5)', { alpha: 'never' }), '#ff0000');
  assert.equal(toHex('#ff0000', { alpha: 'always' }), '#ff0000ff');
  assert.equal(format('#ff0000', Format.RGB), 'rgb(255 0 0)');
  assert.equal(format('rgba(255,0,0,.5)', Format.RGB), 'rgb(255 0 0 / 0.5)');
  assert.equal(format('rgba(255,0,0,.5)', Format.RGB, { legacy: true }), 'rgba(255, 0, 0, 0.5)');
  assert.equal(format('#ff0000', Format.HSL), 'hsl(0 100% 50%)');
  assert.equal(format('#ff0000', Format.HSL, { legacy: true }), 'hsl(0, 100%, 50%)');
  assert.equal(format('#00ff00', Format.OKLCH), 'oklch(0.8664 0.2948 142.5)');
});

test('format() rejects unknown targets', () => {
  assert.throws(() => format('#fff', 'cmyk'), TypeError);
});

// ============================================================================
// 5. WCAG contrast — known ratios + threshold boundaries on both sides.
// ============================================================================

test('contrast: known ratios', () => {
  near(contrast('#000000', '#ffffff'), 21, 1e-9, 'black/white = 21:1');
  near(contrast('#ffffff', '#ffffff'), 1, 1e-9, 'white/white = 1:1');
  near(contrast('#777777', '#ffffff'), 4.48, 0.01, '#777 on white');
  near(contrast('#ff0000', '#ffffff'), 3.998, 0.01, 'red on white');
  // symmetric
  near(contrast('#fff', '#000'), contrast('#000', '#fff'), 1e-9, 'order-independent');
});

test('meetsWCAG: AA/AAA × normal/large at the 4.5 / 3 / 7 thresholds', () => {
  const bw = meetsWCAG('#000', '#fff');
  assert.deepEqual([bw.AA, bw.AAA, bw.AALarge, bw.AAALarge], [true, true, true, true], 'black/white passes all');

  // #767676 on white ≈ 4.54 — just over the AA-normal line (4.5).
  const pass = meetsWCAG('#767676', '#fff', { level: WCAGLevel.AA, size: TextSize.NORMAL });
  near(pass.ratio, 4.54, 0.02); assert.equal(pass.AA, true); assert.equal(pass.passes, true);

  // #777777 on white ≈ 4.48 — just under AA-normal, but over AA-large (3).
  const fail = meetsWCAG('#777777', '#fff', { level: WCAGLevel.AA, size: TextSize.NORMAL });
  near(fail.ratio, 4.48, 0.02); assert.equal(fail.AA, false); assert.equal(fail.passes, false);
  assert.equal(fail.AALarge, true);
  assert.equal(meetsWCAG('#777777', '#fff', { size: TextSize.LARGE }).passes, true, 'large text passes');
  assert.equal(fail.AAA, false, 'fails AAA (7)');
});

// ============================================================================
// 6. Accessible-color adjustment.
// ============================================================================

test('adjustForContrast: a failing pair is moved until it passes', () => {
  const r = adjustForContrast('#999999', '#ffffff', { level: WCAGLevel.AA }); // 2.85 → ≥4.5
  assert.equal(r.met, true);
  assert.ok(contrast(r.color, '#ffffff') >= 4.5 - 1e-6, `now ${contrast(r.color, '#ffffff')}`);
  assert.ok(okL(r.color) < okL('#999999'), 'moved darker against a light bg');
});

test('adjustForContrast: hue is preserved, chroma kept where possible', () => {
  const base = '#3b82f6';
  const r = adjustForContrast(base, '#ffffff', { level: WCAGLevel.AAA });
  hueNear(toOklch(r.color).h, toOklch(base).h, 0.5, 'hue preserved');
  assert.equal(r.met, true);
  assert.ok(contrast(r.color, '#ffffff') >= 7 - 1e-6);
});

test('adjustForContrast: already-passing color is returned unchanged', () => {
  const r = adjustForContrast('#000000', '#ffffff', { level: WCAGLevel.AAA });
  assert.equal(r.met, true);
  near(r.lightnessDelta, 0, 1e-9, 'no movement');
  assert.equal(toHex(r.color), '#000000');
});

test('adjustForContrast: unreachable target is reported, not faked', () => {
  // AAA (7:1) is impossible against mid-gray #808080: max achievable ≈ 5.32 (black).
  const r = adjustForContrast('#ffffff', '#808080', { level: WCAGLevel.AAA });
  assert.equal(r.met, false, 'honestly reports failure');
  assert.ok(r.ratio < 7, 'did not fake passing');
  near(r.ratio, contrast('#000', '#808080'), 0.05, 'returned the best achievable (black)');
});

// ============================================================================
// 7. Palette / harmony.
// ============================================================================

test('shades/tints: monotonic perceptual lightness, in gamut, base excluded', () => {
  const sh = shades('#ff0000', 5);
  assert.equal(sh.length, 5);
  for (let i = 1; i < sh.length; i++) assert.ok(okL(sh[i]) < okL(sh[i - 1]), `shade ${i} darker`);
  assert.ok(okL(sh[0]) < okL('#ff0000'), 'all shades darker than base');
  const channelsValid = (c) => ['r', 'g', 'b'].every((k) => !Number.isNaN(c[k]) && c[k] >= 0 && c[k] <= 255);
  for (const c of sh) assert.ok(channelsValid(c), 'shade in gamut, no NaN');

  const ti = tints('#ff0000', 5);
  for (let i = 1; i < ti.length; i++) assert.ok(okL(ti[i]) > okL(ti[i - 1]), `tint ${i} lighter`);
  assert.ok(okL(ti[0]) > okL('#ff0000'), 'all tints lighter than base');
});

test('shades/tints: 0 / negative / non-integer steps are guarded', () => {
  assert.deepEqual(shades('#ff0000', 0), []);
  assert.deepEqual(shades('#ff0000', -3), []);
  assert.deepEqual(tints('#ff0000', 0), []);
  assert.equal(shades('#ff0000', 3.9).length, 3, 'floored');
});

test('harmony: rotation angles are exactly the standard ones', () => {
  const base = toOklch('#3b82f6').h;
  const wrap = (a) => ((a % 360) + 360) % 360;

  const comp = harmony('#3b82f6', Harmony.COMPLEMENTARY);
  assert.equal(comp.length, 2);
  hueNear(toOklch(comp[0]).h, base, 0.5, 'base first');
  hueNear(toOklch(comp[1]).h, wrap(base + 180), 0.5, 'complement +180');
  hueNear(toOklch(complement('#3b82f6')).h, wrap(base + 180), 0.5, 'complement() helper');

  const tri = harmony('#3b82f6', Harmony.TRIADIC);
  hueNear(toOklch(tri[1]).h, wrap(base + 120), 0.5, 'triadic +120');
  hueNear(toOklch(tri[2]).h, wrap(base + 240), 0.5, 'triadic +240');

  const ana = harmony('#3b82f6', Harmony.ANALOGOUS);
  hueNear(toOklch(ana[1]).h, wrap(base + 30), 0.5, 'analogous +30');
  hueNear(toOklch(ana[2]).h, wrap(base - 30), 0.5, 'analogous −30');

  const split = harmony('#3b82f6', Harmony.SPLIT_COMPLEMENTARY);
  hueNear(toOklch(split[1]).h, wrap(base + 150), 0.5, 'split +150');
  hueNear(toOklch(split[2]).h, wrap(base + 210), 0.5, 'split +210');

  assert.equal(harmony('#3b82f6', Harmony.TETRADIC).length, 4);
  assert.equal(harmony('#3b82f6', Harmony.SQUARE).length, 4);
  assert.throws(() => harmony('#3b82f6', 'pentadic'), TypeError);
});

test('harmony preserves lightness and chroma (only hue rotates)', () => {
  const o = toOklch('#3b82f6');
  for (const c of harmony('#3b82f6', Harmony.TRIADIC)) {
    near(toOklch(c).l, o.l, 0.02, 'L preserved'); // small drift from gamut mapping allowed
  }
});

// ============================================================================
// 8. Gradient interpolation.
// ============================================================================

test('gradient: endpoints exact, right length and ordering', () => {
  const g = gradient('#ff0000', '#0000ff', { steps: 5, space: Space.OKLCH });
  assert.equal(g.length, 5);
  assert.equal(toHex(g[0]), '#ff0000', 't=0 is the start exactly');
  assert.equal(toHex(g[4]), '#0000ff', 't=1 is the end exactly');
  assert.deepEqual(parse('#ff0000'), g[0], 't=0 canonical-exact');
});

test('gradient: OKLCH midpoint is perceptually lighter than the muddy sRGB one', () => {
  const okMid = mix('#ff0000', '#0000ff', 0.5, { space: Space.OKLCH });
  const srgbMid = mix('#ff0000', '#0000ff', 0.5, { space: Space.SRGB });
  assert.notEqual(toHex(okMid), toHex(srgbMid), 'spaces differ');
  assert.ok(perceivedLightness(okMid) > perceivedLightness(srgbMid),
    `OKLCH mid (${perceivedLightness(okMid)}) lighter than sRGB mid (${perceivedLightness(srgbMid)})`);
  assert.equal(toHex(srgbMid), '#800080', 'sRGB mid is the classic dark purple');
});

test('gradient: hue takes the short path (350° → 10° through 0°, not 180°)', () => {
  const a = 'oklch(0.7 0.15 350)';
  const b = 'oklch(0.7 0.15 10)';
  const midH = toOklch(mix(a, b, 0.5, { space: Space.OKLCH })).h;
  assert.ok(midH > 340 || midH < 20, `short path midpoint near 0°, got ${midH}`);
  // long way: forced the other direction passes through ~180°
  const longH = toOklch(mix(a, b, 0.5, { space: Space.OKLCH, hue: 'longer' })).h;
  assert.ok(longH > 160 && longH < 200, `long path near 180°, got ${longH}`);
});

test('gradient: multi-stop and includeEnds:false', () => {
  const g = gradient(['#ff0000', '#00ff00', '#0000ff'], { steps: 3 });
  assert.equal(toHex(g[0]), '#ff0000');
  assert.equal(toHex(g[1]), '#00ff00', 'middle stop hit at t=0.5');
  assert.equal(toHex(g[2]), '#0000ff');
  const inner = gradient('#000', '#fff', { steps: 3, includeEnds: false });
  assert.notEqual(toHex(inner[0]), '#000000', 'open interval excludes endpoints');
});

test('gradient: 0 / negative / 1 steps guarded', () => {
  assert.deepEqual(gradient('#000', '#fff', { steps: 0 }), []);
  assert.deepEqual(gradient('#000', '#fff', { steps: -5 }), []);
  assert.equal(gradient('#000', '#fff', { steps: 1 }).length, 1);
  assert.throws(() => gradient(['#000'], { steps: 3 }), TypeError, 'needs ≥2 stops');
});

test('mix: t clamps and endpoints are exact', () => {
  assert.equal(toHex(mix('#ff0000', '#0000ff', 0)), '#ff0000');
  assert.equal(toHex(mix('#ff0000', '#0000ff', 1)), '#0000ff');
  assert.equal(toHex(mix('#ff0000', '#0000ff', -5)), '#ff0000', 't<0 clamps');
  assert.equal(toHex(mix('#ff0000', '#0000ff', 5)), '#0000ff', 't>1 clamps');
});

// ============================================================================
// 9. Transforms & small utilities.
// ============================================================================

test('lighten/darken move OKLCH L by the given amount (clamped at extremes)', () => {
  near(okL(lighten('#808080', 0.1)), okL('#808080') + 0.1, 0.02, 'lighten +0.1 L');
  near(okL(darken('#808080', 0.1)), okL('#808080') - 0.1, 0.02, 'darken −0.1 L');
  assert.equal(toHex(lighten('#ffffff', 0.2)), '#ffffff', 'lighten white = no-op');
  assert.equal(toHex(darken('#000000', 0.2)), '#000000', 'darken black = no-op');
});

test('saturate/desaturate move chroma; gray is a no-op for saturate', () => {
  assert.ok(toOklch(saturate('#3b82f6', 0.05)).c > toOklch('#3b82f6').c, 'saturate raises C');
  assert.ok(toOklch(desaturate('#3b82f6', 0.05)).c < toOklch('#3b82f6').c, 'desaturate lowers C');
  assert.equal(toHex(saturate('#808080', 0.1)), '#808080', 'gray stays gray (no invented hue)');
});

test('grayscale drops chroma but keeps lightness; no NaN', () => {
  const g = grayscale('#ff0000');
  near(toOklch(g).c, 0, 1e-6, 'chroma 0');
  near(okL(g), okL('#ff0000'), 1e-6, 'lightness preserved');
  assert.equal(toHsl(g).s, 0, 'desaturated in HSL too');
});

test('rotateHue wraps around the circle', () => {
  hueNear(toOklch(rotateHue('#ff0000', 180)).h, toOklch('#ff0000').h + 180, 0.5);
  hueNear(toOklch(rotateHue('#ff0000', 360)).h, toOklch('#ff0000').h, 0.5, 'full turn = identity hue');
});

test('isLight / isDark / preferredTextColor', () => {
  assert.equal(isLight('#ffffff'), true);
  assert.equal(isDark('#000000'), true);
  assert.equal(isLight('#ffff00'), true, 'yellow is light');
  assert.equal(isDark('#0000ff'), true, 'pure blue is dark');
  assert.equal(toHex(preferredTextColor('#ffffff')), '#000000', 'black text on white');
  assert.equal(toHex(preferredTextColor('#000000')), '#ffffff', 'white text on black');
  // the choice maximizes contrast
  const bg = '#3b82f6';
  const pick = preferredTextColor(bg);
  assert.ok(contrast(pick, bg) >= contrast(grayscale(bg), bg) || true);
  assert.ok(contrast(pick, bg) >= Math.max(contrast('#000', bg), contrast('#fff', bg)) - 1e-9);
});

test('composite: source-over flattening of a translucent fg', () => {
  assert.equal(toHex(composite('rgba(255,0,0,0.5)', '#ffffff')), '#ff8080', 'red 50% over white');
  assert.equal(toHex(composite('rgba(0,0,0,1)', '#ffffff')), '#000000', 'opaque fg wins');
  assert.equal(toHex(composite('rgba(0,0,0,0)', '#ff0000')), '#ff0000', 'transparent fg = bg');
  // contrast of a translucent color is the composited contrast
  const flat = composite('rgba(0,0,0,0.5)', '#ffffff');
  near(contrast(flat, '#ffffff'), contrast('#808080', '#ffffff'), 0.05, '50% black ≈ gray');
});

// ============================================================================
// 10. Edge cases.
// ============================================================================

test('achromatic colors never produce NaN anywhere', () => {
  for (const gray of ['#000000', '#ffffff', '#808080', '#1a1a1a']) {
    for (const v of Object.values(toOklch(gray))) assert.equal(Number.isNaN(v), false, `${gray} oklch`);
    for (const v of Object.values(toHsl(gray))) assert.equal(Number.isNaN(v), false, `${gray} hsl`);
    assert.equal(toOklch(gray).h, 0, 'achromatic hue forced to 0');
    assert.ok(!Number.isNaN(complement(gray).r), `${gray} complement`);
  }
});

test('out-of-gamut OKLCH is gamut-mapped (chroma reduced, L preserved), no NaN', () => {
  // C=0.4 at L=0.9 hue 120 is far outside sRGB; must map to a displayable color.
  const c = parse('oklch(0.9 0.4 120)');
  assert.ok(c, 'parsed and mapped');
  for (const k of ['r', 'g', 'b']) assert.ok(!Number.isNaN(c[k]) && c[k] >= 0 && c[k] <= 255, `${k} in [0,255]`);
  near(toOklch(c).l, 0.9, 0.02, 'lightness preserved by the map');
  assert.ok(toOklch(c).c < 0.4, 'chroma was reduced');
});

test('alpha is preserved through conversions and transforms', () => {
  near(lighten('rgba(255,0,0,0.4)', 0.1).a, 0.4, 1e-9, 'lighten keeps alpha');
  near(rotateHue('rgba(255,0,0,0.4)', 90).a, 0.4, 1e-9, 'rotateHue keeps alpha');
  near(parse('oklch(0.6 0.2 30 / 0.3)').a, 0.3, 1e-9, 'oklch carries alpha');
  near(grayscale('rgba(255,0,0,0.4)').a, 0.4, 1e-9, 'grayscale keeps alpha');
});

// ============================================================================
// 11. color() wrapper — thin sugar over the functions.
// ============================================================================

test('color() wrapper: chainable, immutable, delegates to the functions', () => {
  assert.equal(color('#ff0000').toHex(), '#ff0000');
  assert.equal(color('#ff0000').lighten(0).toHex(), '#ff0000');
  assert.equal(color('#808080').darken(0.1).toHex(), toHex(darken('#808080', 0.1)));
  near(color('#000').contrast('#fff'), 21, 1e-9);
  assert.equal(color('#ffffff').preferredTextColor().toHex(), '#000000');
  assert.equal(color('#ff0000').harmony(Harmony.COMPLEMENTARY).length, 2);
  assert.equal(color('#ff0000').shades(3).length, 3);
  // immutability: a transform does not mutate the source
  const c = color('#ff0000');
  c.lighten(0.2);
  assert.equal(c.toHex(), '#ff0000', 'source unchanged');
});

// ============================================================================
// 12. Headless boundary — no DOM anywhere, imports only from shared/.
// ============================================================================

test('engine source touches no DOM globals and ships no markup/CSS', () => {
  const src = readFileSync(fileURLToPath(new URL('./color-engine.js', import.meta.url)), 'utf8');
  // Strip block (/** */) and line (//) comments first — the prose legitimately
  // says "document"/"window"; only actual code must be DOM-free.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const banned of ['document', 'window', 'navigator', 'localStorage', 'fetch(', 'globalThis']) {
    assert.equal(code.includes(banned), false, `engine code must not reference ${banned}`);
  }
});

test('engine imports only from ../shared/ (no third-party color library)', () => {
  const src = readFileSync(fileURLToPath(new URL('./color-engine.js', import.meta.url)), 'utf8');
  const specs = [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
  assert.deepEqual(specs, ['../shared/clamp.js'], `unexpected imports: ${specs}`);
});

// ---- run ------------------------------------------------------------------

// ---- regressions from the audit/refactor pass ------------------------------

test('regression: numeric tokens are strictly anchored (trailing garbage rejects)', () => {
  assert.equal(parse('rgb(50abc 0 0)'), null, 'trailing garbage is not silently truncated');
  assert.equal(parse('rgb(1e2 0 0)').r, 100, 'CSS scientific notation parses correctly');
});

test('regression: oklab negative percentage axes keep their sign', () => {
  const negative = parse('oklab(0.6 -50% 0%)');
  const positive = parse('oklab(0.6 50% 0%)');
  assert.ok(negative && positive, 'both parse');
  // -50% of the a-axis pulls toward green; +50% toward red. They must differ.
  assert.ok(negative.g > positive.g, `sign preserved (g ${negative.g} vs ${positive.g})`);
});

test('regression: overflow-to-Infinity tokens are rejected, never NaN channels', () => {
  assert.equal(parse(`rgb(${'9'.repeat(400)} 0 0)`), null, 'Infinity token rejected');
  assert.equal(parse(`oklch(${'9'.repeat(400)} 0.1 30)`), null);
});

test('regression: object inputs with non-finite channels throw the strict TypeError', () => {
  assert.throws(() => toHex({ r: NaN, g: 0, b: 0 }), TypeError);
  assert.throws(() => toHex({ r: 0, g: 0, b: 0, a: Infinity }), TypeError);
});

test('regression: non-finite transform amounts throw instead of poisoning state', () => {
  assert.throws(() => mix('#fff', '#000', NaN), TypeError);
  assert.throws(() => rotateHue('#3b82f6', NaN), TypeError);
  assert.throws(() => lighten('#3b82f6', Infinity), TypeError);
});

test('regression: unknown WCAG level/size and unknown mix space throw like their siblings', () => {
  assert.throws(() => meetsWCAG('#000', '#fff', { level: 'AAAA' }), TypeError);
  assert.throws(() => meetsWCAG('#000', '#fff', { size: 'gigantic' }), TypeError);
  assert.throws(() => mix('#fff', '#000', 0.5, { space: 'lab2000' }), TypeError);
});

test('regression: unknown mix/gradient space throws AT THE ENDPOINTS too, not just the interior', () => {
  // interp() short-circuits at t<=0 / t>=1 before its switch validates `space`,
  // so an unknown space used to slip through silently whenever t hit (or clamped
  // to) an endpoint. mix()/gradient() must now validate `space` eagerly — the
  // same input rejected in the interior must be rejected at the boundary.
  assert.throws(() => mix('#fff', '#000', 0, { space: 'lab2000' }), TypeError);   // t at endpoint
  assert.throws(() => mix('#fff', '#000', 1, { space: 'lab2000' }), TypeError);   // t at endpoint
  assert.throws(() => mix('#fff', '#000', -5, { space: 'lab2000' }), TypeError);  // t clamps to 0
  // gradient: steps=1 returns the start color without ever calling interp; steps=2
  // only samples t=0 and t=1 — both previously bypassed the space check.
  assert.throws(() => gradient('#f00', '#00f', { steps: 1, space: 'lab2000' }), TypeError);
  assert.throws(() => gradient('#f00', '#00f', { steps: 2, space: 'lab2000' }), TypeError);
  // valid spaces still work at the endpoints
  assert.equal(mix('#fff', '#000', 0, { space: Space.SRGB }) != null, true);
  assert.equal(gradient('#f00', '#00f', { steps: 2, space: Space.SRGB }).length, 2);
});

test('regression: inherited Object.prototype names as WCAG level throw, not silent wrong verdict', () => {
  // The threshold rows ({ AA, AAA }) inherit every Object.prototype member, so a
  // bare `row[level] == null` guard would resolve e.g. 'hasOwnProperty' to a
  // Function and use it as the threshold — ratio >= Function coerces to NaN, so
  // `passes` would silently be false even at the maximum ratio of 21.
  for (const name of ['toString', 'hasOwnProperty', 'constructor', '__proto__', 'valueOf', 'isPrototypeOf']) {
    assert.throws(() => meetsWCAG('#000', '#fff', { level: name }), TypeError);
    assert.throws(() => adjustForContrast('#000', '#fff', { level: name }), TypeError);
  }
});

test('regression: inherited Object.prototype names as harmony type throw, not a misleading error', () => {
  // HARMONY_ANGLES is a plain object, so a bare `HARMONY_ANGLES[type]` lookup
  // resolves e.g. 'toString' to a Function (truthy). A `!angles` guard would let
  // it through and then throw the misleading `angles.map is not a function`
  // instead of the contract's clean `Unknown harmony: <type>`.
  for (const name of ['toString', 'constructor', 'valueOf', '__proto__', 'hasOwnProperty', 'isPrototypeOf']) {
    assert.throws(() => harmony('#ff0000', name), TypeError);
  }
  // A plainly unknown type still throws, and every real harmony name still works.
  assert.throws(() => harmony('#ff0000', 'bogus'), TypeError);
  for (const name of Object.values(Harmony)) {
    assert.equal(Array.isArray(harmony('#ff0000', name)), true, `${name} still resolves`);
  }
});

test('regression: unknown hue direction throws instead of silently using the short arc', () => {
  // 'shorter' / 'longer' are the only valid arcs; an unknown value must throw,
  // not fall back to 'shorter' like the other enum-options here.
  assert.throws(() => mix('oklch(0.7 0.15 350)', 'oklch(0.7 0.15 10)', 0.5, { hue: 'bogus' }), TypeError);
  assert.throws(() => gradient('#f00', '#00f', { steps: 5, hue: 'bogus' }), TypeError);
  // the valid values still work
  assert.equal(mix('#f00', '#00f', 0.5, { hue: 'shorter' }) != null, true);
  assert.equal(mix('#f00', '#00f', 0.5, { hue: 'longer' }) != null, true);
});

test('regression: black shades and white tints are degenerate (no entry past the extreme)', () => {
  // Documented behavior: a base already at L=0 has nothing darker, so every
  // shade is black; symmetrically every tint of white is white.
  for (const c of shades('#000000', 3)) assert.equal(toHex(c), '#000000', 'black has no darker shade');
  for (const c of tints('#ffffff', 3)) assert.equal(toHex(c), '#ffffff', 'white has no lighter tint');
});

test('regression: the Color wrapper exposes composite()', () => {
  const over = color('rgb(255 0 0 / 0.5)').composite('#ffffff');
  const direct = composite('rgb(255 0 0 / 0.5)', '#ffffff');
  assert.deepEqual(over.rgba, direct, 'wrapper matches the functional API');
});

test('regression: gradient/shades/tints cap an enormous step count (DoS guard)', () => {
  // A large finite count (toWholeStep accepts it, no upper bound) would allocate
  // that many entries and run a per-step OKLCH + gamut binary search, hanging the
  // tab. The consumer count is capped at MAX_STEPS (1024) like the other consumer
  // counts in the repo — so a 2,000,000 request returns at most 1024 entries fast.
  const t0 = Date.now();
  const g = gradient('#ff0000', '#0000ff', { steps: 2_000_000 });
  assert.equal(g.length, 1024, 'gradient steps capped at 1024');
  assert.equal(shades('#ff0000', 2_000_000).length, 1024, 'shades steps capped at 1024');
  assert.equal(tints('#ff0000', 2_000_000).length, 1024, 'tints steps capped at 1024');
  assert.ok(Date.now() - t0 < 2000, 'capped calls return quickly, no multi-second hang');
  // Counts at or below the cap are untouched, and the small-count guards still hold.
  assert.equal(gradient('#000', '#fff', { steps: 5 }).length, 5, 'normal counts unchanged');
  assert.equal(shades('#ff0000', 7).length, 7, 'normal shades count unchanged');
  assert.equal(tints('#ff0000', 7).length, 7, 'normal tints count unchanged');
  assert.deepEqual(gradient('#000', '#fff', { steps: 0 }), [], 'zero-step guard preserved');
  assert.deepEqual(shades('#ff0000', -3), [], 'negative-step guard preserved');
});

test('regression: toHex throws TypeError on an unknown alpha mode (no silent fallback to never)', () => {
  assert.throws(() => toHex('#ff0000', { alpha: 'sometimes' }), TypeError);
  // the three documented modes still work
  assert.equal(toHex('rgba(255,0,0,0.5)', { alpha: 'never' }), '#ff0000');
  assert.equal(toHex('#ff0000', { alpha: 'always' }), '#ff0000ff');
});

if (isMain(import.meta.url)) report({ exit: true });
export { };
