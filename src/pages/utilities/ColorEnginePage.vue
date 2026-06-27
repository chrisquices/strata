<script setup>
import { ref, computed, watch } from 'vue';
import { ChevronDown, Check, Copy, AlertCircle, ArrowRight,
  Code2, Eye, SlidersHorizontal, Layers, Palette, Gauge, Sparkles, Box } from '@lucide/vue';
import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import Popover from '../../components/ui/Popover/Popover.vue';
import PopoverTrigger from '../../components/ui/Popover/PopoverTrigger.vue';
import PopoverContent from '../../components/ui/Popover/PopoverContent.vue';
import Button from '../../components/ui/Button/Button.vue';
import Slider from '../../components/ui/Slider/Slider.vue';
import Switch from '../../components/ui/Switch/Switch.vue';
import ColorPanel from './ColorPanel.vue';
import {
  parse,
  format,
  toHex,
  toRgb,
  toHsl,
  toHsv,
  toOklch,
  toOklab,
  contrast,
  relativeLuminance,
  adjustForContrast,
  isLight,
  preferredTextColor,
  composite,
  lighten,
  darken,
  saturate,
  desaturate,
  grayscale,
  rotateHue,
  mix as engineMix,
  gradient as engineGradient,
  shades as engineShades,
  tints,
  harmony,
  Format,
  Harmony,
  Space,
} from '../../lib/color-engine/color-engine.js';

const parseColor = parse;
const rgbToHex = (r, g, b, alpha = 1) => toHex({ r, g, b, a: alpha });
const hsvToRgb = (hue, sat, val) => toRgb(parse(`hsv(${hue} ${sat * 100}% ${val * 100}%)`));
const rgbToHsv = (r, g, b) => {
  const hsv = toHsv({ r, g, b, a: 1 });
  return { h: hsv.h, s: hsv.s / 100, v: hsv.v / 100 };
};
const formats = (color) => ({
  hex: format(color, Format.HEX),
  rgb: format(color, Format.RGB, { legacy: true }),
  hsl: format(color, Format.HSL, { legacy: true }),
  oklch: format(color, Format.OKLCH),
  hsb: format(color, Format.HSV),
});
const channels = (color) => {
  const rgb = toRgb(color);
  const hsl = toHsl(color);
  const hsv = toHsv(color);
  const oklch = toOklch(color);
  const oklab = toOklab(color);
  return {
    rgb,
    hsl,
    hsv,
    oklch,
    oklab: { L: oklab.l, a: oklab.a, b: oklab.b },
  };
};
const contrastRatio = contrast;
const wcag = (ratio) => ({
  ratio: ratio.toFixed(2),
  normalAA: ratio >= 4.5,
  normalAAA: ratio >= 7,
  largeAA: ratio >= 3,
  largeAAA: ratio >= 4.5,
});
const adjustToAccessible = (color, bg) => adjustForContrast(color, bg).color;
const idealTextColor = preferredTextColor;
const flatten = (color, alpha, bg) => composite({ ...color, a: alpha }, bg);
const spin = rotateHue;
const mapSpace = (space) => (space === 'rgb' ? Space.SRGB : space);
const mix = (a, b, t, space, longHue) => engineMix(a, b, t, { space: mapSpace(space), hue: longHue ? 'longer' : 'shorter' });
const gradient = (stops, steps, space, longHue) => engineGradient(stops, { steps, space: mapSpace(space), hue: longHue ? 'longer' : 'shorter' });
const shadesOnly = engineShades;
const SCHEMES = [
  { kind: Harmony.COMPLEMENTARY, label: 'Complementary' },
  { kind: Harmony.ANALOGOUS, label: 'Analogous' },
  { kind: Harmony.TRIADIC, label: 'Triadic' },
  { kind: Harmony.SPLIT_COMPLEMENTARY, label: 'Split complementary' },
  { kind: Harmony.TETRADIC, label: 'Tetradic' },
  { kind: Harmony.SQUARE, label: 'Square' },
];
const scheme = (color, kind) => harmony(color, kind);

