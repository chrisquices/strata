<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  ImagePlus, ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  RefreshCw, Scan, Check, AlertCircle, User, Film, Download,
  Crop, Hand, Eye,
} from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Button from '../../components/ui/Button/Button.vue';
import Slider from '../../components/ui/Slider/Slider.vue';
import ToggleGroup from '../../components/ui/ToggleGroup/ToggleGroup.vue';
import ToggleGroupItem from '../../components/ui/ToggleGroup/ToggleGroupItem.vue';
import Spinner from '../../components/ui/Spinner/Spinner.vue';
import { createCropper, CropShape } from '../../lib/image-cropper-engine/image-cropper-engine.js';

const cropIntro = 'createCropper() frames an image behind a fixed-shape crop window — move, zoom, rotate, flip — and produces the exact crop geometry (a source-pixel rect + orientation + output size). The actual pixel draw is a separate, optional step.';
const cropPrinciples = ['Renders no UI', 'Geometry, not pixels', 'Rotation locked to 0 / 90 / 180 / 270', 'Coverage-clamped', 'Optional DOM conveniences', 'Subscribe to snapshots'];
const cropLegend = [
  { name: 'OutputGeometry', desc: '{ sourceRect, rotation, flipH, flipV, width, height } — the deliverable' },
  { name: 'State', desc: 'the snapshot from getState() / subscribe()' },
];
const cropGroups = [
  { label: 'Create & source', icon: ImagePlus, methods: [
    { sig: 'createCropper(options): Cropper', ret: 'Cropper', desc: 'options: { aspect = 1, shape = "rect", inset = 0, maxZoom = 8, maxScale?, output: { width?, height?, maxDimension? } }.' },
    { sig: 'setImageSize(width: number, height: number)', ret: 'Cropper', desc: 'DOM-free: set the natural image dimensions.' },
    { sig: 'attachImage(element: HTMLImageElement)', ret: 'Cropper', desc: 'Track an <img> — reads natural size, writes the live-preview transform.' },
    { sig: 'detachImage()', ret: 'Cropper', desc: 'Stop tracking the element (keeps geometry).' },
    { sig: 'setContainerSize(width: number, height: number)', ret: 'Cropper', desc: 'Set the stage size; recomputes the crop window.' },
  ] },
  { label: 'Crop window', icon: Crop, methods: [
    { sig: 'setAspectRatio(ratio: number)', ret: 'Cropper', desc: 'Change the crop aspect (ignored for square / circle).' },
    { sig: 'setShape(shape: CropShape)', ret: 'Cropper', desc: 'square / circle force a 1:1 crop.' },
    { sig: 'setInset(px: number)', ret: 'Cropper', desc: 'Margin between the crop window and the stage edge.' },
    { sig: 'setOutput(target: { width?, height?, maxDimension? })', ret: 'Cropper', desc: 'Output-size target.' },
    { sig: 'aspectRatio(width: number, height: number)', ret: 'number | null', desc: 'Helper — a positive w/h ratio.' },
  ] },
  { label: 'Zoom & pan', icon: ZoomIn, methods: [
    { sig: 'zoomTo(scale: number, ox?, oy?)', ret: 'Cropper', desc: 'Absolute scale, anchored at a crop-local point (default centre).' },
    { sig: 'zoomBy(factor: number, ox?, oy?)', ret: 'Cropper' },
    { sig: 'setZoomRatio(ratio: number, ox?, oy?)', ret: 'Cropper', desc: '1 = just-covers — the natural unit for a zoom slider.' },
    { sig: 'panBy(dx: number, dy: number)', ret: 'Cropper', desc: 'Clamped so the crop stays covered.' },
    { sig: 'panTo(x: number, y: number)', ret: 'Cropper' },
  ] },
  { label: 'Orientation', icon: RotateCw, methods: [
    { sig: 'rotateLeft()  ·  rotateRight()', ret: 'Cropper', desc: 'Rotate 90°; coverage and bounds recompute.' },
    { sig: 'rotateBy(degrees: number)', ret: 'Cropper', desc: 'Multiple of 90°.' },
    { sig: 'flipHorizontal()  ·  flipVertical()', ret: 'Cropper' },
    { sig: 'reset()', ret: 'Cropper', desc: 'Cover scale, centred, rotation 0, no flips.' },
  ] },
  { label: 'State & output', icon: Eye, methods: [
    { sig: 'getState(): State', ret: 'State', desc: 'Full snapshot — ready, crop, transform, previewMatrix, zoom, output.' },
    { sig: 'getOutputGeometry()', ret: 'OutputGeometry | null', desc: 'The deliverable source-pixel rect + orientation + dimensions. Pure.' },
    { sig: 'getPreviewMatrix()', ret: 'number[]', desc: 'Container-space matrix(...) for the <img> (transform-origin 0 0).' },
    { sig: 'subscribe(callback)', ret: '() => void', desc: 'State snapshots; returns an unsubscribe.' },
    { sig: 'on(type, listener)', ret: '() => void', desc: 'Lower-level events (currently "change").' },
  ] },
  { label: 'Gesture input', icon: Hand, methods: [
    { sig: 'attachInput(surface: HTMLElement)', ret: '() => void', desc: 'Wire pinch / wheel / drag / double-tap on a surface to pan & zoom; returns a detach fn.' },
    { sig: 'detachInput()', ret: 'void' },
    { sig: 'destroy()', ret: 'void', desc: 'Detach input, observer and element; clear subscribers.' },
  ] },
];
const cropEnums = [{ name: 'CropShape', values: ['rect', 'square', 'circle'], note: 'square / circle force a 1:1 crop.' }];

