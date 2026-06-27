<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import {
  Bell, Info, CheckCircle2, AlertCircle, ShieldAlert, Loader2, X, Undo2, Trash2, RefreshCw,
} from '@lucide/vue';
import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Button from '../../components/ui/Button/Button.vue';
import Slider from '../../components/ui/Slider/Slider.vue';
import Switch from '../../components/ui/Switch/Switch.vue';
import NumberField from '../../components/ui/NumberField/NumberField.vue';
import { createToaster, ToastType, ToastPhase, Order, Overflow } from '../../lib/toast-engine/toast-engine.js';

const toastIntro = 'createToaster() owns the queue, lifecycle, timers, stacking order, position grouping, overflow, dedup and promise wiring, and emits that state grouped by position; the consumer paints every toast and runs the animations.';
const toastPrinciples = ['Renders no UI', 'State out, paint in', 'Engine owns timing', 'Consumer owns animation', 'Injectable clock', 'Pause on hover / tab-blur'];
const toastLegend = [
  { name: 'id', desc: 'the string id returned by toast() — pass it to update / dismiss' },
  { name: 'ToasterState', desc: '{ groups, toasts, reduceMotion, config } from getState() / subscribe()' },
];
const toastGroups = [
  {
    label: 'Creating toasts', icon: Bell,
    methods: [
      { sig: 'createToaster(options): Toaster', ret: 'Toaster', desc: 'options: { position = "top-right", duration = 4000, errorDuration = 0, max = 3, order, overflow, gap = 12, pauseOnHover = true, pauseOnTabBlur = true, enterDuration = 200, exitTimeout = 1000, dedupById = true, collapseDuplicates = false, clock, onChange }.' },
      { sig: 'toast(content, options?)', ret: 'id', desc: 'Enqueue a toast. options: { type, duration, position, id, role, ariaLive }.' },
      { sig: 'toast.success / error / info / warning / loading (content, options?)', ret: 'id', desc: 'Severity shortcuts.' },
      { sig: 'toast.promise(promise, messages, options?)', ret: 'id', desc: 'Wire loading → success / error to a promise. messages: { loading, success, error }.' },
      { sig: 'update(id, content, options?)', ret: 'void', desc: 'Replace a live toast content / options.' },
    ],
  },
  {
    label: 'Lifecycle control', icon: RefreshCw,
    methods: [
      { sig: 'dismiss(id)', ret: 'void', desc: 'Begin the exit handshake for a toast.' },
      { sig: 'dismissAll(position?)', ret: 'void', desc: 'Dismiss all, or all in one position group.' },
      { sig: 'remove(id)', ret: 'void', desc: 'The consumer calls this when its exit animation finishes (or the engine times out).' },
      { sig: 'pause(id?)  ·  resume(id?)', ret: 'void', desc: 'Freeze / continue timers; omit id to affect all.' },
    ],
  },
  {
    label: 'State & teardown', icon: Info,
    methods: [
      { sig: 'subscribe(callback)', ret: '() => void', desc: 'Push the grouped snapshot on every change; returns an unsubscribe.' },
      { sig: 'getState(): ToasterState', ret: 'ToasterState', desc: 'Toasts grouped by position, each with its phase and live remaining time.' },
      { sig: 'destroy()', ret: 'void', desc: 'Clear timers and listeners.' },
      { sig: 'defaultClock()', ret: '{ now, setTimeout, clearTimeout }', desc: 'The real clock; swap a fake one in for deterministic tests.' },
    ],
  },
];
const toastEnums = [
  { name: 'ToastType', values: ['info', 'success', 'error', 'warning', 'loading'], note: 'Severity tag — implies nothing about appearance.' },
  { name: 'ToastPhase', values: ['queued', 'entering', 'visible', 'exiting'], note: 'Lifecycle phase; exit is a consumer handshake.' },
  { name: 'Position', values: ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] },
  { name: 'Order', values: ['newest-first', 'newest-last'] },
  { name: 'Overflow', values: ['queue', 'evict'], note: 'Behaviour when a group hits max-visible.' },
];

const meta = {
  info: { icon: Info, ring: 'border-border', accent: 'text-foreground', bar: 'bg-foreground' },
  success: { icon: CheckCircle2, ring: 'border-success/40', accent: 'text-success', bar: 'bg-success' },
  warning: { icon: ShieldAlert, ring: 'border-warning/40', accent: 'text-warning', bar: 'bg-warning' },
  error: { icon: AlertCircle, ring: 'border-destructive/40', accent: 'text-destructive', bar: 'bg-destructive' },
  loading: { icon: Loader2, ring: 'border-border', accent: 'text-muted', bar: 'bg-foreground' },
};
const metaFor = (t) => meta[t] || meta.info;

