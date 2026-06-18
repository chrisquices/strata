<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { GripVertical, GripHorizontal, Plus, Lock, ArrowUp, ArrowDown, Shuffle } from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Badge from '../../components/ui/Badge/Badge.vue';
import StatusDot from '../../components/ui/StatusDot/StatusDot.vue';
import { createSortable, Orientation } from '../../lib/sortable-engine/sortable-engine.js';

const sortIntro = 'createSortable() owns reorder and cross-list drag logic — the active drag, the provisional order, drop-index math, keyboard moves, auto-scroll and connected groups — and emits that state. The consumer renders the list and paints the gap, the slide and the lifted clone.';
const sortPrinciples = ['Renders no UI', 'Input-agnostic drag controller', 'Single + connected lists', 'Keyboard reorder', 'Locked / disabled items', 'Auto-scroll'];
const sortLegend = [
  { name: 'key', desc: 'a stable item key (string) the engine tracks order by' },
  { name: 'SortState', desc: 'lists, the active drag and the provisional order from getState()' },
];
const sortGroups = [
  {
    label: 'Lists & items', icon: GripVertical,
    methods: [
      { sig: 'createSortable(options): Sortable', ret: 'Sortable', desc: 'options: { orientation = "vertical", group, disabled, onChange, onChanged }.' },
      { sig: 'registerList(id, options)', ret: '() => void', desc: 'Register a list; returns an unregister fn.' },
      { sig: 'unregisterList(id)', ret: 'Sortable' },
      { sig: 'registerItem(listId, key, item)', ret: 'Sortable', desc: 'item: { el?, handleEl?, disabled?, locked? }.' },
      { sig: 'unregisterItem(listId, key)', ret: 'Sortable' },
      { sig: 'setItems(listId, keys: string[])  ·  getItems(listId)', ret: 'Sortable | string[]', desc: 'Replace / read a list order.' },
    ],
  },
  {
    label: 'Drag controller', icon: Shuffle,
    methods: [
      { sig: 'beginDrag(listId, key, pointer)', ret: 'boolean', desc: 'Start a drag — input-agnostic and drivable in tests.' },
      { sig: 'moveDragTo(pointer)  ·  moveDragBy(delta)  ·  moveDragToList(listId)', ret: 'void', desc: 'Update the provisional position.' },
      { sig: 'drop()  ·  cancel()', ret: 'Sortable', desc: 'Commit or abandon the drag.' },
      { sig: 'refresh()', ret: 'Sortable', desc: 'Remeasure item rects.' },
      { sig: 'move(listId, from: number, to: number)', ret: 'Sortable', desc: 'Programmatic reorder (no pointer).' },
    ],
  },
  {
    label: 'Config & state', icon: Lock,
    methods: [
      { sig: 'setOptions(patch)', ret: 'Sortable' },
      { sig: 'setOrientation(orientation)  ·  setGroup(listId, group)', ret: 'Sortable' },
      { sig: 'setDisabled(predicate | boolean)', ret: 'Sortable' },
      { sig: 'subscribe(callback)', ret: '() => void', desc: 'Push the snapshot on every change.' },
      { sig: 'on(type, listener)', ret: '() => void', desc: 'Events: dragstart, changed, dragend, cancel.' },
      { sig: 'getState(): SortState  ·  destroy()', ret: 'SortState | void' },
    ],
  },
  {
    label: 'Pure helpers', icon: ArrowDown,
    methods: [
      { sig: 'computeDropIndex(rects, pointer, orientation = "vertical")', ret: 'number', desc: 'Project the pointer onto the axis to a drop index.' },
      { sig: 'reorderWithin(keys: string[], from: number, to: number)', ret: 'string[]', desc: 'Pure array reorder — returns a new array.' },
    ],
  },
];
const sortEnums = [
  { name: 'Orientation', values: ['vertical', 'horizontal'], note: 'Axis the drop-index math projects onto.' },
];

