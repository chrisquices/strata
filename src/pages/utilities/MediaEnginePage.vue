<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import {
  Image as ImageIcon, Film, Music, Play, Pause, X, ChevronLeft, ChevronRight,
  Volume2, VolumeX, Maximize, Captions, Repeat, SkipBack, SkipForward,
  ZoomIn, ZoomOut, RotateCcw, RotateCw, FlipHorizontal, RefreshCw, PictureInPicture2, Gauge, Music2,
  Eye, Wrench,
} from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Badge from '../../components/ui/Badge/Badge.vue';
import { createViewer, MediaType, RepeatMode, Lifecycle } from '../../lib/media-engine/media-engine.js';

const u = (name) => '/assets/demo/' + encodeURIComponent(name);
const peaks = Array.from({ length: 160 }, (_, i) => { const env = Math.sin((i / 160) * Math.PI); const d = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6)); return Math.max(0.06, env * d); });
const capVtt = 'components/app/media-viewer/sample/captions.en.vtt';

const items = [
  { type: 'image', src: u('ChatGPT Image Jun 2, 2026, 06_21_29 AM.png'), width: 1023, height: 1537, title: 'Seaside salute', caption: 'Portrait', thumb: u('ChatGPT Image Jun 2, 2026, 06_21_29 AM.png') },
  { type: 'video', sources: [{ src: u('Tiramisu Cake (We Are The Night) - 00004.mp4'), type: 'video/mp4' }], captions: [{ src: capVtt, srclang: 'en', label: 'English' }], title: 'Tiramisu Cake', caption: 'We Are The Night' },
  { type: 'image', src: u('ChatGPT Image Jun 2, 2026, 06_09_08 AM (2).png'), width: 1024, height: 1536, title: 'Promenade pose', caption: 'Portrait', thumb: u('ChatGPT Image Jun 2, 2026, 06_09_08 AM (2).png') },
  { type: 'video', sources: [{ src: u('Electro Swing (Code Taco) - 00001.mp4'), type: 'video/mp4' }], title: 'Electro Swing', caption: 'Code Taco' },
  { type: 'video', sources: [{ src: u('nikumikyo - 00002.mp4'), type: 'video/mp4' }], title: 'nikumikyo', caption: 'Clip' },
  { type: 'audio', src: u('Bo\u0301hu\u030c Shuo\u0304 (DJRichz & DJ停顿 Remix).mp3'), peaks, title: 'Bóhǔ Shuō', mediaMetadata: { title: 'Bóhǔ Shuō', artist: 'DJRichz & DJ停顿 Remix' } },
  { type: 'video', sources: [{ src: u('Ha\u0308schenparty [Single Version] (Schnuffel & Michael Wendler) - 00002.mp4'), type: 'video/mp4' }], title: 'Häschenparty', caption: 'Schnuffel & Michael Wendler' },
];
const iconFor = { image: ImageIcon, video: Film, audio: Music };