const position = ref('bottom-right');
const durationMs = ref(5000);
const persist = ref(false);
const width = ref(360);
const maxStack = ref('3');
const order = ref(Order.NEWEST_FIRST);
const overflow = ref(Overflow.QUEUE);
const collapse = ref(true);
const pauseOnHover = ref(true);
const pauseOnTabBlur = ref(true);
const showIcon = ref(true);
const showProgress = ref(true);
const dismissible = ref(true);

let toaster = null;
const view = ref({ groups: [], toasts: [], reduceMotion: false });
const maxN = computed(() => Math.max(1, parseInt(maxStack.value, 10) || 3));

function build() {
  toaster?.destroy();
  toaster = createToaster({
    position: position.value, max: maxN.value, order: order.value, overflow: overflow.value,
    pauseOnTabBlur: pauseOnTabBlur.value, collapseDuplicates: collapse.value,
    enterDuration: 200, exitTimeout: 220,
    onChange: (s) => (view.value = s),
  });
  view.value = toaster.getState();
}
watch([position, maxN, order, overflow, pauseOnTabBlur, collapse], build, { immediate: true });
onBeforeUnmount(() => toaster?.destroy());

const dur = () => (persist.value ? 0 : durationMs.value);

const triggers = [
  { key: 'default', label: 'Default', type: ToastType.INFO, fire: () => toaster.toast({ message: 'Your changes have been saved.' }, { duration: dur(), dedupKey: 'saved' }) },
  { key: 'info', label: 'Info', type: ToastType.INFO, fire: () => toaster.toast.info({ title: 'Heads up', message: 'A new version of the app is available.' }, { duration: dur(), dedupKey: 'newver' }) },
  { key: 'success', label: 'Success', type: ToastType.SUCCESS, fire: () => toaster.toast.success({ title: 'Published', message: 'Your project is now live.' }, { duration: dur(), dedupKey: 'published' }) },
  { key: 'warning', label: 'Warning', type: ToastType.WARNING, fire: () => toaster.toast.warning({ title: 'Storage almost full', message: 'You’re using 92% of your quota.' }, { duration: dur(), dedupKey: 'storage' }) },
  { key: 'error', label: 'Error', type: ToastType.ERROR, fire: () => toaster.toast.error({ title: 'Upload failed', message: 'Could not reach the server. Try again.' }, { duration: dur(), dedupKey: 'uploadfail' }) },
];
function fireAction() {
  toaster.toast(
    { title: 'Item deleted', message: '“Master agreement.pdf” moved to Trash.', action: { label: 'Undo', icon: Undo2, run: (id) => { toaster.dismiss(id); toaster.toast.success({ message: 'File restored.' }, { duration: dur() }); } } },
    { duration: dur() },
  );
}
function firePromise() {
  const work = new Promise((res) => setTimeout(res, 1700));
  toaster.toast.promise(work, {
    loading: { title: 'Uploading…', message: 'Sending “Q3-report.pdf” to the vault.' },
    success: { title: 'Upload complete', message: '“Q3-report.pdf” is now in your vault.' },
    error: { title: 'Upload failed', message: 'Something went wrong.' },
  }, { duration: dur() });
}
function fireUpdating() {
  const id = toaster.toast.info({ title: 'Syncing', message: 'Step 1 of 3 — collecting changes' }, { duration: 0 });
  let step = 1;
  const iv = setInterval(() => {
    step++;
    if (step > 3) { clearInterval(iv); toaster.update(id, { title: 'Synced', message: 'All changes are up to date.' }, { type: ToastType.SUCCESS, duration: dur() }); return; }
    toaster.update(id, { title: 'Syncing', message: `Step ${step} of 3 — ${step === 2 ? 'uploading' : 'finalising'}` }, { duration: 0 });
  }, 850);
}
function clearAll() { toaster.dismissAll(); }
function onEnter() { if (pauseOnHover.value) toaster.pause(); }
function onLeave() { if (pauseOnHover.value) toaster.resume(); }

const dots = [
  { v: 'top-left', cls: 'top-1.5 left-1.5' }, { v: 'top-center', cls: 'top-1.5 left-1/2 -translate-x-1/2' }, { v: 'top-right', cls: 'top-1.5 right-1.5' },
  { v: 'bottom-left', cls: 'bottom-1.5 left-1.5' }, { v: 'bottom-center', cls: 'bottom-1.5 left-1/2 -translate-x-1/2' }, { v: 'bottom-right', cls: 'bottom-1.5 right-1.5' },
];
const posClass = (p) => {
  const top = p.startsWith('top');
  const h = p.endsWith('left') ? 'left-4' : p.endsWith('right') ? 'right-4' : 'left-1/2 -translate-x-1/2';
  return `${top ? 'top-4' : 'bottom-4'} ${h} ${top ? 'flex-col' : 'flex-col-reverse'}`;
};
const flyY = (p) => (p.startsWith('top') ? -20 : 20);
const totalLive = computed(() => view.value.toasts.length);
const durLabel = computed(() => (persist.value ? 'Until dismissed' : (durationMs.value / 1000).toFixed(durationMs.value % 1000 ? 1 : 0) + 's'));
const EXITING = ToastPhase.EXITING;
</script>

