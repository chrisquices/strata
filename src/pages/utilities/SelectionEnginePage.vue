<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { MousePointerClick, SquareDashedMousePointer, CheckSquare, X, Copy, Trash2, Lock } from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Button from '../../components/ui/Button/Button.vue';
import Kbd from '../../components/ui/Kbd/Kbd.vue';
import Switch from '../../components/ui/Switch/Switch.vue';
import { createSelection, IntersectMode } from '../../lib/selection-engine/selection-engine.js';

const selIntro = 'createSelection() owns selection state — click (with shift-range and ctrl / meta-toggle), select-all / clear, an anchor for range math, and a marquee box that hit-tests items with auto-scroll — and emits the selected keys. The consumer reports clicks and pointer positions and paints the state.';
const selPrinciples = ['Renders no UI', 'Click + range + toggle', 'Marquee hit-testing', 'Spatial-index accelerated', 'Single or multi-select', 'Auto-scroll'];
const selLegend = [
  { name: 'key', desc: 'a stable item key (string)' },
  { name: 'SelectionState', desc: 'selected keys, anchor and the live marquee rect from getState()' },
];
const selGroups = [
  {
    label: 'Items & click', icon: MousePointerClick,
    methods: [
      { sig: 'createSelection(options): Selection', ret: 'Selection', desc: 'options: { multiple = true, intersect = "intersect", disabled, autoScroll, onChange }.' },
      { sig: 'setItems(list)', ret: 'Selection', desc: 'list: { key, rect, selectable? }[] — geometry the marquee tests against.' },
      { sig: 'getItemKeys()  ·  getItemCount()  ·  isSelectable(key)', ret: 'string[] | number | boolean' },
      { sig: 'selectAt(key, mods?)', ret: 'Selection', desc: 'mods: { shift, ctrl, meta } for range / toggle behaviour.' },
    ],
  },
  {
    label: 'Marquee', icon: SquareDashedMousePointer,
    methods: [
      { sig: 'startMarquee(x, y, options?)', ret: 'Selection', desc: 'options: { additive }.' },
      { sig: 'updateMarquee(x, y)', ret: 'Selection' },
      { sig: 'endMarquee()  ·  cancelMarquee()', ret: 'Selection', desc: 'Commit or revert the box.' },
      { sig: 'setScrollContainer(element)', ret: 'Selection', desc: 'The container the marquee auto-scrolls.' },
    ],
  },
  {
    label: 'Bulk & programmatic', icon: CheckSquare,
    methods: [
      { sig: 'selectAll()  ·  clear()  ·  toggle(key)', ret: 'Selection' },
      { sig: 'select(keys)  ·  deselect(keys)  ·  setSelection(keys)', ret: 'Selection' },
      { sig: 'isSelected(key)  ·  getSelectedKeys()', ret: 'boolean | string[]' },
      { sig: 'getAnchor()  ·  setAnchor(key)', ret: 'string | Selection' },
    ],
  },
  {
    label: 'Config & state', icon: Lock,
    methods: [
      { sig: 'setOptions(patch)', ret: 'Selection' },
      { sig: 'setIntersectMode(mode)  ·  setMultiple(on)', ret: 'Selection' },
      { sig: 'setDisabled(predicate | boolean)  ·  setAutoScroll(config)', ret: 'Selection' },
      { sig: 'subscribe(callback)  ·  on(type, listener)', ret: '() => void', desc: 'Events: marqueestart, marqueeend, marqueecancel.' },
      { sig: 'getState(): SelectionState  ·  destroy()', ret: 'SelectionState | void' },
    ],
  },
  {
    label: 'Pure helpers', icon: Copy,
    methods: [
      { sig: 'normalizeBox(x0, y0, x1, y1)', ret: 'Rect', desc: 'Order two corners into a positive rect.' },
      { sig: 'boxHitTest(items, box, mode = "intersect")', ret: 'Set<string>', desc: 'Keys whose rect intersects / is contained by the box.' },
      { sig: 'createSpatialIndex(items, cellSize?)', ret: '{ cellSize, query }', desc: 'Grid index for fast box queries on large lists.' },
      { sig: 'rangeBetween(orderedKeys, anchor, target)', ret: 'string[]', desc: 'The inclusive key slice between anchor and target.' },
    ],
  },
];
const selEnums = [
  { name: 'IntersectMode', values: ['intersect', 'contain'], note: 'How the marquee decides an item is in the box.' },
];

const swatches = ['#e2725b', '#5b8ce2', '#5bbf91', '#d9a441', '#8b6fd1', '#c95b8e', '#4cb1c4', '#b0763f', '#7d9b4e', '#d15b5b', '#6a7bd1', '#4fae6f'];
const assets = swatches.map((c, i) => ({ id: `a${i + 1}`, name: `Asset ${String(i + 1).padStart(2, '0')}`, kind: ['Image', 'Vector', 'Clip', 'Audio'][i % 4], color: c, locked: i === 2 || i === 8 }));
const tiles = Array.from({ length: 28 }, (_, i) => ({ id: `t${i + 1}`, locked: i === 5 || i === 17 }));