const mediaIntro = 'one createViewer() instance owns the gallery lifecycle, queue and per-type renderers (image, video, audio), mounts media into a stage, and emits a state snapshot plus events.';
const mediaPrinciples = ['Renders no UI', 'Shell + per-type renderers', 'Type-routed registry', 'State snapshot + events', 'Keyboard & gesture aware', 'Preference persistence'];
const mediaLegend = [
  { name: 'Item', desc: 'a media descriptor — { type, src or sources, title, poster, … }' },
  { name: 'Renderer', desc: 'the active per-type controller returned by getRenderer()' },
];
const mediaGroups = [
  { label: 'Create & lifecycle', icon: Play, methods: [
    { sig: 'createViewer(options): MediaViewer', ret: 'MediaViewer', desc: 'Build a viewer. options: { items, createElement, container, stage, registry, preload = 1, wrap = false, transitionMs = 0, closeOnEscape = true, options, prefs, onChange }.' },
    { sig: 'open(index: number = 0, options?: { fromRect?, autoplay? })', ret: 'void', desc: 'Open the lightbox at an item; the whole gallery becomes a queue.' },
    { sig: 'goTo(index: number, options?: { autoplay? })', ret: 'void', desc: 'Jump to an item in the queue.' },
    { sig: 'next(options?)  ·  prev(options?)', ret: 'void', desc: 'Step forward / back through the queue.' },
    { sig: 'close()', ret: 'void', desc: 'Run the exit transition (waits transitionMs) and close.' },
    { sig: 'destroy()', ret: 'void', desc: 'Detach listeners, renderers and timers.' },
  ] },
  { label: 'Snapshot & subscription', icon: Eye, methods: [
    { sig: 'getState(): ViewerState', ret: 'ViewerState', desc: 'Full snapshot — index, item, lifecycle, capabilities, renderer state, fullscreen, theater, dimLevel.' },
    { sig: 'getRenderer(): Renderer | null', ret: 'Renderer | null', desc: 'The active renderer; the consumer calls its type-specific controls on it.' },
    { sig: 'currentItem()', ret: 'Item | null' },
    { sig: 'getItems()', ret: 'Item[]' },
    { sig: 'hasNext()  ·  hasPrev()', ret: 'boolean' },
    { sig: 'on(type: RendererEvent, listener)', ret: '() => void', desc: 'Subscribe to shell + forwarded renderer events; returns an unsubscribe.' },
  ] },
  { label: 'Display modes', icon: Maximize, methods: [
    { sig: 'toggleFullscreen()  ·  requestFullscreen()  ·  exitFullscreen()', ret: 'void' },
    { sig: 'setTheater(on: boolean, dimLevel: number = on ? 0.85 : 0)', ret: 'void', desc: 'Lights-out mode; the engine emits the dim level and the consumer dims the page.' },
    { sig: 'toggleTheater()', ret: 'void' },
  ] },
  { label: 'Image renderer controls', icon: ImageIcon, methods: [
    { sig: 'zoomIn(factor?)  ·  zoomOut(factor?)', ret: 'void' },
    { sig: 'zoomBy(factor: number)  ·  panBy(dx: number, dy: number)', ret: 'void' },
    { sig: 'rotateLeft()  ·  rotateRight()', ret: 'void' },
    { sig: 'flipHorizontal()', ret: 'void' },
    { sig: 'reset()', ret: 'void', desc: 'Reset zoom, pan, rotation and flip.' },
    { sig: 'isZoomed()', ret: 'boolean' },
  ] },
  { label: 'Video renderer controls', icon: Film, methods: [
    { sig: 'play()  ·  pause()', ret: 'void' },
    { sig: 'seek(seconds)  ·  seekBy(delta)  ·  seekToPercent(percent)', ret: 'void' },
    { sig: 'setVolume(level: number)  ·  mute()  ·  unmute()  ·  toggleMute()', ret: 'void', desc: 'level is 0–1.' },
    { sig: 'setSpeed(rate: number)', ret: 'void' },
    { sig: 'setCaptions(index: number)  ·  cycleCaptions()', ret: 'void' },
    { sig: 'togglePictureInPicture()', ret: 'Promise<void>' },
  ] },
  { label: 'Audio renderer controls', icon: Music, methods: [
    { sig: 'play()  ·  pause()  ·  seek(seconds)  ·  seekToPercent(percent)', ret: 'void' },
    { sig: 'setVolume(level)  ·  toggleMute()', ret: 'void' },
    { sig: 'setSpeed(rate: number)', ret: 'void', desc: 'Native tempo change — pitch preserved.' },
    { sig: 'setPitch(semitones: number)', ret: 'Promise<number>', desc: 'WSOLA pitch shift, ± semitones, independent of speed.' },
    { sig: 'setRepeat(mode: RepeatMode)', ret: 'void' },
  ] },
  { label: 'Building blocks', icon: Wrench, methods: [
    { sig: 'createImageRenderer  ·  createVideoRenderer  ·  createAudioRenderer', ret: 'Renderer', desc: 'The three built-in renderers.' },
    { sig: 'createRendererRegistry()  ·  defineRenderer(type, factory)', ret: 'Registry', desc: 'Register a new media type without touching the shell.' },
    { sig: 'createTransform()  ·  createGestureRecognizer()  ·  classifyDrag()', ret: '—', desc: 'Image transform math and pointer-gesture recognition.' },
    { sig: 'createQueue()', ret: 'Queue', desc: 'The gallery / audio queue — navigation, repeat, wrap.' },
    { sig: 'parseVTT()  ·  parseTimestamp()  ·  createCueTrack()', ret: '—', desc: 'WebVTT caption parsing and active-cue tracking.' },
    { sig: 'createPitchSpeed()  ·  pitchShift()  ·  wsolaStretch()  ·  resampleLinear()', ret: '—', desc: 'Audio DSP for the independent pitch / speed path.' },
    { sig: 'extractPeaks()  ·  decodePeaks()  ·  peaksFromBuffer()', ret: 'number[]', desc: 'Waveform peak extraction for audio scrubbers.' },
    { sig: 'createCasting()  ·  isCastableSource()', ret: '—', desc: 'Remote Playback (cast) integration.' },
  ] },
];
const mediaEnums = [
  { name: 'MediaType', values: ['image', 'video', 'audio'], note: 'Routes an item to its renderer.' },
  { name: 'Lifecycle', values: ['closed', 'opening', 'open', 'closing'], note: 'Viewer open / close phase.' },
  { name: 'LoadState', values: ['idle', 'loading', 'loaded', 'error'] },
  { name: 'PlayState', values: ['playing', 'paused', 'stopped', 'ended'] },
  { name: 'CastState', values: ['unsupported', 'unavailable', 'connecting', 'connected', 'disconnected'] },
  { name: 'RepeatMode', values: ['none', 'one', 'all'] },
  { name: 'RendererEvent', values: ['load', 'capability', 'playback', 'transform', 'cues', 'tracks', 'cast', 'waveform', 'controls', 'intent'], note: 'Event names a renderer emits; subscribe via on().' },
  { name: 'Intent', values: ['navigate', 'close', 'dismiss'], note: 'Renderer → shell requests.' },
];

