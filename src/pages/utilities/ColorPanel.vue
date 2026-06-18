<script setup>
import { ref, computed, watch } from 'vue';
import { Pipette, Copy, Check, ChevronRight, AlertCircle } from '@lucide/vue';
import {
  parse,
  format,
  toHex,
  toRgb,
  toHsv,
  contrast,
  adjustForContrast,
  shades as engineShades,
  tints as engineTints,
  harmony as engineHarmony,
  Format,
  Harmony,
} from '../../lib/color-engine/color-engine.js';

const h = defineModel('h', { default: 265 });
const s = defineModel('s', { default: 0.62 });
const v = defineModel('v', { default: 0.86 });
const a = defineModel('a', { default: 1 });
const recents = defineModel('recents', { default: () => [] });
defineProps({ compact: { type: Boolean, default: false } });

const PRESETS = ['#0E0E10', '#F4F4F5', '#CD4B50', '#64AA7D', '#2A6FDB', '#D9A441', '#9B6FE0', '#E08AB0', '#3FB0AD', '#7A7A85'];
const CHECKER = 'background-image:linear-gradient(45deg,#3a3a3e 25%,transparent 25%,transparent 75%,#3a3a3e 75%),linear-gradient(45deg,#3a3a3e 25%,transparent 25%,transparent 75%,#3a3a3e 75%);background-size:12px 12px;background-position:0 0,6px 6px;background-color:#1a1a1e;';

const parseColor = parse;
const rgbToHex = (r, g, b, alpha = 1) => toHex({ r, g, b, a: alpha });
const hsvToRgb = (hue, sat, val) => toRgb(parse(`hsv(${hue} ${sat * 100}% ${val * 100}%)`));
const rgbToHsv = (r, g, b) => {
  const hsv = toHsv({ r, g, b, a: 1 });
  return { h: hsv.h, s: hsv.s / 100, v: hsv.v / 100 };
};
const formats = (color) => ({
  hex: format(color, Format.HEX),
  rgb: format(color, Format.RGB),
  hsl: format(color, Format.HSL),
  oklch: format(color, Format.OKLCH),
  hsb: format(color, Format.HSV),
});
const contrastRatio = contrast;
const wcag = (ratio) => ({
  ratio: ratio.toFixed(2),
  normalAA: ratio >= 4.5,
  normalAAA: ratio >= 7,
  largeAA: ratio >= 3,
  largeAAA: ratio >= 4.5,
});
const adjustToAccessible = (color, bg) => adjustForContrast(color, bg).color;
const shades = (color, steps) => [...engineShades(color, steps).reverse(), color, ...engineTints(color, steps)];
const harmony = (color) => engineHarmony(color, Harmony.ANALOGOUS).map((rgb, index) => ({ label: String(index), rgb }));

const rgb = computed(() => hsvToRgb(h.value, s.value, v.value));
const css = computed(() => `rgba(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b}, ${a.value})`);
const cssOpaque = computed(() => `rgb(${rgb.value.r}, ${rgb.value.g}, ${rgb.value.b})`);
const hueRgb = computed(() => hsvToRgb(h.value, 1, 1));
const hueCss = computed(() => `rgb(${hueRgb.value.r}, ${hueRgb.value.g}, ${hueRgb.value.b})`);
const fmt = computed(() => formats({ ...rgb.value, a: a.value }));

const clamp = (n) => Math.max(0, Math.min(1, n));

function setFromRgb(c, alpha) {
  const got = rgbToHsv(c.r, c.g, c.b);
  if (got.s > 0.001 && got.v > 0.001) h.value = got.h;
  s.value = got.s; v.value = got.v;
  if (alpha !== undefined) a.value = alpha;
}
function selectHex(hex) { const p = parseColor(hex); if (p) { setFromRgb(p, p.a); pushRecent(hex); } }
function pushRecent(hex) { const up = hex.toUpperCase(); recents.value = [up, ...recents.value.filter((x) => x !== up)].slice(0, 8); }