<template>
  <ComponentHeader>
    <ComponentHeaderTitle>Toast Engine</ComponentHeaderTitle>
    <ComponentHeaderDescription>
      A thin consumer of the headless toast engine. Fire toasts imperatively; the engine
      owns the queue, lifecycle phases, timers (paused on hover and when the tab is hidden),
      stacking order, position groups, overflow, de-duplication and promise wiring, and emits
      state — this page only paints it. Tune the engine below and fire any variant.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Fire any variant and tune position, duration, max-visible and overflow — the toaster owns the queue and timers while this page only paints the emitted state.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Triggers</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="flex flex-wrap items-center gap-2.5">
              <Button v-for="t in triggers" :key="t.key" variant="secondary" @click="t.fire"><component :is="metaFor(t.type).icon" :class="['size-icon-small', metaFor(t.type).accent]" /> {{ t.label }}</Button>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <Button variant="secondary" @click="fireAction"><Undo2 class="size-icon-small text-muted" /> With action</Button>
              <Button variant="secondary" @click="firePromise"><Loader2 class="size-icon-small text-muted" /> Promise</Button>
              <Button variant="secondary" @click="fireUpdating"><RefreshCw class="size-icon-small text-muted" /> Update in place</Button>
              <span class="mx-1 h-5 w-px bg-border"></span>
              <Button variant="quiet" :disabled="totalLive === 0" @click="clearAll">
                <Trash2 class="size-icon-small" /> Clear{{ totalLive ? ` (${totalLive})` : '' }}
              </Button>
            </div>
            <p class="mt-4 text-xs text-faint">Every button calls the engine (<code class="text-[11px]">toaster.toast()</code> / <code class="text-[11px]">.promise()</code> / <code class="text-[11px]">.update()</code>). Fire the same one repeatedly to watch identical toasts collapse into a count; hover the stack to pause every countdown.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Configuration</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-x-10 gap-y-7 rounded-large border border-border bg-surface p-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Position</span>
                  <span class="font-mono text-[11px] text-muted">{{ position }}</span>
                </div>
                <div class="relative h-24 w-full rounded-medium border border-border bg-background">
                  <button v-for="d in dots" :key="d.v" type="button" :aria-label="d.v" :class="['absolute grid h-5 w-7 place-items-center rounded-[3px] transition-colors', d.cls, position === d.v ? 'bg-foreground' : 'bg-border hover:bg-faint']" @click="position = d.v">
                    <span :class="['h-1.5 w-3 rounded-full', position === d.v ? 'bg-background' : 'bg-faint']"></span>
                  </button>
                </div>
              </div>

              <div class="flex flex-col gap-5">
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-medium uppercase tracking-wider text-faint">Timeout</span>
                    <span class="font-mono text-[11px] text-muted">{{ durLabel }}</span>
                  </div>
                  <Slider v-model="durationMs" :min="1000" :max="10000" :step="500" :disabled="persist" />
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Persist until dismissed</span><Switch v-model:checked="persist" /></label>
                </div>
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Max stack</span>
                  <div class="w-24"><NumberField v-model="maxStack" :min="1" :max="6" size="sm" /></div>
                </div>
              </div>

              <div class="flex flex-col gap-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Behaviour</span>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs text-muted">Ordering</span>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                    <button type="button" :class="['px-2 py-1', order === Order.NEWEST_FIRST ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="order = Order.NEWEST_FIRST">Newest first</button>
                    <button type="button" :class="['px-2 py-1', order === Order.NEWEST_LAST ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="order = Order.NEWEST_LAST">Newest last</button>
                  </div>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-xs text-muted">Overflow</span>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                    <button type="button" :class="['px-2 py-1', overflow === Overflow.QUEUE ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="overflow = Overflow.QUEUE">Queue extras</button>
                    <button type="button" :class="['px-2 py-1', overflow === Overflow.EVICT ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="overflow = Overflow.EVICT">Evict oldest</button>
                  </div>
                </div>
                <label class="flex items-center justify-between"><span class="text-xs text-muted">Collapse identical</span><Switch v-model:checked="collapse" /></label>
              </div>

              <div class="flex flex-col gap-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Pause &amp; chrome</span>
                <div class="grid grid-cols-2 gap-x-4 gap-y-3">
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">On hover</span><Switch v-model:checked="pauseOnHover" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">On tab blur</span><Switch v-model:checked="pauseOnTabBlur" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Icon</span><Switch v-model:checked="showIcon" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Progress</span><Switch v-model:checked="showProgress" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Dismiss</span><Switch v-model:checked="dismissible" /></label>
                </div>
              </div>
            </div>
            <p class="mt-4 text-xs text-faint">Position, ordering, overflow, stack cap and pause flags are engine config; the engine emits grouped, ordered, phase-tagged state and the page paints it. ARIA urgency is set by the engine (errors/warnings assertive).</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="toast-engine.js"
      :intro="toastIntro"
      :principles="toastPrinciples"
      :legend="toastLegend"
      :groups="toastGroups"
      :enums="toastEnums"
    />
  </div>

  <div
    v-for="group in view.groups"
    :key="group.position"
    :class="['pointer-events-none fixed z-modal flex gap-2', posClass(group.position)]"
    :style="{ width: width + 'px', maxWidth: 'calc(100vw - 2rem)' }"
    @pointerenter="onEnter"
    @pointerleave="onLeave"
  >
    <div
      v-for="t in group.toasts"
      :key="t.id"
      :role="t.role"
      :aria-live="t.ariaLive"
      :class="['te-toast pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-large border bg-surface p-4 shadow-panel', metaFor(t.type).ring, t.phase === EXITING ? 'te-leaving' : '']"
      :style="{ '--enter-y': flyY(group.position) + 'px', '--exit-y': flyY(group.position) + 'px' }"
    >
      <component :is="metaFor(t.type).icon" v-if="showIcon" :class="['mt-0.5 size-icon-medium shrink-0', metaFor(t.type).accent, t.type === 'loading' ? 'animate-spin' : '']" />
      <div class="min-w-0 flex-1 space-y-1">
        <p v-if="t.content && t.content.title" :class="['flex items-center gap-2 text-sm font-medium', metaFor(t.type).accent]">{{ t.content.title }}<span v-if="t.count > 1" class="rounded-full bg-foreground/10 px-1.5 text-[10px] tabular-nums text-muted">×{{ t.count }}</span></p>
        <p :class="['text-xs', (t.content && t.content.title) ? 'text-muted' : metaFor(t.type).accent]">{{ t.content && t.content.message }}<span v-if="!(t.content && t.content.title) && t.count > 1" class="ml-1.5 rounded-full bg-foreground/10 px-1.5 text-[10px] tabular-nums text-muted">×{{ t.count }}</span></p>
        <button v-if="t.content && t.content.action" type="button" class="mt-1.5 inline-flex items-center gap-1.5 rounded-medium border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none" @click="t.content.action.run(t.id)">
          <component :is="t.content.action.icon" v-if="t.content.action.icon" class="size-icon-small" />{{ t.content.action.label }}
        </button>
      </div>
      <button v-if="dismissible" type="button" aria-label="Dismiss" class="-mr-1 -mt-1 shrink-0 rounded-small p-1 text-faint transition-colors hover:text-foreground focus-visible:outline-none" @click="toaster.dismiss(t.id)"><X class="size-icon-small" /></button>
      <div
        v-if="showProgress && !t.sticky && t.type !== 'loading'"
        :key="t.id + '-' + t.type + '-' + t.duration + '-' + t.count"
        :class="['absolute bottom-0 left-0 h-0.5 w-full origin-left', metaFor(t.type).bar, 'opacity-60', t.paused ? 'te-bar-paused' : '']"
        :style="{ animation: `teProgress ${t.duration}ms linear forwards` }"
      ></div>
    </div>
    <div v-if="group.queued" class="pointer-events-none self-center rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[10px] font-medium text-muted shadow-card backdrop-blur">+{{ group.queued }} queued</div>
  </div>
</template>

<style>
@media (prefers-reduced-motion: no-preference) {
  .te-toast { animation: teEnter 240ms cubic-bezier(0.22, 1, 0.36, 1); }
  .te-leaving { animation: teExit 200ms ease forwards !important; }
}
.te-leaving { opacity: 0; pointer-events: none; transition: opacity 180ms ease; }
.te-bar-paused { animation-play-state: paused !important; }
@keyframes teEnter { from { transform: translateY(var(--enter-y, 20px)); } to { transform: translateY(0); } }
@keyframes teExit { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(var(--exit-y, 20px)); } }
@keyframes teProgress { from { transform: scaleX(1); } to { transform: scaleX(0); } }
</style>