let viewer = null;
const vs = ref({ lifecycle: 'closed', renderer: null, capabilities: null });
const containerEl = ref(null);
const stageEl = ref(null);

function createElement(item) {
  if (item.type === MediaType.IMAGE) { const el = document.createElement('img'); el.alt = item.title || ''; el.className = 'me-media'; return el; }
  if (item.type === MediaType.VIDEO) { const el = document.createElement('video'); el.playsInline = true; el.preload = 'metadata'; el.className = 'me-media'; return el; }
  const el = document.createElement('audio'); el.preload = 'metadata'; return el;
}

onMounted(() => {
  viewer = createViewer({
    items, createElement, container: containerEl.value, stage: stageEl.value,
    transitionMs: 180, preload: 1,
    prefs: { enabled: true, key: 'media-engine:prefs' },
    onChange: () => (vs.value = viewer.getState()),
  });
  vs.value = viewer.getState();
});
onBeforeUnmount(() => viewer?.destroy());

function launch(i) { viewer.open(i, { autoplay: items[i].type !== MediaType.IMAGE }); }
const r = () => viewer && viewer.getRenderer();
const has = (o, m) => o && typeof o[m] === 'function';
const open = computed(() => vs.value.lifecycle === Lifecycle.OPEN || vs.value.lifecycle === Lifecycle.OPENING || vs.value.lifecycle === Lifecycle.CLOSING);