const singleMode = ref(false);
const intersect = ref(IntersectMode.INTERSECT);
const gridState = ref({ selected: new Set(), count: 0 });
const marqueeState = ref({ selected: new Set(), count: 0, marquee: { active: false, rect: null } });

const selGrid = createSelection({ multiple: true, onChange: (s) => (gridState.value = s) });
const selMarquee = createSelection({ multiple: true, intersect: intersect.value, additiveModifier: 'shift', onChange: (s) => (marqueeState.value = s) });
selGrid.setItems(assets.map((a) => ({ key: a.id, x: 0, y: 0, w: 0, h: 0, disabled: a.locked })));

const canvasEl = ref(null);
function measureTiles() {
  if (!canvasEl.value) return;
  const cr = canvasEl.value.getBoundingClientRect();
  const list = [...canvasEl.value.querySelectorAll('[data-tile]')].map((el) => {
    const r = el.getBoundingClientRect();
    return { key: el.dataset.tile, x: r.left - cr.left, y: r.top - cr.top, w: r.width, h: r.height, disabled: el.dataset.locked === '1' };
  });
  selMarquee.setItems(list);
}

let ro = null;
let grid = null;
let onEnter, onLeave, onKey;
let over = false;
onMounted(() => {
  measureTiles();
  ro = new ResizeObserver(() => measureTiles());
  ro.observe(canvasEl.value);
  grid = document.getElementById('sel-grid');
  onEnter = () => (over = true);
  onLeave = () => (over = false);
  onKey = (e) => {
    if (e.key === 'Escape') { selGrid.clear(); if (marqueeState.value.marquee.active) selMarquee.cancelMarquee(); }
    if (over && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') { e.preventDefault(); selGrid.selectAll(); }
  };
  grid?.addEventListener('pointerenter', onEnter);
  grid?.addEventListener('pointerleave', onLeave);
  window.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  ro?.disconnect();
  grid?.removeEventListener('pointerenter', onEnter);
  grid?.removeEventListener('pointerleave', onLeave);
  window.removeEventListener('keydown', onKey);
  selGrid.destroy();
  selMarquee.destroy();
});

watch(singleMode, (v) => selGrid.setMultiple(!v));
watch(intersect, (v) => selMarquee.setIntersectMode(v));

function clickAsset(e, a) {
  if (a.locked) return;
  selGrid.selectAt(a.id, { shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey });
}

function toContent(e) { const r = canvasEl.value.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
function onCanvasDown(e) {
  if (e.button != null && e.button !== 0) return;
  if (e.target.closest('[data-tile]')) return;
  const { x, y } = toContent(e);
  selMarquee.startMarquee(x, y, { modifiers: { shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey } });
  const move = (ev) => { const p = toContent(ev); selMarquee.updateMarquee(p.x, p.y); };
  const up = () => { selMarquee.endMarquee(); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  e.preventDefault();
}

const box = computed(() => marqueeState.value.marquee.rect);
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Selection Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless selection engine — it owns <strong class="font-medium text-foreground">what is selected</strong>:
      the set, the shift-range anchor, single/multi mode, disabled items, and the marquee
      (box hit-testing with touch/contain, additive, revert, delta-tracked for huge lists).
      The page reports clicks and pointer positions and paints the emitted state.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Click, shift-click and ctrl / ⌘-click to build a selection, or drag a marquee over the grid — the engine owns the selection and hit-testing while this page paints the cells and the lasso.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Click &amp; keyboard</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="mb-3 flex flex-wrap items-center gap-3">
              <label class="flex items-center gap-2 text-xs text-muted"><Switch v-model:checked="singleMode" /><span>Single-select mode</span></label>
              <span class="text-[11px] text-faint">{{ singleMode ? 'Any click selects exactly one item.' : 'Cmd-click toggles · Shift-click ranges · Shift+Cmd adds a range.' }}</span>
            </div>

            <div :class="['mb-3 flex items-center gap-3 rounded-large border px-3 py-2 transition-all duration-200', gridState.count ? 'border-border bg-surface opacity-100' : 'border-transparent opacity-60']">
              <div class="flex items-center gap-2">
                <span :class="['grid size-6 place-items-center rounded-medium text-xs font-medium tabular-nums transition-colors', gridState.count ? 'bg-foreground text-background' : 'bg-surface text-faint']">{{ gridState.count }}</span>
                <span class="text-sm text-muted">selected</span>
              </div>
              <div class="ml-auto flex items-center gap-1.5">
                <Button variant="quiet" size="sm" :disabled="!gridState.count"><Copy class="size-icon-small" /> Duplicate</Button>
                <Button variant="quiet" size="sm" :disabled="!gridState.count"><Trash2 class="size-icon-small" /> Delete</Button>
                <Button variant="secondary" size="sm" :disabled="singleMode" @click="selGrid.selectAll()"><CheckSquare class="size-icon-small" /> Select all</Button>
                <Button variant="secondary" size="sm" :disabled="!gridState.count" @click="selGrid.clear()"><X class="size-icon-small" /> Clear</Button>
              </div>
            </div>

            <div id="sel-grid" class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              <div v-for="a in assets" :key="a.id" :class="['group relative flex select-none flex-col overflow-hidden rounded-large border bg-surface transition-all duration-100', a.locked ? 'cursor-not-allowed opacity-55' : 'cursor-default', gridState.selected.has(a.id) ? 'border-foreground ring-1 ring-foreground/40' : 'border-border hover:border-foreground/30']" @click="(e) => clickAsset(e, a)">
                <div class="relative h-20 w-full" :style="{ background: a.color }">
                  <span v-if="a.locked" class="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-small bg-overlay/50 text-background backdrop-blur-sm"><Lock class="size-3" /></span>
                </div>
                <div class="flex items-center justify-between gap-2 px-2.5 py-2">
                  <div class="min-w-0"><p class="truncate text-sm text-foreground">{{ a.name }}</p><p class="text-xs text-faint">{{ a.locked ? 'Locked' : a.kind }}</p></div>
                  <span v-if="!a.locked" :class="['grid size-5 shrink-0 place-items-center rounded-small border transition-all', gridState.selected.has(a.id) ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-transparent group-hover:border-foreground/40']"><CheckSquare class="size-3" /></span>
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-faint">
              <span class="flex items-center gap-1.5"><Kbd>⌘</Kbd>click <span class="text-muted">toggle</span></span>
              <span class="flex items-center gap-1.5"><Kbd>⇧</Kbd>click <span class="text-muted">range</span></span>
              <span class="flex items-center gap-1.5"><Kbd>⇧</Kbd><Kbd>⌘</Kbd>click <span class="text-muted">add range</span></span>
              <span class="flex items-center gap-1.5"><Kbd>⌘</Kbd><Kbd>A</Kbd><span class="text-muted">all</span></span>
              <span class="flex items-center gap-1.5"><Kbd>Esc</Kbd><span class="text-muted">clear</span></span>
              <span class="text-muted/70">Locked items can't be selected; ranges skip them.</span>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Marquee (rubber-band)</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="mb-3 flex flex-wrap items-center gap-3">
              <span class="flex items-center gap-2 text-sm text-muted"><SquareDashedMousePointer class="size-icon-small text-faint" /><span><span class="font-medium tabular-nums text-foreground">{{ marqueeState.count }}</span> selected</span></span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-faint">Hit test</span>
                <div class="inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
                  <button type="button" :class="['px-2 py-1 transition-colors', intersect === IntersectMode.INTERSECT ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="intersect = IntersectMode.INTERSECT">Touch</button>
                  <button type="button" :class="['px-2 py-1 transition-colors', intersect === IntersectMode.CONTAIN ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="intersect = IntersectMode.CONTAIN">Enclose</button>
                </div>
              </div>
              <Button variant="secondary" size="sm" class="ml-auto" :disabled="marqueeState.count === 0" @click="selMarquee.clear()"><X class="size-icon-small" /> Clear</Button>
            </div>

            <div ref="canvasEl" class="relative select-none overflow-hidden rounded-large border border-border bg-input p-4" style="touch-action:none" @pointerdown="onCanvasDown">
              <div class="grid grid-cols-4 gap-3 sm:grid-cols-7">
                <div v-for="t in tiles" :key="t.id" :data-tile="t.id" :data-locked="t.locked ? '1' : '0'" :class="['relative grid aspect-square place-items-center rounded-medium border transition-colors duration-100', t.locked ? 'border-border/60 bg-background/50' : marqueeState.selected.has(t.id) ? 'border-foreground bg-foreground/15 ring-1 ring-foreground/40' : 'border-border bg-surface']">
                  <Lock v-if="t.locked" class="size-icon-small text-faint/60" />
                </div>
              </div>
              <div v-if="box && marqueeState.marquee.active" class="pointer-events-none absolute z-10 rounded-small border border-foreground/70 bg-foreground/10" :style="{ left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' }"></div>
            </div>
            <p class="mt-3 text-xs text-faint">Drag across the canvas to band-select. <Kbd>⇧</Kbd> while dragging adds to the selection; <Kbd>Esc</Kbd> mid-drag cancels and reverts. <span class="text-muted">Touch</span> selects on overlap; <span class="text-muted">Enclose</span> needs the tile fully inside the box. Locked tiles are skipped.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="selection-engine.js"
      :intro="selIntro"
      :principles="selPrinciples"
      :legend="selLegend"
      :groups="selGroups"
      :enums="selEnums"
    />
  </div>
</template>