function svSet(e, node) {
  const r = node.getBoundingClientRect();
  s.value = clamp((e.clientX - r.left) / r.width);
  v.value = clamp(1 - (e.clientY - r.top) / r.height);
}
function svDown(e) {
  const node = e.currentTarget;
  node.setPointerCapture?.(e.pointerId); svSet(e, node);
  const mv = (ev) => svSet(ev, node);
  const up = (ev) => { node.releasePointerCapture?.(ev.pointerId); node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up); };
  node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up);
}
function barDown(e, onpos) {
  const node = e.currentTarget;
  const set = (ev) => { const r = node.getBoundingClientRect(); onpos(clamp((ev.clientX - r.left) / r.width)); };
  node.setPointerCapture?.(e.pointerId); set(e);
  const mv = (ev) => set(ev);
  const up = (ev) => { node.releasePointerCapture?.(ev.pointerId); node.removeEventListener('pointermove', mv); node.removeEventListener('pointerup', up); };
  node.addEventListener('pointermove', mv); node.addEventListener('pointerup', up);
}

const hasEyedropper = typeof window !== 'undefined' && 'EyeDropper' in window;
async function eyedrop() {
  if (!hasEyedropper) return;
  try { const res = await new window.EyeDropper().open(); const p = parseColor(res.sRGBHex); if (p) { setFromRgb(p, a.value); pushRecent(res.sRGBHex); } } catch (_) { /* cancelled */ }
}

const fieldDefs = [
  { key: 'hex', label: 'HEX' }, { key: 'rgb', label: 'RGB' }, { key: 'hsl', label: 'HSL' },
  { key: 'oklch', label: 'OKLCH' }, { key: 'hsb', label: 'HSB' },
];
const showAll = ref(false);
const editingKey = ref(null);
const invalidKey = ref(null);
const text = ref({ hex: '', rgb: '', hsl: '', oklch: '', hsb: '' });
watch(fmt, (f) => { for (const d of fieldDefs) if (editingKey.value !== d.key) text.value[d.key] = f[d.key]; }, { immediate: true });
function onFieldInput(key, value) {
  editingKey.value = key; text.value[key] = value;
  const p = parseColor(value);
  if (p) { invalidKey.value = null; setFromRgb(p, p.a); } else { invalidKey.value = key; }
}
function onFieldBlur() { editingKey.value = null; invalidKey.value = null; }

const copied = ref(null);
async function copy(key, value) { try { await navigator.clipboard.writeText(value); } catch (_) { /* ignore */ } copied.value = key; setTimeout(() => { if (copied.value === key) copied.value = null; }, 1200); }

const showA11y = ref(false);
const bgChoice = ref('white');
const bgRgb = computed(() => (bgChoice.value === 'white' ? { r: 255, g: 255, b: 255 } : { r: 0, g: 0, b: 0 }));
const ratio = computed(() => contrastRatio(rgb.value, bgRgb.value));
const wc = computed(() => wcag(ratio.value));
const adjusted = computed(() => adjustToAccessible(rgb.value, bgRgb.value, 4.5));
const adjustedHex = computed(() => rgbToHex(adjusted.value.r, adjusted.value.g, adjusted.value.b));