const principles = ['Pure & stateless', 'Renders nothing', 'Canonical { r, g, b, a }', 'Perceptual OKLCH / OKLab math', 'Format-agnostic I/O', 'Zero dependencies'];
const apiGroups = [
  { label: 'Parse & serialize', icon: Code2, methods: [
    { sig: 'parse(input: string)', ret: '{ r, g, b, a } | null', desc: 'Read hex (#rgb / #rgba / #rrggbb / #rrggbbaa, with or without #), rgb()/rgba(), hsl()/hsla(), hsv()/hsb(), oklch(), oklab(). Tolerates comma or space syntax, deg/turn/grad/rad hue units and “/ alpha”. Returns null if the string can’t be read.' },
    { sig: 'format(color: ColorInput, format: Format = "hex", options: { legacy?: boolean } = {})', ret: 'string', desc: 'Serialize to a canonical CSS string in the chosen format. Pass legacy: true for comma-form rgb()/hsl().' },
    { sig: 'toHex(color: ColorInput, options: { alpha?: "auto" | "always" | "never" } = { alpha: "auto" })', ret: 'string', desc: 'Lowercase #rrggbb, upgraded to #rrggbbaa when translucent.' },
  ] },
  { label: 'Component views', icon: Eye, methods: [
    { sig: 'toRgb(color: ColorInput)', ret: '{ r, g, b: 0–255, a: 0–1 }', desc: 'Integer sRGB channels.' },
    { sig: 'toHsl(color: ColorInput)', ret: '{ h: 0–360, s, l: 0–100, a }', desc: 'Hue / saturation / lightness.' },
    { sig: 'toHsv(color: ColorInput)', ret: '{ h: 0–360, s, v: 0–100, a }', desc: 'Hue / saturation / value.' },
    { sig: 'toOklch(color: ColorInput)', ret: '{ l: 0–1, c: 0–~0.4, h: 0–360, a }', desc: 'Perceptual cylindrical. Hue is 0 for achromatic colours.' },
    { sig: 'toOklab(color: ColorInput)', ret: '{ l: 0–1, a: number, b: number, alpha }', desc: 'Perceptual Cartesian.' },
  ] },
  { label: 'Single-axis transforms', icon: SlidersHorizontal, methods: [
    { sig: 'lighten(color: ColorInput, amount: number = 0.1)', ret: 'Color', desc: 'Raise OKLCH lightness by an absolute delta (0–1 scale).' },
    { sig: 'darken(color: ColorInput, amount: number = 0.1)', ret: 'Color', desc: 'Lower OKLCH lightness by an absolute delta.' },
    { sig: 'saturate(color: ColorInput, amount: number = 0.1)', ret: 'Color', desc: 'Raise OKLCH chroma. A no-op on greys (no hue to push toward).' },
    { sig: 'desaturate(color: ColorInput, amount: number = 0.1)', ret: 'Color', desc: 'Lower OKLCH chroma, clamped at 0.' },
    { sig: 'grayscale(color: ColorInput)', ret: 'Color', desc: 'Drop all chroma — perceptual grey that preserves OKLab lightness.' },
    { sig: 'rotateHue(color: ColorInput, degrees: number = 180)', ret: 'Color', desc: 'Rotate around the OKLCH hue circle.' },
  ] },
  { label: 'Mixing & gradients', icon: Layers, methods: [
    { sig: 'mix(colorA: ColorInput, colorB: ColorInput, t: number = 0.5, options: { space?: Space, hue?: "shorter" | "longer" } = {})', ret: 'Color', desc: 'Interpolate at t ∈ [0,1] (0 → colorA, 1 → colorB). Defaults to perceptual OKLCH with the shortest-path hue.' },
    { sig: 'gradient(from: ColorInput, to: ColorInput, options?: GradientOptions)', ret: 'Color[]', desc: 'Two-colour ramp.' },
    { sig: 'gradient(stops: ColorInput[], options?: GradientOptions)', ret: 'Color[]', desc: 'Multi-stop ramp (≥ 2 stops). GradientOptions = { steps = 11, space = "oklch", hue = "shorter", includeEnds = true }.' },
  ] },
  { label: 'Palette & harmony', icon: Palette, methods: [
    { sig: 'shades(color: ColorInput, steps: number = 5)', ret: 'Color[]', desc: 'Progressively darker variants (OKLCH lightness toward black, base excluded).' },
    { sig: 'tints(color: ColorInput, steps: number = 5)', ret: 'Color[]', desc: 'Progressively lighter variants (toward white, base excluded).' },
    { sig: 'harmony(color: ColorInput, type: Harmony = "complementary")', ret: 'Color[]', desc: 'Hue-rotation scheme for the family, base colour first.' },
    { sig: 'complement(color: ColorInput)', ret: 'Color', desc: 'The opposite hue (+180° in OKLCH).' },
  ] },
  { label: 'Contrast & accessibility', icon: Gauge, methods: [
    { sig: 'relativeLuminance(color: ColorInput)', ret: 'number (0–1)', desc: 'WCAG 2.x relative luminance. Alpha is ignored.' },
    { sig: 'contrast(colorA: ColorInput, colorB: ColorInput)', ret: 'number (1–21)', desc: 'WCAG contrast ratio between two colours.' },
    { sig: 'meetsWCAG(foreground: ColorInput, background: ColorInput, options: { level?: WCAGLevel, size?: TextSize } = { level: "AA", size: "normal" })', ret: '{ ratio, AA, AAA, AALarge, AAALarge, passes }', desc: 'Every level/size verdict plus passes for the requested target.' },
    { sig: 'adjustForContrast(color: ColorInput, background: ColorInput, options: { level?: WCAGLevel, size?: TextSize } = { level: "AA", size: "normal" })', ret: '{ color, ratio, met, lightnessDelta }', desc: 'Nudge OKLCH lightness only (hue/chroma kept) until the target is met; the smaller move wins. met is false, honestly, when unreachable.' },
  ] },
  { label: 'Perception & compositing', icon: Sparkles, methods: [
    { sig: 'perceivedLightness(color: ColorInput)', ret: 'number (0–1)', desc: 'OKLab L — the principled “how light” measure.' },
    { sig: 'isLight(color: ColorInput)', ret: 'boolean', desc: 'True when black text reads better than white on this colour.' },
    { sig: 'isDark(color: ColorInput)', ret: 'boolean', desc: 'The complement of isLight.' },
    { sig: 'preferredTextColor(color: ColorInput)', ret: 'Color', desc: 'Black or white — whichever has higher contrast on the colour.' },
    { sig: 'composite(foreground: ColorInput, background: ColorInput)', ret: 'Color', desc: 'Alpha-composite (source-over) a translucent colour over a background, in gamma sRGB.' },
  ] },
  { label: 'color() wrapper', icon: Box, methods: [
    { sig: 'color(input: ColorInput)', ret: 'Color', desc: 'Optional immutable, chainable sugar over every function above — e.g. color("#9B6FE0").lighten(0.1).mix("#fff", 0.2).toHex(). Transforms return a new Color; it holds no state. The standalone functions remain the real API.' },
  ] },
];
const engineEnums = [
  { name: 'Format', values: ['hex', 'rgb', 'hsl', 'hsv', 'oklch', 'oklab'], note: 'Serialization targets for format(). hsv is a documented non-CSS extension.' },
  { name: 'Space', values: ['oklch', 'oklab', 'hsl', 'srgb', 'lrgb'], note: 'Interpolation spaces for mix() / gradient(). OKLCH is the perceptual default.' },
  { name: 'Harmony', values: ['complementary', 'analogous', 'triadic', 'split-complementary', 'tetradic', 'square'], note: 'Hue-rotation families, applied in OKLCH.' },
  { name: 'WCAGLevel', values: ['AA', 'AAA'], note: 'Conformance levels.' },
  { name: 'TextSize', values: ['normal', 'large'], note: 'Picks the WCAG threshold — large text gets a lower bar.' },
];