const rowMeta = {
  r1: { n: '01', title: 'Establishing aerials — coastline', dur: '00:42', tone: 'success' },
  r2: { n: '02', title: 'Interview A — colour graded', dur: '03:18', tone: 'success' },
  r3: { n: '03', title: 'B-roll — workshop close-ups', dur: '01:05', tone: 'muted' },
  r4: { n: '04', title: 'Title card — animated logo', dur: '00:08', tone: 'success', locked: true },
  r5: { n: '05', title: 'Interview B — raw, needs trim', dur: '04:51', tone: 'warn' },
  r6: { n: '06', title: 'Outro — credits roll', dur: '00:36', tone: 'muted' },
};
const cardMeta = {
  k1: { title: 'Audit colour tokens', tag: 'Design' }, k2: { title: 'Empty-state illustrations', tag: 'Design' },
  k3: { title: 'Keyboard nav for menus', tag: 'A11y' }, k4: { title: 'Sortable engine', tag: 'Eng' },
  k5: { title: 'Drop-zone validation', tag: 'Eng' }, k6: { title: 'Virtualizer pooling', tag: 'Eng' },
};
const chipMeta = { c1: 'Cover', c2: 'Intro', c3: 'Demo', c4: 'Pricing', c5: 'Team', c6: 'Q&A' };
const colMeta = [
  { id: 'backlog', label: 'Backlog', tone: 'muted' },
  { id: 'active', label: 'In progress', tone: 'warn' },
  { id: 'done', label: 'Shipped', tone: 'success' },
];
const dotTone = { success: 'success', warn: 'destructive', muted: 'muted' };

const listState = ref({ lists: [], drag: { active: false } });
const boardState = ref({ lists: [], drag: { active: false } });
const chipState = ref({ lists: [], drag: { active: false } });
const announce = ref('');

const sList = createSortable({ orientation: Orientation.VERTICAL, handle: true, keyboard: true, onChange: (s) => (listState.value = s) });
const sBoard = createSortable({ orientation: Orientation.VERTICAL, group: 'board', keyboard: true, onChange: (s) => (boardState.value = s) });
const sChips = createSortable({ orientation: Orientation.HORIZONTAL, handle: true, keyboard: true, onChange: (s) => (chipState.value = s) });
sList._id = 'L'; sBoard._id = 'B'; sChips._id = 'C';

const elByKey = new Map();
const regLists = new Set();

const vSortableItem = {
  mounted(node, binding) {
    const p = binding.value;
    node.__sortP = p;
    const listEl = node.closest('[data-sortlist]');
    const tag = p.inst._id + '|' + p.listId;
    if (!regLists.has(tag)) {
      regLists.add(tag);
      p.inst.registerList(listEl, { id: p.listId, group: p.group ?? null, orientation: p.orientation || Orientation.VERTICAL });
    }
    const handleEl = p.handle ? node.querySelector('[data-drag-handle]') : null;
    p.inst.registerItem(node, p.key, p.listId, { handleEl, locked: !!p.locked, disabled: !!p.disabled });
    elByKey.set(p.key, node);
  },
  updated(node, binding) { node.__sortP = binding.value; },
  unmounted(node) {
    const p = node.__sortP;
    if (p) { p.inst.unregisterItem(p.key, p.listId); elByKey.delete(p.key); }
  },
};

let off = [];
onMounted(() => {
  off = [
    sList.on('dragstart', (d) => { announce.value = d.announcement || ''; }),
    sList.on('change', (s) => { if (s.drag.active && s.drag.announcement) announce.value = s.drag.announcement; }),
  ];
});
onBeforeUnmount(() => { off.forEach((f) => f()); sList?.destroy(); sBoard?.destroy(); sChips?.destroy(); });