const type = computed(() => vs.value.item?.type);
const caps = computed(() => vs.value.capabilities);
const rstate = computed(() => vs.value.renderer || {});
const pb = computed(() => rstate.value.playback || null);
const progress = computed(() => (pb.value && pb.value.duration ? Math.min(100, (pb.value.currentTime / pb.value.duration) * 100) : 0));
const buffered = computed(() => (pb.value && pb.value.duration && pb.value.buffered ? Math.min(100, (pb.value.buffered / pb.value.duration) * 100) : 0));
const fmtTime = (t) => { if (t == null || !isFinite(t)) return '0:00'; const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; };

function togglePlay() { const rr = r(); if (!rr || !pb.value) return; pb.value.paused ? rr.play() : rr.pause(); }
function scrub(e) { const rr = r(); if (has(rr, 'seekToPercent')) rr.seekToPercent(+e.target.value); }
function setVol(e) { const rr = r(); if (has(rr, 'setVolume')) rr.setVolume(+e.target.value / 100); }
function setSpeed(rate) { const rr = r(); if (has(rr, 'setSpeed')) rr.setSpeed(rate); }
const rates = computed(() => caps.value?.playback?.rates || [0.5, 1, 1.5, 2]);
const curRate = computed(() => pb.value?.rate ?? pb.value?.speed ?? rstate.value.speed ?? 1);

const pitch = ref(0);
function setPitch(v) { pitch.value = v; const rr = r(); if (has(rr, 'setPitch')) rr.setPitch(v); }
const repeatModes = [RepeatMode?.OFF ?? 'off', RepeatMode?.ONE ?? 'one', RepeatMode?.ALL ?? 'all'];
const repeatIdx = ref(0);
function cycleRepeat() { repeatIdx.value = (repeatIdx.value + 1) % repeatModes.length; const rr = r(); if (has(rr, 'setRepeat')) rr.setRepeat(repeatModes[repeatIdx.value]); }