function highlightSig(sig) {
  const re = /(\s+)|("[^"]*")|(\d+\.?\d*)|([A-Za-z_]\w*)|([()])|([{}\[\]:,?|=.<>\/-]+)/g;
  const raw = [];
  let m;
  while ((m = re.exec(sig))) {
    if (m[1]) raw.push({ t: m[1], k: 'ws' });
    else if (m[2]) raw.push({ t: m[2], k: 'str' });
    else if (m[3]) raw.push({ t: m[3], k: 'num' });
    else if (m[4]) raw.push({ t: m[4], k: 'ident' });
    else if (m[5]) raw.push({ t: m[5], k: 'paren' });
    else raw.push({ t: m[6], k: 'punct' });
  }
  const nextSig = (i) => { let j = i + 1; while (j < raw.length && raw[j].k === 'ws') j++; return raw[j]; };
  return raw.map((tok, i) => {
    if (tok.k === 'ws') return { text: tok.t, cls: 'plain' };
    if (tok.k === 'str') return { text: tok.t, cls: 'string' };
    if (tok.k === 'num') return { text: tok.t, cls: 'number' };
    if (tok.k === 'paren') return { text: tok.t, cls: 'paren' };
    if (tok.k === 'punct') return { text: tok.t, cls: 'punct' };
    const nx = nextSig(i);
    if (nx && nx.k === 'paren' && nx.t === '(') return { text: tok.t, cls: 'name' };
    if (nx && nx.k === 'punct' && (nx.t[0] === ':' || nx.t[0] === '?')) return { text: tok.t, cls: 'param' };
    return { text: tok.t, cls: 'type' };
  });
}
const SYNTAX_COLOR = { name: 'rgb(240 240 243)', paren: 'rgb(240 240 243)', param: 'rgb(198 199 205)', type: 'rgb(160 161 167)', string: 'rgb(100 170 125)', number: 'rgb(214 162 76)', punct: 'rgb(104 106 113)', plain: 'inherit' };