const listOrder = (state, id) => (state.lists.find((l) => l.id === id)?.items) ?? [];
function cloneStyle(drag) {
  if (!drag.position) return '';
  const el = elByKey.get(drag.key);
  const w = el ? el.getBoundingClientRect().width : 0;
  return `left:${drag.position.x}px;top:${drag.position.y}px;${w ? `width:${w}px;` : ''}`;
}

function moveBy(key, dir) {
  const order = listOrder(listState.value, 'clips');
  const i = order.indexOf(key);
  sList.move(key, 'clips', Math.max(0, Math.min(order.length - 1, i + dir)));
}
function shuffle() {
  const a = [...listOrder(listState.value, 'clips')];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  sList.setItems('clips', a);
  announce.value = 'Shuffled.';
}

const initialClips = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
const initialBoard = { backlog: ['k1', 'k2', 'k3'], active: ['k4', 'k5'], done: ['k6'] };
const initialChips = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6'];
const clipsOrder = computed(() => (listState.value.lists.length ? listOrder(listState.value, 'clips') : initialClips));
const chipsOrder = computed(() => (chipState.value.lists.length ? listOrder(chipState.value, 'chips') : initialChips));
const boardOrder = (id) => (boardState.value.lists.length ? listOrder(boardState.value, id) : initialBoard[id]);