const SAMPLE = '/assets/demo/' + encodeURIComponent('cropper-sample.png');
const SAMPLE_VIDEO = '/assets/demo/' + encodeURIComponent('Electro Swing (Code Taco) - 00001.mp4');
const ratioMap = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9, '3:2': 3 / 2 };

const shape = ref('circle');
const ratioKey = ref('1:1');
const inset = ref(24);
const zoomRatio = ref(1);
const outMode = ref('native');
const outSize = ref(512);
const format = ref('png');
const quality = ref(0.92);
const bgFill = ref('transparent');

const src = ref(SAMPLE);
const imgEl = ref(null);
const stageEl = ref(null);
const videoEl = ref(null);
let objectUrl = null;
const resultUrl = ref(null);

const SHAPE_MAP = { square: CropShape.SQUARE, circle: CropShape.CIRCLE, rectangle: CropShape.RECT };
const st = ref(null);
const cropper = createCropper({ aspect: 1, shape: CropShape.CIRCLE, inset: 24, maxZoom: 4, onChange: (s) => { st.value = s; } });
st.value = cropper.getState();

const status = computed(() => (st.value.error ? 'error' : !st.value.ready ? 'loading' : 'ready'));
const pct = computed(() => Math.round((st.value.zoom?.ratio ?? 1) * 100));

onMounted(() => {
  cropper.attachImage(imgEl.value);
  cropper.attachInput(stageEl.value);
  cropper.observe(stageEl.value);
});
onBeforeUnmount(() => cropper.destroy());

watch(shape, () => cropper.setShape(SHAPE_MAP[shape.value]), { immediate: true });
watch([shape, ratioKey], () => cropper.setAspectRatio(shape.value === 'rectangle' ? ratioMap[ratioKey.value] : 1), { immediate: true });
watch(inset, (v) => cropper.setInset(v), { immediate: true });
watch(zoomRatio, (v) => cropper.setZoomRatio(v), { immediate: true });
watch([outMode, outSize], () => {
  if (outMode.value === 'native') cropper.setOutput({});
  else if (outMode.value === 'width') cropper.setOutput({ width: outSize.value });
  else if (outMode.value === 'height') cropper.setOutput({ height: outSize.value });
  else cropper.setOutput({ maxDimension: outSize.value });
}, { immediate: true });