const h = ref(265), s = ref(0.62), v = ref(0.86), a = ref(1);
const recents = ref([]);
const rgb = computed(() => hsvToRgb(h.value, s.value, v.value));
const cssOpaque = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`);
const text = computed(() => idealTextColor(rgb.value));
const textCss = computed(() => `rgb(${text.value.r}, ${text.value.g}, ${text.value.b})`);

const CHECKER = 'background-image:linear-gradient(45deg,#3a3a3e 25%,transparent 25%,transparent 75%,#3a3a3e 75%),linear-gradient(45deg,#3a3a3e 25%,transparent 25%,transparent 75%,#3a3a3e 75%);background-size:10px 10px;background-position:0 0,5px 5px;background-color:#1a1a1e;';
const hx = (c) => rgbToHex(c.r, c.g, c.b);

const committed = ref({ h: 265, s: 0.62, v: 0.86, a: 1 });
const applyMode = ref('live');
const open = ref(false);
let baseline = { h: h.value, s: s.value, v: v.value, a: a.value };
watch([h, s, v, a, applyMode], () => { if (applyMode.value === 'live') committed.value = { h: h.value, s: s.value, v: v.value, a: a.value }; }, { immediate: true });
const committedRgb = computed(() => hsvToRgb(committed.value.h, committed.value.s, committed.value.v));
const committedCss = computed(() => `rgba(${committedRgb.value.r}, ${committedRgb.value.g}, ${committedRgb.value.b}, ${committed.value.a})`);
const committedHex = computed(() => rgbToHex(committedRgb.value.r, committedRgb.value.g, committedRgb.value.b, committed.value.a));
watch(open, (o) => { if (o) baseline = { h: h.value, s: s.value, v: v.value, a: a.value }; else if (applyMode.value === 'confirm') { h.value = baseline.h; s.value = baseline.s; v.value = baseline.v; a.value = baseline.a; } });
function applyColor() { committed.value = { h: h.value, s: s.value, v: v.value, a: a.value }; open.value = false; }
function cancelColor() { h.value = baseline.h; s.value = baseline.s; v.value = baseline.v; a.value = baseline.a; open.value = false; }
function applyHex(str) { const p = parseColor(str); if (p) { const got = rgbToHsv(p.r, p.g, p.b); if (got.s > 0.001 && got.v > 0.001) h.value = got.h; s.value = got.s; v.value = got.v; } }

const parseInput = ref('oklch(0.7 0.16 295)');
const parsed = computed(() => parseColor(parseInput.value));
const legacy = ref(false);
const showAlpha = ref(true);
const fmt = computed(() => formats({ ...rgb.value, a: showAlpha.value ? a.value : 1 }));
function styleOut(key, value) {
  if (!legacy.value && (key === 'rgb' || key === 'hsl')) {
    return value.replace(/^(rgb|hsl)a?\(([^)]+)\)$/, (_m, fn, inner) => {
      const parts = inner.split(',').map((x) => x.trim());
      const alpha = parts.length === 4 ? ' / ' + parts[3] : '';
      return `${fn}(${parts.slice(0, 3).join(' ')}${alpha})`;
    });
  }
  return value;
}
const copied = ref(null);
async function copy(key, value) { try { await navigator.clipboard.writeText(value); } catch (_) {} copied.value = key; setTimeout(() => { if (copied.value === key) copied.value = null; }, 1100); }
const FORMAT_ROWS = [['hex', 'HEX'], ['rgb', 'RGB'], ['hsl', 'HSL'], ['oklch', 'OKLCH'], ['hsb', 'HSB']];
const parseExamples = ['#9B6FE0', 'rgb(100% 0 40%)', 'hsl(265 60% 55%)', 'oklch(0.7 0.16 295)', 'hsv(280,50,90)'];

const ch = computed(() => channels(rgb.value));
const channelRows = computed(() => {
  const c = ch.value;
  return [
    ['RGB', `${c.rgb.r}, ${c.rgb.g}, ${c.rgb.b}`],
    ['HSL', `${c.hsl.h}°, ${c.hsl.s}%, ${c.hsl.l}%`],
    ['HSV', `${c.hsv.h}°, ${c.hsv.s}%, ${c.hsv.v}%`],
    ['OKLCH', `${c.oklch.l}, ${c.oklch.c}, ${c.oklch.h}`],
    ['OKLAB', `${c.oklab.L}, ${c.oklab.a}, ${c.oklab.b}`],
  ];
});

const amt = ref(0.15);
const spinDeg = ref(45);
const transforms = computed(() => [
  { label: 'Lighten', rgb: lighten(rgb.value, amt.value) },
  { label: 'Darken', rgb: darken(rgb.value, amt.value) },
  { label: 'Saturate', rgb: saturate(rgb.value, amt.value) },
  { label: 'Desaturate', rgb: desaturate(rgb.value, amt.value) },
  { label: 'Grayscale', rgb: grayscale(rgb.value) },
  { label: `Hue +${spinDeg.value}°`, rgb: spin(rgb.value, spinDeg.value) },
]);

const mixA = ref('#2A6FDB');
const mixB = ref('#D9A441');
const mixT = ref(0.5);
const mixSpace = ref('oklch');
const mixLong = ref(false);
const mixArgbP = computed(() => parseColor(mixA.value) ?? { r: 42, g: 111, b: 219 });
const mixBrgbP = computed(() => parseColor(mixB.value) ?? { r: 217, g: 164, b: 65 });
const mixResult = computed(() => mix(mixArgbP.value, mixBrgbP.value, mixT.value, mixSpace.value, mixLong.value));
const mixRamp = computed(() => gradient([mixArgbP.value, mixBrgbP.value], 11, mixSpace.value, mixLong.value));

const gradStops = computed(() => [{ r: rgb.value.r, g: rgb.value.g, b: rgb.value.b }, spin(rgb.value, 60), spin(rgb.value, 160)]);
const gradSwatches = computed(() => gradient(gradStops.value, 13, 'oklch', false));

const bgChoice = ref('white');
const bgRgb = computed(() => (bgChoice.value === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }));
const ratio = computed(() => contrastRatio(rgb.value, bgRgb.value));
const wc = computed(() => wcag(ratio.value));
const lum = computed(() => relativeLuminance(rgb.value));
const adjusted = computed(() => adjustToAccessible(rgb.value, bgRgb.value, 4.5));
const flatA = ref(0.5);
const flattened = computed(() => flatten(rgb.value, flatA.value, bgRgb.value));
const wcChips = computed(() => [['Normal AA', wc.value.normalAA], ['Normal AAA', wc.value.normalAAA], ['Large AA', wc.value.largeAA], ['Large AAA', wc.value.largeAAA]]);

const shadeRow = computed(() => shadesOnly(rgb.value, 6).reverse());
const tintRow = computed(() => tints(rgb.value, 6));
const shadeToBase = computed(() => [...shadeRow.value, rgb.value]);
const baseToTints = computed(() => [rgb.value, ...tintRow.value]);
const mixTextColor = computed(() => toHex(idealTextColor(mixResult.value)));
</script>

<template>
  <ComponentHeader>
    <ComponentHeaderTitle>Color Engine</ComponentHeaderTitle>
    <ComponentHeaderDescription>
      A headless colour engine: parse almost any string, convert between HEX / RGB / HSL /
      HSV / OKLCH / OKLAB, read every channel, transform along a single axis, mix and
      build gradients across colour spaces, check WCAG contrast, and generate harmony
      schemes. Pick a working colour below — every section recomputes live.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <div class="flex flex-col gap-16">
    <section class="order-2 flex flex-col gap-7">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Headless</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine API</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">
          Everything <code class="rounded-small bg-input px-1.5 py-0.5 font-mono text-[12px] text-foreground">color-engine.js</code>
          exposes — pure functions, colour in → values out. It renders nothing and holds no state; the examples
          further down are this exact surface, wired to controls.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <span v-for="p in principles" :key="p" class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted">
          <span class="size-1.5 rounded-full bg-success"></span>{{ p }}
        </span>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <div v-for="group in apiGroups" :key="group.label" class="flex flex-col gap-4 rounded-large border border-border bg-surface p-5">
          <div class="flex items-center gap-2">
            <component :is="group.icon" class="size-icon-small text-faint" />
            <h4 class="text-xs font-medium uppercase tracking-widest text-faint">{{ group.label }}</h4>
          </div>
          <div class="flex flex-col divide-y divide-border/50">
            <div v-for="m in group.methods" :key="m.sig" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
              <code class="font-mono text-[12.5px] leading-snug"><span v-for="(tok, i) in highlightSig(m.sig)" :key="i" :style="{ color: SYNTAX_COLOR[tok.cls], fontWeight: tok.cls === 'name' ? '600' : undefined }">{{ tok.text }}</span></code>
              <span v-if="m.ret" class="font-mono text-[11px]"><span style="color: rgb(104 106 113)">→ </span><span style="color: rgb(160 161 167)">{{ m.ret }}</span></span>
              <p class="mt-0.5 text-[12px] leading-relaxed text-muted">{{ m.desc }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-large border border-border bg-surface p-5">
          <h4 class="mb-4 text-xs font-medium uppercase tracking-widest text-faint">Enums</h4>
          <div class="flex flex-col gap-4">
            <div v-for="en in engineEnums" :key="en.name" class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
              <code class="w-28 shrink-0 pt-0.5 font-mono text-[12.5px] text-foreground">{{ en.name }}</code>
              <div class="flex flex-col gap-1.5">
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="val in en.values" :key="val" class="rounded-full border border-border bg-input px-2 py-0.5 font-mono text-[10.5px] text-muted">{{ val }}</span>
                </div>
                <p class="text-[11px] text-faint">{{ en.note }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">
          Live implementations of the functions above — a real picker, parser, converters, transforms, gradients
          and accessibility checks. Pick a working colour; every section recomputes through the headless engine.
        </p>
      </div>

      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Working colour</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[19rem_1fr]">
              <div class="rounded-large border border-border bg-surface p-3 shadow-panel">
                <ColorPanel v-model:h="h" v-model:s="s" v-model:v="v" v-model:a="a" v-model:recents="recents" />
              </div>
              <div class="flex flex-col gap-3">
                <div class="flex items-center gap-3">
                  <Popover v-model:open="open">
                    <PopoverTrigger class="inline-flex h-control items-center gap-2.5 rounded-medium border border-border bg-surface pl-1.5 pr-2.5 text-sm text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30">
                      <span class="size-6 overflow-hidden rounded-[5px] border border-border" :style="CHECKER"><span class="block size-full" :style="{ backgroundColor: committedCss }"></span></span>
                      <span class="font-mono text-xs">{{ committedHex }}</span>
                      <ChevronDown class="size-icon-small text-faint" />
                    </PopoverTrigger>
                    <PopoverContent class="w-[19rem] p-3" align="start">
                      <ColorPanel v-model:h="h" v-model:s="s" v-model:v="v" v-model:a="a" v-model:recents="recents" />
                      <div v-if="applyMode === 'confirm'" class="mt-3 flex items-center justify-end gap-2 border-t border-border pt-3">
                        <Button variant="secondary" size="sm" @click="cancelColor">Cancel</Button>
                        <Button variant="primary" size="sm" @click="applyColor"><Check class="size-icon-small" /> Apply</Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-xs">
                    <button type="button" :class="['px-2.5 py-1.5 transition-colors', applyMode === 'live' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="applyMode = 'live'">Live</button>
                    <button type="button" :class="['px-2.5 py-1.5 transition-colors', applyMode === 'confirm' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="applyMode = 'confirm'">Apply / Cancel</button>
                  </div>
                </div>
                <div class="grid flex-1 place-items-center rounded-large border border-border p-6 text-center transition-colors" :style="{ backgroundColor: cssOpaque, color: textCss }">
                  <div>
                    <p class="text-2xl font-semibold tracking-tight">The quick brown fox</p>
                    <p class="mt-1 text-xs opacity-80">Text auto-set to {{ text.r ? 'white' : 'black' }} for best contrast · {{ isLight(rgb) ? 'light' : 'dark' }} surface</p>
                  </div>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Parse &amp; convert</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Parse any string</span>
                <div :class="['flex h-control items-center gap-2 rounded-medium border bg-input px-2.5', parsed ? 'border-border focus-within:border-foreground' : 'border-destructive']">
                  <input v-model="parseInput" spellcheck="false" autocomplete="off" class="w-full bg-transparent font-mono text-xs text-foreground focus-visible:outline-none" />
                  <span v-if="parsed" class="size-5 shrink-0 overflow-hidden rounded border border-border" :style="CHECKER"><span class="block size-full" :style="{ backgroundColor: `rgba(${parsed.r},${parsed.g},${parsed.b},${parsed.a})` }"></span></span>
                  <AlertCircle v-else class="size-icon-small shrink-0 text-destructive" />
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="ex in parseExamples" :key="ex" type="button" class="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] text-muted transition-colors hover:text-foreground" @click="parseInput = ex">{{ ex }}</button>
                </div>
                <button v-if="parsed" type="button" class="self-start rounded-medium border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-background" @click="applyHex(rgbToHex(parsed.r, parsed.g, parsed.b))">Set as working colour</button>
                <p v-else class="text-xs text-destructive">Couldn't parse — try a HEX, rgb(), hsl(), oklch() or hsv() string.</p>
              </div>

              <div class="flex flex-col gap-2.5 rounded-large border border-border bg-surface p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Output formats</span>
                  <div class="flex items-center gap-3 text-[11px] text-muted">
                    <label class="flex items-center gap-1.5"><span>Legacy</span><Switch v-model:checked="legacy" /></label>
                    <label class="flex items-center gap-1.5"><span>Alpha</span><Switch v-model:checked="showAlpha" /></label>
                  </div>
                </div>
                <div v-for="[key, label] in FORMAT_ROWS" :key="key" class="flex items-center gap-1.5">
                  <span class="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">{{ label }}</span>
                  <div class="flex h-control-small flex-1 items-center rounded-medium border border-border bg-input px-2"><span class="truncate font-mono text-xs text-foreground">{{ styleOut(key, fmt[key]) }}</span></div>
                  <button type="button" :aria-label="`Copy ${label}`" class="grid size-control-small shrink-0 place-items-center rounded-medium border border-border text-muted transition-colors hover:text-foreground" @click="copy(key, styleOut(key, fmt[key]))">
                    <Check v-if="copied === key" class="size-icon-small text-success" /><Copy v-else class="size-icon-small" />
                  </button>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Channels</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              <div v-for="[label, val] in channelRows" :key="label" class="flex flex-col gap-1 rounded-large border border-border bg-surface p-3">
                <span class="text-[10px] font-medium uppercase tracking-widest text-faint">{{ label }}</span>
                <span class="font-mono text-xs text-foreground">{{ val }}</span>
              </div>
            </div>
            <p class="mt-3 text-xs text-faint">Luminance <span class="font-mono text-muted">{{ lum.toFixed(3) }}</span> · reads as <span class="text-muted">{{ isLight(rgb) ? 'light' : 'dark' }}</span>.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Transforms</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="mb-4 flex flex-wrap items-center gap-x-8 gap-y-3">
              <div class="flex flex-1 items-center gap-3" style="min-width:220px">
                <span class="w-16 shrink-0 text-xs text-muted">Amount</span>
                <Slider v-model="amt" :min="0.02" :max="0.4" :step="0.01" />
                <span class="w-10 shrink-0 text-right font-mono text-[11px] text-faint">{{ Math.round(amt * 100) }}%</span>
              </div>
              <div class="flex flex-1 items-center gap-3" style="min-width:220px">
                <span class="w-16 shrink-0 text-xs text-muted">Hue spin</span>
                <Slider v-model="spinDeg" :min="15" :max="180" :step="5" />
                <span class="w-10 shrink-0 text-right font-mono text-[11px] text-faint">{{ spinDeg }}°</span>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
              <button v-for="t in transforms" :key="t.label" type="button" class="group flex flex-col gap-1.5 focus-visible:outline-none" @click="applyHex(hx(t.rgb))">
                <span class="h-16 w-full rounded-medium border border-border transition-transform group-hover:scale-[1.03]" :style="{ backgroundColor: hx(t.rgb) }"></span>
                <span class="text-[10px] text-muted">{{ t.label }}</span>
                <span class="font-mono text-[10px] text-faint">{{ hx(t.rgb) }}</span>
              </button>
            </div>
            <p class="mt-3 text-xs text-faint">Each swatch is the working colour after one transform. Click to make it the new working colour. Grayscale uses true perceptual luminance, not a channel average.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Mix two colours</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="rounded-large border border-border bg-surface p-5">
              <div class="flex flex-wrap items-end gap-x-6 gap-y-4">
                <div class="flex items-center gap-2">
                  <span class="size-9 shrink-0 rounded-medium border border-border" :style="{ backgroundColor: hx(mixArgbP) }"></span>
                  <input v-model="mixA" spellcheck="false" class="h-control-small w-28 rounded-medium border border-border bg-input px-2 font-mono text-xs text-foreground focus-visible:border-foreground focus-visible:outline-none" />
                </div>
                <ArrowRight class="mb-2 size-icon-small text-faint" />
                <div class="flex items-center gap-2">
                  <span class="size-9 shrink-0 rounded-medium border border-border" :style="{ backgroundColor: hx(mixBrgbP) }"></span>
                  <input v-model="mixB" spellcheck="false" class="h-control-small w-28 rounded-medium border border-border bg-input px-2 font-mono text-xs text-foreground focus-visible:border-foreground focus-visible:outline-none" />
                </div>
                <div class="flex flex-col gap-1.5">
                  <span class="text-[10px] uppercase tracking-wider text-faint">Space</span>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                    <button v-for="sp in ['rgb', 'hsl', 'oklch']" :key="sp" type="button" :class="['px-2 py-1 uppercase transition-colors', mixSpace === sp ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="mixSpace = sp">{{ sp }}</button>
                  </div>
                </div>
                <label class="flex items-center gap-2 text-[11px] text-muted"><span>Long hue</span><Switch v-model:checked="mixLong" /></label>
              </div>

              <div class="mt-5 flex items-center gap-3">
                <span class="w-12 shrink-0 text-xs text-muted">Mix</span>
                <Slider v-model="mixT" :min="0" :max="1" :step="0.01" />
                <span class="grid size-10 shrink-0 place-items-center rounded-medium border border-border font-mono text-[10px]" :style="{ backgroundColor: hx(mixResult), color: mixTextColor }">{{ Math.round(mixT * 100) }}</span>
              </div>

              <div class="mt-4 flex h-9 overflow-hidden rounded-medium border border-border">
                <span v-for="(c, i) in mixRamp" :key="i" class="flex-1" :style="{ backgroundColor: hx(c) }"></span>
              </div>
            </div>
            <p class="mt-3 text-xs text-faint">Interpolation runs in the chosen space. <span class="text-muted">OKLCH</span> stays perceptually even; <span class="text-muted">Long hue</span> takes the long way around the wheel.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Gradient (multi-stop)</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="flex items-center gap-2.5">
              <template v-for="(st, i) in gradStops" :key="i">
                <span class="size-7 rounded-medium border border-border" :style="{ backgroundColor: hx(st) }"></span>
                <span v-if="i < gradStops.length - 1" class="text-faint">→</span>
              </template>
              <span class="ml-2 text-xs text-faint">{{ gradSwatches.length }} steps through {{ gradStops.length }} stops (working colour + two hue rotations)</span>
            </div>
            <div class="mt-3 flex overflow-hidden rounded-large border border-border">
              <button v-for="(c, i) in gradSwatches" :key="i" type="button" class="h-12 flex-1 transition-transform hover:scale-y-110 focus-visible:outline-none" :style="{ backgroundColor: hx(c) }" :aria-label="hx(c)" @click="applyHex(hx(c))"></button>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Accessibility</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Contrast</span>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                    <button type="button" :class="['px-2 py-0.5', bgChoice === 'white' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="bgChoice = 'white'">White</button>
                    <button type="button" :class="['px-2 py-0.5', bgChoice === 'black' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="bgChoice = 'black'">Black</button>
                  </div>
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="font-mono text-2xl tabular-nums text-foreground">{{ wc.ratio }}</span>
                  <span class="text-sm text-faint">: 1</span>
                </div>
                <div class="flex flex-wrap gap-1.5">
                  <span v-for="[label, pass] in wcChips" :key="label" :class="['inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', pass ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive']">
                    <Check v-if="pass" class="size-icon-extra-small" /><AlertCircle v-else class="size-icon-extra-small" />{{ label }}
                  </span>
                </div>
                <div v-if="!wc.normalAA" class="flex items-center gap-2 rounded-medium border border-border bg-input p-2">
                  <span class="text-[11px] text-muted">Auto-adjust to AA</span>
                  <div class="ml-auto flex items-center gap-1.5">
                    <span class="size-5 rounded border border-border" :style="{ backgroundColor: cssOpaque }"></span>
                    <ArrowRight class="size-icon-small text-faint" />
                    <span class="size-5 rounded border border-border" :style="{ backgroundColor: hx(adjusted) }"></span>
                    <button type="button" class="rounded-medium border border-border px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-surface" @click="applyHex(hx(adjusted))">Apply</button>
                  </div>
                </div>
              </div>

              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Flatten alpha</span>
                <div class="flex items-center gap-3">
                  <span class="w-12 shrink-0 text-xs text-muted">Alpha</span>
                  <Slider v-model="flatA" :min="0" :max="1" :step="0.01" />
                  <span class="w-9 text-right font-mono text-[11px] text-faint">{{ flatA.toFixed(2) }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <div class="relative h-12 flex-1 overflow-hidden rounded-medium border border-border" :style="bgChoice === 'white' ? 'background:#fff' : 'background:#000'">
                    <div class="absolute inset-0" :style="{ backgroundColor: `rgba(${rgb.r},${rgb.g},${rgb.b},${flatA})` }"></div>
                  </div>
                  <ArrowRight class="size-icon-small text-faint" />
                  <div class="h-12 flex-1 rounded-medium border border-border" :style="{ backgroundColor: hx(flattened) }"></div>
                </div>
                <p class="text-[11px] text-faint">Translucent colour composited over {{ bgChoice }} → an opaque <span class="font-mono text-muted">{{ hx(flattened) }}</span>.</p>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Shades, tints &amp; harmony</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="flex flex-col gap-5">
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p class="mb-1.5 text-[10px] uppercase tracking-wider text-faint">Shades → base</p>
                  <div class="flex overflow-hidden rounded-medium border border-border">
                    <button v-for="(c, i) in shadeToBase" :key="i" type="button" class="h-8 flex-1" :style="{ backgroundColor: hx(c) }" :aria-label="hx(c)" @click="applyHex(hx(c))"></button>
                  </div>
                </div>
                <div>
                  <p class="mb-1.5 text-[10px] uppercase tracking-wider text-faint">Base → tints</p>
                  <div class="flex overflow-hidden rounded-medium border border-border">
                    <button v-for="(c, i) in baseToTints" :key="i" type="button" class="h-8 flex-1" :style="{ backgroundColor: hx(c) }" :aria-label="hx(c)" @click="applyHex(hx(c))"></button>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div v-for="sc in SCHEMES" :key="sc.kind" class="flex flex-col gap-2">
                  <span class="text-[11px] text-muted">{{ sc.label }}</span>
                  <div class="flex gap-1.5">
                    <button v-for="(c, i) in scheme(rgb, sc.kind)" :key="i" type="button" class="h-10 flex-1 rounded-medium border border-border transition-transform hover:scale-105 focus-visible:outline-none" :style="{ backgroundColor: hx(c) }" :aria-label="hx(c)" @click="applyHex(hx(c))"></button>
                  </div>
                </div>
              </div>
            </div>
            <p class="mt-3 text-xs text-faint">Every swatch is clickable — it becomes the new working colour, so you can chain transforms and schemes off each other.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>
  </div>
</template>