const rowGrabbed = (key) => listState.value.drag.active && listState.value.drag.key === key && listState.value.drag.keyboard;
const cardGrabbed = (key) => boardState.value.drag.active && boardState.value.drag.key === key && boardState.value.drag.keyboard;
const chipGrabbed = (key) => chipState.value.drag.active && chipState.value.drag.key === key && chipState.value.drag.keyboard;
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Sortable Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless reorder engine. It tracks pointer drags (with a move
      threshold and a lifted-item position) and keyboard reordering, computes the provisional
      order and cross-list (kanban) moves, honours locked / disabled items, announces every
      move for screen readers, and emits state — this page only registers the elements and
      paints the gap, the slide and the lifted clone.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Drag to reorder within a list or across connected lists, or move items by keyboard — the engine computes the order and drag state while this page paints the gap, slide and lifted clone.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Reorder a list</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="max-w-xl">
              <div class="mb-3 flex items-center gap-3">
                <button type="button" class="inline-flex items-center gap-1.5 rounded-medium border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-background focus-visible:outline-none" @click="shuffle"><Shuffle class="size-icon-small text-muted" /> Shuffle from code</button>
                <span class="text-[11px] text-faint">Drag the handle, use the hover arrows (<code class="text-[11px]">move()</code>), or focus a handle and press <kbd class="rounded border border-border px-1 font-mono">Space</kbd>.</span>
              </div>
              <TransitionGroup tag="div" name="flip" data-sortlist class="flex select-none flex-col gap-2">
                <div v-for="key in clipsOrder" :key="key" class="group/row" v-sortable-item="{ inst: sList, key, listId: 'clips', handle: true, locked: rowMeta[key].locked }">
                  <div v-if="listState.drag.active && listState.drag.key === key && !listState.drag.keyboard" class="rounded-large border border-dashed border-foreground/30 bg-foreground/[0.04]" style="height:54px"></div>
                  <div v-else :class="['flex items-center gap-3 rounded-large border bg-surface px-3 py-3 transition-colors duration-100', rowGrabbed(key) ? 'border-foreground ring-1 ring-foreground/40' : 'border-border hover:border-foreground/20']">
                    <span v-if="rowMeta[key].locked" class="-ml-1 grid size-7 shrink-0 place-items-center rounded-medium text-faint" title="Locked — can't be moved"><Lock class="size-icon-small" /></span>
                    <button v-else type="button" data-drag-handle tabindex="0" aria-label="Drag or press space to reorder" class="-ml-1 grid size-7 shrink-0 cursor-grab place-items-center rounded-medium text-faint transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40" style="touch-action:none"><GripVertical class="size-icon-medium" /></button>
                    <span class="w-6 shrink-0 font-mono text-xs text-faint tabular-nums">{{ rowMeta[key].n }}</span>
                    <StatusDot :variant="dotTone[rowMeta[key].tone]" class="shrink-0" />
                    <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ rowMeta[key].title }}</span>
                    <span class="shrink-0 font-mono text-xs text-muted tabular-nums">{{ rowMeta[key].dur }}</span>
                    <div v-if="!rowMeta[key].locked" class="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                      <button type="button" aria-label="Move up" class="grid size-6 place-items-center rounded-small text-faint transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none" @click="moveBy(key, -1)"><ArrowUp class="size-icon-small" /></button>
                      <button type="button" aria-label="Move down" class="grid size-6 place-items-center rounded-small text-faint transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:outline-none" @click="moveBy(key, 1)"><ArrowDown class="size-icon-small" /></button>
                    </div>
                  </div>
                </div>
              </TransitionGroup>
              <p class="mt-3 text-xs text-faint">The dashed slot is the engine's live gap; release to commit. Keyboard: <kbd class="rounded border border-border px-1 font-mono">Space</kbd> grab, <kbd class="rounded border border-border px-1 font-mono">↑</kbd>/<kbd class="rounded border border-border px-1 font-mono">↓</kbd> move, <kbd class="rounded border border-border px-1 font-mono">Esc</kbd> cancel. The locked row can't be picked up.</p>
              <div class="sr-only" aria-live="polite" role="status">{{ announce }}</div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Move between lists</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid select-none grid-cols-1 gap-3 sm:grid-cols-3">
              <div v-for="col in colMeta" :key="col.id" :class="['flex flex-col rounded-large border bg-surface transition-colors duration-200', boardState.drag.active && boardState.drag.targetList === col.id ? 'border-foreground/40 bg-foreground/[0.03]' : 'border-border']">
                <div class="flex items-center gap-2 border-b border-border px-3 py-2.5">
                  <StatusDot :variant="dotTone[col.tone]" />
                  <span class="text-xs font-medium uppercase tracking-wider text-muted">{{ col.label }}</span>
                  <span class="ml-auto font-mono text-xs text-faint tabular-nums">{{ boardOrder(col.id).length }}</span>
                </div>
                <TransitionGroup tag="div" name="flip" data-sortlist :data-list="col.id" class="flex min-h-32 flex-col gap-2 p-2.5">
                  <div v-for="key in boardOrder(col.id)" :key="key" v-sortable-item="{ inst: sBoard, key, listId: col.id, group: 'board' }">
                    <div v-if="boardState.drag.active && boardState.drag.key === key && !boardState.drag.keyboard" class="rounded-medium border border-dashed border-foreground/30 bg-foreground/[0.05]" style="height:46px"></div>
                    <div v-else :class="['flex cursor-grab items-start gap-2.5 rounded-medium border bg-background px-3 py-2.5 transition-colors duration-100', cardGrabbed(key) ? 'border-foreground ring-1 ring-foreground/40' : 'border-border hover:border-foreground/25']" style="touch-action:none">
                      <GripHorizontal class="mt-0.5 size-icon-small shrink-0 text-faint" />
                      <span class="min-w-0 flex-1 text-sm leading-snug text-foreground">{{ cardMeta[key].title }}</span>
                      <Badge variant="secondary" class="shrink-0">{{ cardMeta[key].tag }}</Badge>
                    </div>
                  </div>
                  <div v-if="boardOrder(col.id).length === 0" key="empty" :class="['grid flex-1 place-items-center rounded-medium border border-dashed py-6 text-xs transition-colors duration-200', boardState.drag.active && boardState.drag.targetList === col.id ? 'border-foreground/40 text-muted' : 'border-border text-faint']"><span class="flex items-center gap-1.5"><Plus class="size-icon-small" /> Drop here</span></div>
                </TransitionGroup>
              </div>
            </div>
            <p class="mt-3 text-xs text-faint">Cards share one engine group, so a drag carries across columns — the engine highlights the target column and opens a gap. Keyboard: grab a card, then <kbd class="rounded border border-border px-1 font-mono">←</kbd>/<kbd class="rounded border border-border px-1 font-mono">→</kbd> moves it between columns.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Horizontal list</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <TransitionGroup tag="div" name="flip" data-sortlist class="flex select-none flex-wrap items-center gap-2 rounded-large border border-border bg-input p-3">
              <div v-for="key in chipsOrder" :key="key" v-sortable-item="{ inst: sChips, key, listId: 'chips', handle: true, orientation: Orientation.HORIZONTAL }">
                <div v-if="chipState.drag.active && chipState.drag.key === key && !chipState.drag.keyboard" class="rounded-full border border-dashed border-foreground/30 bg-foreground/[0.05]" style="width:84px;height:34px"></div>
                <span v-else data-drag-handle tabindex="0" :class="['inline-flex cursor-grab items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40', chipGrabbed(key) ? 'border-foreground bg-surface text-foreground ring-1 ring-foreground/40' : 'border-border bg-surface text-foreground hover:border-foreground/30']" style="touch-action:none"><GripHorizontal class="size-icon-small text-faint" />{{ chipMeta[key] }}</span>
              </div>
            </TransitionGroup>
            <p class="mt-3 text-xs text-faint">The same engine on a horizontal axis — insertion is computed against each chip's mid-point. A wrapping grid is the same engine with <code class="text-[11px]">orientation: 'grid'</code>.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="sortable-engine.js"
      :intro="sortIntro"
      :principles="sortPrinciples"
      :legend="sortLegend"
      :groups="sortGroups"
      :enums="sortEnums"
    />
  </div>

  <div v-if="listState.drag.active && !listState.drag.keyboard" class="pointer-events-none fixed z-modal" :style="cloneStyle(listState.drag)">
    <div class="flex items-center gap-3 rounded-large border border-foreground/30 bg-surface px-3 py-3 shadow-overlay">
      <span class="-ml-1 grid size-7 shrink-0 place-items-center rounded-medium text-foreground"><GripVertical class="size-icon-medium" /></span>
      <span class="w-6 shrink-0 font-mono text-xs text-faint tabular-nums">{{ rowMeta[listState.drag.key].n }}</span>
      <StatusDot :variant="dotTone[rowMeta[listState.drag.key].tone]" class="shrink-0" />
      <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ rowMeta[listState.drag.key].title }}</span>
      <span class="shrink-0 font-mono text-xs text-muted tabular-nums">{{ rowMeta[listState.drag.key].dur }}</span>
    </div>
  </div>
  <div v-if="boardState.drag.active && !boardState.drag.keyboard" class="pointer-events-none fixed z-modal" :style="cloneStyle(boardState.drag)">
    <div class="flex cursor-grabbing items-start gap-2.5 rounded-medium border border-foreground/30 bg-background px-3 py-2.5 shadow-overlay">
      <GripHorizontal class="mt-0.5 size-icon-small shrink-0 text-faint" />
      <span class="min-w-0 flex-1 text-sm leading-snug text-foreground">{{ cardMeta[boardState.drag.key].title }}</span>
      <Badge variant="secondary" class="shrink-0">{{ cardMeta[boardState.drag.key].tag }}</Badge>
    </div>
  </div>
  <div v-if="chipState.drag.active && !chipState.drag.keyboard" class="pointer-events-none fixed z-modal" :style="cloneStyle(chipState.drag)">
    <span class="inline-flex cursor-grabbing items-center gap-1.5 rounded-full border border-foreground/30 bg-surface px-3 py-1.5 text-sm text-foreground shadow-overlay"><GripHorizontal class="size-icon-small text-faint" />{{ chipMeta[chipState.drag.key] }}</span>
  </div>
</template>

<style scoped>
.flip-move {
  transition: transform 200ms cubic-bezier(0.33, 1, 0.68, 1);
}
</style>