function loadFrom(url) { resultUrl.value = null; src.value = url; zoomRatio.value = 1; }
function onFile(e) {
  const file = e.currentTarget.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  loadFrom(objectUrl);
  e.currentTarget.value = '';
}
function onImgLoad() { cropper.attachImage(imgEl.value); }
function resetAll() { zoomRatio.value = 1; cropper.reset(); }
function zoomStep(f) { zoomRatio.value = Math.max(1, Math.min(st.value.zoom.maxRatio, zoomRatio.value * f)); }

function grabVideoFrame() {
  const v = videoEl.value; if (!v) return;
  const draw = () => {
    const cv = document.createElement('canvas');
    cv.width = v.videoWidth || 1280; cv.height = v.videoHeight || 720;
    cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
    loadFrom(cv.toDataURL('image/png'));
  };
  if (v.readyState >= 2 && v.videoWidth) { v.currentTime = Math.min(2, (v.duration || 4) / 2); v.requestVideoFrameCallback ? v.requestVideoFrameCallback(draw) : setTimeout(draw, 150); }
  else { v.addEventListener('loadeddata', () => { v.currentTime = 1; setTimeout(draw, 200); }, { once: true }); v.load(); }
}

const mimes = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' };
function apply() {
  const g = cropper.getOutputGeometry();
  if (!g || status.value !== 'ready' || !imgEl.value) return;
  const cw = g.width, ch = g.height;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  ctx.save();
  if (shape.value === 'circle') { ctx.beginPath(); ctx.arc(cw / 2, ch / 2, Math.min(cw, ch) / 2, 0, Math.PI * 2); ctx.clip(); }
  if (bgFill.value !== 'transparent' || format.value !== 'png') { ctx.fillStyle = bgFill.value === 'transparent' ? '#000' : bgFill.value; ctx.fillRect(0, 0, cw, ch); }
  ctx.translate(cw / 2, ch / 2);
  ctx.rotate((g.rotation * Math.PI) / 180);
  ctx.scale(g.flipH ? -1 : 1, g.flipV ? -1 : 1);
  const swap = g.rotation === 90 || g.rotation === 270;
  const dw = swap ? ch : cw, dh = swap ? cw : ch;
  const s = g.sourceRect;
  ctx.drawImage(imgEl.value, s.x, s.y, s.width, s.height, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  resultUrl.value = cv.toDataURL(mimes[format.value], format.value === 'png' ? undefined : quality.value);
}
function downloadResult() {
  if (!resultUrl.value) return;
  const a = document.createElement('a');
  a.href = resultUrl.value; a.download = `crop.${format.value === 'jpeg' ? 'jpg' : format.value}`; a.click();
}

const ratioActive = computed(() => shape.value === 'rectangle');
const shapeGlyph = { square: 'h-3 w-3 rounded-[2px]', circle: 'h-3 w-3 rounded-full', rectangle: 'h-2.5 w-3.5 rounded-[2px]' };
const out = computed(() => st.value.output);
const flipLabel = computed(() => { const o = out.value; if (!o) return ''; return `${o.flipH ? 'H' : '–'}${o.flipV ? 'V' : (o.flipH ? '' : '–')}`; });
const outModes = [['native', 'Native'], ['width', 'Pin width'], ['height', 'Pin height'], ['max', 'Cap longest']];
function onShape(v) { if (v) shape.value = v; }
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Image Cropper Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless cropper engine. The engine owns the crop window, the
      cover-preserving transform (pan / zoom / rotate / flip), the gesture input, the resize
      observer and the exact output geometry — the source-pixel rectangle, orientation, final
      dimensions and an upscale warning. This page paints the frame and rasterises that geometry
      to PNG / JPEG / WebP on Apply. Works on a video frame too.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Frame an image behind the crop window — drag, pinch / wheel zoom, rotate and flip — then read the live geometry and export. The engine produces the crop; the canvas draw is the only extra step.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Live demo</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="mx-auto w-full max-w-[30rem] overflow-hidden rounded-large border border-border bg-surface shadow-panel">
              <div class="flex items-center justify-between border-b border-border px-4 py-3">
                <div class="flex flex-col"><span class="text-sm font-medium text-foreground">Crop photo</span><span class="text-[11px] text-faint">Position and size your image</span></div>
                <Button icon variant="quiet" size="sm" aria-label="Reset" @click="resetAll"><RefreshCw class="size-icon-small" /></Button>
              </div>

              <div class="flex flex-col gap-3 p-4">
                <div ref="stageEl" class="relative w-full select-none overflow-hidden rounded-medium" :style="{ height: '19rem', backgroundColor: 'var(--color-background)', backgroundImage: 'linear-gradient(45deg,#1f1f23 25%,transparent 25%,transparent 75%,#1f1f23 75%),linear-gradient(45deg,#1f1f23 25%,transparent 25%,transparent 75%,#1f1f23 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0,10px 10px', touchAction: 'none', cursor: status === 'ready' ? 'grab' : 'default' }">
                  <img ref="imgEl" :src="src" alt="" draggable="false" class="pointer-events-none absolute left-0 top-0 max-w-none will-change-transform" :style="{ visibility: status === 'ready' ? 'visible' : 'hidden' }" @load="onImgLoad" />

                  <template v-if="status === 'ready' && st.crop">
                    <div class="pointer-events-none absolute inset-0">
                      <div class="absolute border border-foreground/90" :class="{ 'rounded-full': st.crop.round }" :style="{ left: st.crop.x + 'px', top: st.crop.y + 'px', width: st.crop.width + 'px', height: st.crop.height + 'px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)' }">
                        <div class="absolute inset-0 overflow-hidden" :class="{ 'rounded-full': st.crop.round }">
                          <div class="absolute inset-y-0 left-1/3 w-px bg-foreground/20"></div><div class="absolute inset-y-0 left-2/3 w-px bg-foreground/20"></div>
                          <div class="absolute inset-x-0 top-1/3 h-px bg-foreground/20"></div><div class="absolute inset-x-0 top-2/3 h-px bg-foreground/20"></div>
                        </div>
                      </div>
                    </div>
                    <div class="pointer-events-none absolute bottom-2 left-2 rounded-medium bg-overlay/70 px-2 py-1 font-mono text-[11px] text-foreground backdrop-blur-sm">{{ Math.round(st.crop.width) }}×{{ Math.round(st.crop.height) }} · {{ pct }}%</div>
                  </template>

                  <div v-if="status === 'loading'" class="absolute inset-0 grid place-items-center bg-background/60"><div class="flex flex-col items-center gap-3 text-muted"><Spinner size="lg" /><span class="text-xs">Loading image…</span></div></div>
                  <div v-if="status === 'error'" class="absolute inset-0 grid place-items-center p-6 text-center"><div class="flex flex-col items-center gap-3"><span class="grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive"><AlertCircle class="size-icon-large" /></span><div><p class="text-sm font-medium text-foreground">Couldn't load that image</p><p class="mt-0.5 text-xs text-muted">The file may be corrupt or unsupported.</p></div><Button variant="secondary" size="sm" @click="loadFrom(SAMPLE)">Use sample instead</Button></div></div>
                </div>

                <div class="flex flex-wrap items-center gap-x-2 gap-y-2">
                  <ToggleGroup type="single" :model-value="shape" variant="secondary" @update:model-value="onShape">
                    <ToggleGroupItem v-for="sh in ['square', 'circle', 'rectangle']" :key="sh" :value="sh" :aria-label="sh" class="px-2.5"><span :class="['block border border-current', shapeGlyph[sh]]"></span></ToggleGroupItem>
                  </ToggleGroup>
                  <div v-if="ratioActive" class="flex items-center gap-1">
                    <button v-for="rk in ['1:1', '4:3', '16:9', '3:2']" :key="rk" type="button" :class="['h-control-small rounded-medium border px-2 text-[11px] tabular-nums transition-colors duration-100', ratioKey === rk ? 'border-foreground bg-foreground text-background' : 'border-border bg-surface text-muted hover:text-foreground']" @click="ratioKey = rk">{{ rk }}</button>
                  </div>
                  <span v-else class="inline-flex h-control-small items-center rounded-medium border border-border bg-surface px-2.5 text-[11px] text-faint">Locked 1:1</span>
                  <div class="ml-auto flex items-center gap-px">
                    <Button icon variant="quiet" size="sm" aria-label="Rotate left" :disabled="status !== 'ready'" @click="cropper.rotateLeft()"><RotateCcw class="size-icon-small" /></Button>
                    <Button icon variant="quiet" size="sm" aria-label="Rotate right" :disabled="status !== 'ready'" @click="cropper.rotateRight()"><RotateCw class="size-icon-small" /></Button>
                    <Button icon :variant="st.transform?.flipH ? 'secondary' : 'quiet'" size="sm" aria-label="Flip horizontal" :disabled="status !== 'ready'" @click="cropper.flipHorizontal()"><FlipHorizontal class="size-icon-small" /></Button>
                    <Button icon :variant="st.transform?.flipV ? 'secondary' : 'quiet'" size="sm" aria-label="Flip vertical" :disabled="status !== 'ready'" @click="cropper.flipVertical()"><FlipVertical class="size-icon-small" /></Button>
                  </div>
                </div>

                <div class="flex items-center gap-2.5">
                  <button type="button" aria-label="Zoom out" class="shrink-0 text-muted transition-colors hover:text-foreground disabled:opacity-40" :disabled="status !== 'ready'" @click="zoomStep(1 / 1.2)"><ZoomOut class="size-icon-small" /></button>
                  <Slider v-model="zoomRatio" :min="1" :max="st.zoom?.maxRatio ?? 4" :step="0.01" :disabled="status !== 'ready'" />
                  <button type="button" aria-label="Zoom in" class="shrink-0 text-muted transition-colors hover:text-foreground disabled:opacity-40" :disabled="status !== 'ready'" @click="zoomStep(1.2)"><ZoomIn class="size-icon-small" /></button>
                  <button type="button" aria-label="Re-center" class="shrink-0 text-muted transition-colors hover:text-foreground disabled:opacity-40" :disabled="status !== 'ready'" @click="cropper.reset()"><Scan class="size-icon-small" /></button>
                </div>
              </div>

              <div class="flex items-center gap-3 border-t border-border px-4 py-3">
                <div class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-background">
                  <img v-if="resultUrl" :src="resultUrl" alt="Cropped" class="size-full object-cover" /><User v-else class="size-icon-medium text-faint" />
                </div>
                <label class="inline-flex shrink-0"><input type="file" accept="image/*" class="hidden" @change="onFile" /><span class="inline-flex h-control-small cursor-default select-none items-center gap-1.5 rounded-medium border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-background"><ImagePlus class="size-icon-small" /> Replace</span></label>
                <button type="button" class="inline-flex h-control-small shrink-0 items-center gap-1.5 rounded-medium border border-border bg-surface px-2.5 text-xs font-medium text-foreground transition-colors hover:bg-background focus-visible:outline-none" @click="grabVideoFrame"><Film class="size-icon-small" /> Video frame</button>
                <video ref="videoEl" :src="SAMPLE_VIDEO" muted playsinline preload="metadata" class="hidden"></video>
                <div class="ml-auto"><Button variant="primary" size="sm" :disabled="status !== 'ready'" @click="apply"><Check class="size-icon-small" /> Apply</Button></div>
              </div>
            </div>
            <p class="mx-auto mt-4 max-w-[30rem] text-xs text-faint">Drag to reposition · scroll or pinch to zoom · double-click to zoom — all from the engine's gesture recognizer. The image always fully covers the crop. Apply rasterises the engine's exact source-pixel rectangle.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Output &amp; export</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_15rem]">
              <div class="flex flex-col gap-5 rounded-large border border-border bg-surface p-5">
                <div class="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                  <div class="flex flex-col gap-2.5">
                    <span class="text-xs font-medium uppercase tracking-wider text-faint">Output size</span>
                    <div class="grid grid-cols-2 gap-1.5 text-[11px]">
                      <button v-for="[m, l] in outModes" :key="m" type="button" :class="['rounded-medium border px-2 py-1.5 transition-colors', outMode === m ? 'border-foreground bg-foreground text-background' : 'border-border text-muted hover:text-foreground']" @click="outMode = m">{{ l }}</button>
                    </div>
                    <div v-if="outMode !== 'native'" class="flex items-center gap-3"><Slider v-model="outSize" :min="64" :max="2048" :step="64" /><span class="w-14 shrink-0 text-right font-mono text-[11px] text-muted">{{ outSize }}px</span></div>
                  </div>
                  <div class="flex flex-col gap-2.5">
                    <span class="text-xs font-medium uppercase tracking-wider text-faint">Format</span>
                    <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                      <button v-for="f in ['png', 'jpeg', 'webp']" :key="f" type="button" :class="['flex-1 px-2 py-1.5 uppercase transition-colors', format === f ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="format = f">{{ f }}</button>
                    </div>
                    <div v-if="format !== 'png'" class="flex items-center gap-3"><span class="text-xs text-muted">Quality</span><Slider v-model="quality" :min="0.3" :max="1" :step="0.01" /><span class="w-9 shrink-0 text-right font-mono text-[11px] text-muted">{{ Math.round(quality * 100) }}</span></div>
                    <div class="flex items-center justify-between"><span class="text-xs text-muted">Background</span><div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]"><button v-for="b in ['transparent', 'white', 'black']" :key="b" type="button" :class="['px-2 py-1 capitalize transition-colors', bgFill === b ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="bgFill = b">{{ b === 'transparent' ? 'None' : b }}</button></div></div>
                  </div>
                </div>

                <div class="flex items-center gap-3"><span class="w-16 shrink-0 text-xs text-muted">Frame inset</span><Slider v-model="inset" :min="0" :max="64" :step="2" /><span class="w-12 shrink-0 text-right font-mono text-[11px] text-muted">{{ inset }}px</span></div>

                <div class="rounded-medium border border-border bg-input p-3 font-mono text-[11px] leading-relaxed text-muted">
                  <template v-if="out">
                    <div>source rect <span class="text-foreground">{{ Math.round(out.sourceRect.width) }}×{{ Math.round(out.sourceRect.height) }}</span> px · export <span class="text-foreground">{{ out.width }}×{{ out.height }}</span></div>
                    <div>rotate <span class="text-foreground">{{ out.rotation }}°</span> · flip <span class="text-foreground">{{ flipLabel }}</span> · zoom <span class="text-foreground">{{ pct }}%</span></div>
                    <div v-if="out.upscale" class="mt-1 flex items-center gap-1.5 text-warning"><AlertCircle class="size-icon-extra-small" /> Output exceeds source detail — result will be upscaled.</div>
                  </template>
                  <div v-else>Waiting for the image…</div>
                </div>
              </div>

              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Result</span>
                <div class="grid aspect-square w-full place-items-center overflow-hidden rounded-medium border border-border" style="background-image:linear-gradient(45deg,#1f1f23 25%,transparent 25%,transparent 75%,#1f1f23 75%),linear-gradient(45deg,#1f1f23 25%,transparent 25%,transparent 75%,#1f1f23 75%);background-size:16px 16px;background-position:0 0,8px 8px;background-color:var(--color-background)">
                  <img v-if="resultUrl" :src="resultUrl" alt="Cropped result" class="max-h-full max-w-full object-contain" /><span v-else class="px-4 text-center text-[11px] text-faint">Press Apply to render here</span>
                </div>
                <div class="flex items-center gap-2">
                  <Button variant="primary" size="sm" class="flex-1" :disabled="status !== 'ready'" @click="apply"><Check class="size-icon-small" /> Apply</Button>
                  <Button icon variant="secondary" size="sm" aria-label="Download" :disabled="!resultUrl" @click="downloadResult"><Download class="size-icon-small" /></Button>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="image-cropper-engine.js"
      :intro="cropIntro"
      :principles="cropPrinciples"
      :legend="cropLegend"
      :groups="cropGroups"
      :enums="cropEnums"
    />
  </div>
</template>