const imageControls = [
  { m: 'zoomOut', icon: ZoomOut, lbl: 'Zoom out' }, { m: 'zoomIn', icon: ZoomIn, lbl: 'Zoom in' },
  { m: 'rotateLeft', icon: RotateCcw, lbl: 'Rotate left' }, { m: 'rotateRight', icon: RotateCw, lbl: 'Rotate right' },
  { m: 'flipHorizontal', icon: FlipHorizontal, lbl: 'Flip' }, { m: 'reset', icon: RefreshCw, lbl: 'Reset' },
];
function imgCtl(m) { const rr = r(); if (has(rr, m)) rr[m](); }
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Media Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless media engine. One <code class="text-[11px]">createViewer</code> instance
      owns the gallery lifecycle, navigation and queue, mounts per-type renderers into a stage, and
      emits state — image zoom / rotate / flip, video play / seek / volume / speed / captions / PiP,
      audio play / seek / speed / pitch-shift / repeat. The page renders the gallery and the lightbox
      chrome and calls the active renderer's controls; the engine does the rest.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">A live gallery and lightbox driven entirely by the engine — click any tile to open the viewer; image zoom / rotate, video transport and audio pitch all call the active renderer's controls.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Gallery</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <button v-for="(item, i) in items" :key="i" type="button" class="group relative aspect-[4/3] overflow-hidden rounded-large border border-border bg-media-viewer-bar text-left transition-colors hover:border-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" @click="launch(i)">
                <img v-if="item.thumb || item.poster" :src="item.thumb || item.poster" alt="" class="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div v-else class="absolute inset-0 grid place-items-center"><component :is="iconFor[item.type]" class="size-icon-extra-large text-faint" /></div>
                <div v-if="item.type !== 'image'" class="absolute inset-0 grid place-items-center bg-overlay/30"><span class="grid size-12 place-items-center rounded-full bg-overlay/60 text-foreground backdrop-blur-sm"><Play v-if="item.type === 'video'" class="size-icon-large translate-x-0.5" /><Music v-else class="size-icon-large" /></span></div>
                <div class="absolute left-2 top-2"><Badge variant="secondary" class="gap-1 capitalize backdrop-blur-sm"><component :is="iconFor[item.type]" class="size-icon-extra-small" />{{ item.type }}</Badge></div>
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-overlay/80 to-transparent px-3 pb-2 pt-6"><p class="truncate text-sm font-medium text-foreground">{{ item.title }}</p></div>
              </button>
            </div>
            <p class="mt-4 text-xs text-faint">Click any tile — the engine opens the lightbox at that item and the whole gallery becomes a queue. Keys (engine-handled): ←/→ navigate · Space play · +/− zoom · F fullscreen · Esc close.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="media-engine.js"
      :intro="mediaIntro"
      :principles="mediaPrinciples"
      :legend="mediaLegend"
      :groups="mediaGroups"
      :enums="mediaEnums"
    />
  </div>

  <div ref="containerEl" :class="['fixed inset-0 z-modal flex flex-col bg-overlay/95 backdrop-blur-sm transition-opacity duration-200', open ? 'opacity-100' : 'pointer-events-none opacity-0']" :aria-hidden="!open" :style="{ '--dim': vs.dimLevel || 0 }">
    <div v-if="vs.theater" class="pointer-events-none absolute inset-0 bg-black" :style="{ opacity: vs.dimLevel }"></div>

    <div class="relative z-10 flex items-center gap-3 px-4 py-3 text-foreground">
      <span class="font-mono text-xs text-muted tabular-nums">{{ (vs.currentIndex ?? 0) + 1 }} / {{ vs.count ?? items.length }}</span>
      <span class="truncate text-sm font-medium">{{ vs.item?.title ?? '' }}</span>
      <div class="ml-auto flex items-center gap-1">
        <button type="button" aria-label="Theater" :class="['grid size-9 place-items-center rounded-medium transition-colors hover:bg-foreground/10', vs.theater ? 'text-foreground' : 'text-muted']" @click="viewer.toggleTheater()"><Music2 class="size-icon-small" /></button>
        <button v-if="vs.fullscreenAvailable" type="button" aria-label="Fullscreen" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="viewer.toggleFullscreen()"><Maximize class="size-icon-small" /></button>
        <button type="button" aria-label="Close" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="viewer.close()"><X class="size-icon-medium" /></button>
      </div>
    </div>

    <div class="relative z-0 flex min-h-0 flex-1 items-center justify-center px-4">
      <button v-if="vs.hasPrev" type="button" aria-label="Previous" class="absolute left-3 z-10 grid size-11 place-items-center rounded-full bg-overlay/50 text-foreground/80 backdrop-blur-sm transition-colors hover:bg-overlay/70 hover:text-foreground" @click="viewer.prev()"><ChevronLeft class="size-icon-large" /></button>
      <div ref="stageEl" class="relative grid h-full w-full place-items-center overflow-hidden" style="touch-action:none"></div>
      <button v-if="vs.hasNext" type="button" aria-label="Next" class="absolute right-3 z-10 grid size-11 place-items-center rounded-full bg-overlay/50 text-foreground/80 backdrop-blur-sm transition-colors hover:bg-overlay/70 hover:text-foreground" @click="viewer.next()"><ChevronRight class="size-icon-large" /></button>
    </div>

    <div class="relative z-10 px-4 py-3">
      <div v-if="type === 'image'" class="mx-auto flex w-fit items-center gap-1 rounded-large border border-border bg-surface/80 px-2 py-1.5 backdrop-blur">
        <button v-for="ctl in imageControls" :key="ctl.m" type="button" :aria-label="ctl.lbl" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="imgCtl(ctl.m)"><component :is="ctl.icon" class="size-icon-small" /></button>
      </div>
      <div v-else-if="pb" class="mx-auto flex w-full max-w-2xl flex-col gap-2 rounded-large border border-border bg-surface/80 px-4 py-3 backdrop-blur">
        <div class="flex items-center gap-3">
          <span class="w-10 shrink-0 text-right font-mono text-[11px] text-muted tabular-nums">{{ fmtTime(pb.currentTime) }}</span>
          <div class="relative flex-1">
            <div class="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/15"><div class="h-full bg-foreground/25" :style="{ width: buffered + '%' }"></div></div>
            <div class="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full"><div class="h-full bg-foreground" :style="{ width: progress + '%' }"></div></div>
            <input type="range" min="0" max="100" step="0.1" :value="progress" class="relative h-4 w-full cursor-pointer appearance-none bg-transparent" aria-label="Seek" @input="scrub" />
          </div>
          <span class="w-10 shrink-0 font-mono text-[11px] text-muted tabular-nums">{{ fmtTime(pb.duration) }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <button type="button" aria-label="Play/pause" class="grid size-10 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105" @click="togglePlay"><Play v-if="pb.paused" class="size-icon-medium translate-x-0.5" /><Pause v-else class="size-icon-medium" /></button>
          <template v-if="type === 'audio'">
            <button type="button" aria-label="Previous track" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="has(r(), 'prev') && r().prev()"><SkipBack class="size-icon-small" /></button>
            <button type="button" aria-label="Next track" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="has(r(), 'next') && r().next()"><SkipForward class="size-icon-small" /></button>
          </template>
          <button type="button" aria-label="Mute" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="has(r(), 'toggleMute') && r().toggleMute()"><VolumeX v-if="pb.muted || pb.volume === 0" class="size-icon-small" /><Volume2 v-else class="size-icon-small" /></button>
          <input type="range" min="0" max="100" :value="pb.muted ? 0 : Math.round((pb.volume ?? 1) * 100)" class="h-1 w-20 cursor-pointer appearance-none rounded-full bg-foreground/20 accent-foreground" aria-label="Volume" @input="setVol" />

          <div class="ml-auto flex items-center gap-1.5">
            <div class="flex items-center gap-1 text-[11px] text-muted"><Gauge class="size-icon-small" />
              <select :value="curRate" class="rounded-medium border border-border bg-surface px-1.5 py-0.5 text-foreground focus-visible:outline-none" @change="(e) => setSpeed(+e.target.value)">
                <option v-for="rt in rates" :key="rt" :value="rt">{{ rt }}×</option>
              </select>
            </div>
            <template v-if="type === 'video'">
              <button v-if="caps?.playback?.captions || has(r(), 'cycleCaptions')" type="button" aria-label="Captions" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="has(r(), 'cycleCaptions') && r().cycleCaptions()"><Captions class="size-icon-small" /></button>
              <button v-if="caps?.playback?.pip" type="button" aria-label="Picture in picture" class="grid size-9 place-items-center rounded-medium text-muted transition-colors hover:bg-foreground/10 hover:text-foreground" @click="has(r(), 'togglePictureInPicture') && r().togglePictureInPicture()"><PictureInPicture2 class="size-icon-small" /></button>
            </template>
            <button v-if="type === 'audio'" type="button" aria-label="Repeat" :class="['grid size-9 place-items-center rounded-medium transition-colors hover:bg-foreground/10', repeatIdx ? 'text-foreground' : 'text-muted']" @click="cycleRepeat"><Repeat class="size-icon-small" /></button>
          </div>
        </div>
        <div v-if="type === 'audio'" class="flex items-center gap-3 pt-1">
          <span class="flex items-center gap-1.5 text-[11px] text-muted"><Music2 class="size-icon-small" /> Pitch</span>
          <input type="range" min="-12" max="12" step="1" :value="pitch" class="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-foreground/20 accent-foreground" aria-label="Pitch" @input="(e) => setPitch(+e.target.value)" />
          <span class="w-12 text-right font-mono text-[11px] text-muted tabular-nums">{{ pitch > 0 ? '+' : '' }}{{ pitch }} st</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.me-media { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
#stage video.me-media, .me-media { will-change: transform; }
</style>