const showPalette = ref(false);
const shadeList = computed(() => shades(rgb.value, 4));
const harmonyList = computed(() => harmony(rgb.value));
const wcChips = computed(() => [['Normal AA', wc.value.normalAA], ['Normal AAA', wc.value.normalAAA], ['Large AA', wc.value.largeAA], ['Large AAA', wc.value.largeAAA]]);
const visibleFields = computed(() => (showAll.value ? fieldDefs : fieldDefs.slice(0, 1)));
const hxOf = (c) => rgbToHex(c.r, c.g, c.b);
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <div
      class="relative h-40 w-full cursor-crosshair touch-none overflow-hidden rounded-medium border border-border"
      :style="`background-color:${hueCss};background-image:linear-gradient(to top, #000, rgba(0,0,0,0)),linear-gradient(to right, #fff, rgba(255,255,255,0));`"
      @pointerdown="svDown"
    >
      <span class="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" :style="{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, backgroundColor: cssOpaque }"></span>
    </div>

    <div class="flex items-center gap-3">
      <div class="flex flex-1 flex-col gap-2.5">
        <div class="relative h-3 w-full cursor-pointer touch-none rounded-full" style="background:linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);" @pointerdown="(e) => barDown(e, (p) => (h = p * 360))">
          <span class="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" :style="{ left: `${(h / 360) * 100}%`, backgroundColor: hueCss }"></span>
        </div>
        <div class="relative h-3 w-full rounded-full" :style="CHECKER">
          <div class="absolute inset-0 cursor-pointer touch-none rounded-full" :style="`background:linear-gradient(to right, rgba(${rgb.r},${rgb.g},${rgb.b},0), rgb(${rgb.r},${rgb.g},${rgb.b}));`" @pointerdown="(e) => barDown(e, (p) => (a = Math.round(p * 100) / 100))">
            <span class="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)]" :style="{ left: `${a * 100}%`, backgroundColor: css }"></span>
          </div>
        </div>
      </div>

      <button v-if="hasEyedropper" type="button" aria-label="Pick from screen" class="grid size-9 shrink-0 place-items-center rounded-medium border border-border bg-surface text-muted transition-colors hover:text-foreground focus-visible:outline-none" @click="eyedrop">
        <Pipette class="size-icon-medium" />
      </button>
      <div class="size-9 shrink-0 overflow-hidden rounded-medium border border-border" :style="CHECKER">
        <div class="size-full" :style="{ backgroundColor: css }"></div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <div v-for="f in visibleFields" :key="f.key" class="flex items-center gap-1.5">
        <span class="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">{{ f.label }}</span>
        <div :class="['flex h-control-small flex-1 items-center rounded-medium border bg-input px-2 transition-colors', invalidKey === f.key ? 'border-destructive' : 'border-border focus-within:border-foreground']">
          <input :value="text[f.key]" spellcheck="false" autocomplete="off" class="w-full bg-transparent font-mono text-xs text-foreground focus-visible:outline-none" @input="(e) => onFieldInput(f.key, e.currentTarget.value)" @blur="onFieldBlur" />
          <AlertCircle v-if="invalidKey === f.key" class="size-icon-small shrink-0 text-destructive" />
        </div>
        <button type="button" :aria-label="`Copy ${f.label}`" class="grid size-control-small shrink-0 place-items-center rounded-medium border border-border text-muted transition-colors hover:text-foreground focus-visible:outline-none" @click="copy(f.key, fmt[f.key])">
          <Check v-if="copied === f.key" class="size-icon-small text-success" /><Copy v-else class="size-icon-small" />
        </button>
      </div>
      <button type="button" class="flex items-center gap-1 self-start text-[11px] text-muted transition-colors hover:text-foreground focus-visible:outline-none" @click="showAll = !showAll">
        <ChevronRight :class="['size-icon-small transition-transform', showAll ? 'rotate-90' : '']" />
        {{ showAll ? 'Fewer formats' : 'All formats' }}
      </button>
    </div>

    <div class="flex flex-col gap-2">
      <div class="flex items-center gap-1.5">
        <span class="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">Presets</span>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="p in PRESETS" :key="p" type="button" :aria-label="p" class="size-5 rounded-full border border-border transition-transform hover:scale-110 focus-visible:outline-none" :style="{ backgroundColor: p }" @click="selectHex(p)"></button>
        </div>
      </div>
      <div v-if="recents.length" class="flex items-center gap-1.5">
        <span class="w-12 shrink-0 text-[11px] font-medium uppercase tracking-wider text-faint">Recent</span>
        <div class="flex flex-wrap gap-1.5">
          <button v-for="p in recents" :key="p" type="button" :aria-label="p" class="size-5 rounded-full border border-border transition-transform hover:scale-110 focus-visible:outline-none" :style="{ backgroundColor: p }" @click="selectHex(p)"></button>
        </div>
      </div>
    </div>

    <div class="h-px bg-border"></div>

    <div class="flex flex-col gap-2">
      <button type="button" class="flex items-center gap-1 self-start text-[11px] font-medium uppercase tracking-wider text-faint transition-colors hover:text-foreground focus-visible:outline-none" @click="showA11y = !showA11y">
        <ChevronRight :class="['size-icon-small transition-transform', showA11y ? 'rotate-90' : '']" />
        Contrast
      </button>
      <div v-if="showA11y" class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2">
          <span class="text-[11px] text-muted">Against</span>
          <div class="inline-flex overflow-hidden rounded-medium border border-border">
            <button type="button" :class="['px-2 py-0.5 text-[11px]', bgChoice === 'white' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="bgChoice = 'white'">White</button>
            <button type="button" :class="['px-2 py-0.5 text-[11px]', bgChoice === 'black' ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="bgChoice = 'black'">Black</button>
          </div>
          <span class="ml-auto font-mono text-sm tabular-nums text-foreground">{{ wc.ratio }}:1</span>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div class="rounded-medium border border-border p-2.5 text-center" :style="{ backgroundColor: bgChoice === 'white' ? '#fff' : '#000', color: cssOpaque }">
            <span class="text-base font-semibold">Aa</span><span class="ml-1 text-[10px]">large</span>
          </div>
          <div class="rounded-medium border border-border p-2.5 text-center" :style="{ backgroundColor: cssOpaque, color: bgChoice === 'white' ? '#fff' : '#000' }">
            <span class="text-xs">Normal text</span>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="[label, pass] in wcChips" :key="label" :class="['inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', pass ? 'border-success/40 text-success' : 'border-destructive/40 text-destructive']">
            <Check v-if="pass" class="size-icon-extra-small" /><AlertCircle v-else class="size-icon-extra-small" />{{ label }}
          </span>
        </div>
        <div v-if="!wc.normalAA" class="flex items-center gap-2 rounded-medium border border-border bg-input p-2">
          <span class="text-[11px] text-muted">Adjust to accessible</span>
          <div class="ml-auto flex items-center gap-1">
            <span class="size-5 rounded border border-border" :style="{ backgroundColor: cssOpaque }" title="Before"></span>
            <ChevronRight class="size-icon-small text-faint" />
            <span class="size-5 rounded border border-border" :style="{ backgroundColor: adjustedHex }" title="After"></span>
          </div>
          <button type="button" class="rounded-medium border border-border px-2 py-0.5 text-[11px] text-foreground transition-colors hover:bg-surface focus-visible:outline-none" @click="selectHex(adjustedHex)">Apply</button>
        </div>
      </div>
    </div>

    <div class="flex flex-col gap-2">
      <button type="button" class="flex items-center gap-1 self-start text-[11px] font-medium uppercase tracking-wider text-faint transition-colors hover:text-foreground focus-visible:outline-none" @click="showPalette = !showPalette">
        <ChevronRight :class="['size-icon-small transition-transform', showPalette ? 'rotate-90' : '']" />
        Palette
      </button>
      <div v-if="showPalette" class="flex flex-col gap-2.5">
        <div>
          <p class="mb-1 text-[10px] uppercase tracking-wider text-faint">Shades &amp; tints</p>
          <div class="flex overflow-hidden rounded-medium border border-border">
            <button v-for="(c, i) in shadeList" :key="i" type="button" :aria-label="hxOf(c)" class="h-7 flex-1 transition-transform hover:scale-y-110 focus-visible:outline-none" :style="{ backgroundColor: hxOf(c) }" @click="selectHex(hxOf(c))"></button>
          </div>
        </div>
        <div>
          <p class="mb-1 text-[10px] uppercase tracking-wider text-faint">Harmony</p>
          <div class="grid grid-cols-6 gap-1.5">
            <button v-for="item in harmonyList" :key="item.label" type="button" :title="`${item.label} · ${hxOf(item.rgb)}`" class="flex flex-col items-center gap-1 focus-visible:outline-none" @click="selectHex(hxOf(item.rgb))">
              <span class="h-8 w-full rounded-medium border border-border transition-transform hover:scale-105" :style="{ backgroundColor: hxOf(item.rgb) }"></span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
