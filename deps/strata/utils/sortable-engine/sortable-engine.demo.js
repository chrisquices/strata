// sortable-engine/sortable-engine.demo.js
// Reference CONSUMER for the headless drag-to-reorder engine (../sortable-engine.js).
// The engine ships no item DOM and no CSS — EVERYTHING visible here is the consumer's:
// the lists, the cards, the lifted clone that follows the pointer, the gap/placeholder,
// the kanban columns, the drag handles, the keyboard focus ring, the auto-scroll list,
// the "what changed" log. The engine is only handed the container + item elements (by
// reference) and their stable keys; it emits the order + drag-state and we paint.
//
// The proof points (Gate 3): we re-render each list purely from the emitted key ORDER
// (state.lists[].items) — that is the source of truth. We never ask the engine to move
// a DOM node or apply a transform; the FLIP slide animation below is the CONSUMER doing
// its own First-Last-Invert-Play from the order. Swap this renderer for React/Vue and
// the engine is unchanged.
//
// Loaded as a native ES module (no build step); the dev server serves the repo root so
// the bare relative import resolves.

import { createSortable } from './sortable-engine.js';

const $ = (id) => document.getElementById(id);
const live = $('live');
const log = $('log');

// The consumer owns the item CONTENT (key -> label/sub). The engine owns only the ORDER
// (arrays of keys). This split is the headless boundary made concrete.
const CONTENT = new Map();

function logChanged(p, instanceLabel) {
  const placeholder = log.querySelector('.empty-log');
  if (placeholder) placeholder.remove();
  const line = document.createElement('div');
  line.className = 'log-line';
  line.innerHTML = `<b>${instanceLabel}</b> moved <code>${p.key}</code> · ${p.fromList}[${p.fromIndex}] → ${p.toList}[${p.toIndex}]`;
  log.prepend(line);
  while (log.children.length > 8) log.lastChild.remove();
}

const arraysEqual = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

// ---- DOM building (entirely the consumer's choice) -------------------------

function rowEl(item, { handle }) {
  const row = document.createElement('div');
  row.className = 'row';
  row.dataset.key = item.key;
  row.tabIndex = 0;                 // focusable → keyboard reordering works
  row.setAttribute('role', 'option');
  row.setAttribute('aria-grabbed', 'false');
  if (item.disabled) row.classList.add('is-disabled');
  if (handle && !item.disabled) {
    const grip = document.createElement('span');
    grip.className = 'grip';
    grip.setAttribute('aria-hidden', 'true');
    grip.textContent = '⠿';
    row.appendChild(grip);
  }
  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = item.label;
  row.appendChild(label);
  if (item.sub) {
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = item.sub;
    row.appendChild(sub);
  }
  if (item.disabled || item.locked) {
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = item.locked ? 'pinned' : 'locked';
    row.appendChild(tag);
  }
  return row;
}

// ---- one mount = one engine instance with one or more lists ----------------

function mount({ label, options, columns }) {
  const s = createSortable(options);
  const rows = new Map();      // key -> rowEl   (ONE map per mount; keys are unique here,
                              //                  so a key moving columns just relocates its node)
  const mountElOf = new Map(); // listId -> container element
  const lastOrder = new Map(); // listId -> [keys]  (to detect when to FLIP)
  const myLists = new Set(columns.map((c) => c.id));
  let clone = null;

  for (const col of columns) {
    const regs = [];
    mountElOf.set(col.id, col.mountEl);
    for (const item of col.items) {
      CONTENT.set(item.key, item);
      const row = rowEl(item, { handle: col.handle });
      rows.set(item.key, row);
      col.mountEl.appendChild(row);
      regs.push({ key: item.key, el: row, handleEl: col.handle ? row.querySelector('.grip') : null, disabled: !!item.disabled, locked: !!item.locked });
    }
    lastOrder.set(col.id, col.items.map((i) => i.key));
    // Element BY REFERENCE + items BY KEY: hand the engine the container and each row.
    s.registerList(col.listEl || col.mountEl, {
      id: col.id, items: regs,
      group: options.group, orientation: options.orientation || 'vertical',
      scrollEl: col.scrollEl,
    });
  }

  s.on('changed', (p) => logChanged(p, label));
  s.on('dragend', () => { live.textContent = ''; });
  s.subscribe(render);
  render(s.getState());

  const findRow = (key) => rows.get(key) || null;

  // First-Last-Invert-Play across the WHOLE mount in one pass: snapshot every row's
  // position, relocate rows to match each list's emitted ORDER (moving nodes between
  // columns when a key changed lists), then transition each from old → new. Driven
  // purely by the order the engine emits — the consumer animates; the engine does not.
  function render(state) {
    const lists = state.lists.filter((l) => myLists.has(l.id));
    const changedLists = lists.filter((l) => !arraysEqual(l.items, lastOrder.get(l.id)));
    let first = null;
    if (changedLists.length) {
      first = new Map();
      for (const [k, row] of rows) first.set(k, row.getBoundingClientRect());
      for (const l of changedLists) {
        const cont = mountElOf.get(l.id);
        for (const k of l.items) { const r = rows.get(k); if (r) cont.appendChild(r); } // relocate / reorder
        lastOrder.set(l.id, l.items.slice());
      }
      for (const [k, row] of rows) {
        const a = first.get(k); if (!a) continue;
        const b = row.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (dx || dy) {
          row.style.transition = 'none';
          row.style.transform = `translate(${dx}px, ${dy}px)`;
          requestAnimationFrame(() => { row.style.transition = 'transform .18s cubic-bezier(.2,.7,.3,1)'; row.style.transform = ''; });
        }
      }
    }
    for (const [key, row] of rows) {
      const dragged = state.drag.active && state.drag.key === key;
      // pointer drag → the in-flow row becomes the GAP (a floating clone follows the pointer);
      // keyboard drag → no clone, so highlight the row itself as it steps through slots.
      row.classList.toggle('is-gap', dragged && !!state.drag.pointer);
      row.classList.toggle('is-grabbed', dragged && state.drag.keyboard);
      row.setAttribute('aria-grabbed', dragged ? 'true' : 'false');
    }
    for (const id of myLists) {
      const el = mountElOf.get(id);
      el.classList.toggle('is-target', state.drag.active && state.drag.targetList === id);
      el.classList.toggle('drag-on', state.drag.active);
    }
    updateClone(state.drag);
    if (state.drag.announcement) live.textContent = state.drag.announcement;
  }

  function updateClone(d) {
    const owns = d.active && d.key && findRow(d.key);
    if (owns && d.position && d.pointer) {
      if (!clone) {
        const src = owns;
        const r = src.getBoundingClientRect();
        clone = src.cloneNode(true);
        clone.classList.add('clone');
        clone.classList.remove('is-gap');
        clone.removeAttribute('id');
        clone.style.width = `${r.width}px`;
        clone.style.height = `${r.height}px`;
        document.body.appendChild(clone);
      }
      clone.style.left = `${d.position.x}px`;
      clone.style.top = `${d.position.y}px`;
    } else if (clone) {
      clone.remove();
      clone = null;
    }
  }

  return s;
}

// ============================================================================
// Section A — a single vertical list: whole-item drag + keyboard reordering.
// ============================================================================

mount({
  label: 'Playlist',
  options: { orientation: 'vertical', keyboard: true, threshold: 5 },
  columns: [{
    id: 'playlist', mountEl: $('vlist'),
    items: [
      { key: 'p1', label: 'Intro', sub: '0:42' },
      { key: 'p2', label: 'The Approach', sub: '3:18' },
      { key: 'p3', label: 'Midnight Drive', sub: '4:05' },
      { key: 'p4', label: 'Glass', sub: '2:51' },
      { key: 'p5', label: 'Afterglow', sub: '5:30' },
      { key: 'p6', label: 'Outro', sub: '1:12' },
    ],
  }],
});

// ============================================================================
// Section B — a kanban board: three CONNECTED lists, cross-list drag, empty
// column as a valid drop target. Keyboard cross-list via ←/→.
// ============================================================================

mount({
  label: 'Board',
  options: { orientation: 'vertical', group: 'board', keyboard: true, threshold: 5 },
  columns: [
    {
      id: 'todo', mountEl: $('col-todo'),
      items: [
        { key: 't1', label: 'Spec the API' },
        { key: 't2', label: 'Sketch the demo' },
        { key: 't3', label: 'Write the gap math' },
      ],
    },
    {
      id: 'doing', mountEl: $('col-doing'),
      items: [
        { key: 'd1', label: 'Drop-index tests' },
        { key: 'd2', label: 'Keyboard parity' },
      ],
    },
    { id: 'done', mountEl: $('col-done'), items: [] }, // starts EMPTY — drop a card here
  ],
});

// ============================================================================
// Section C — drag HANDLES: only the ⠿ grip starts a drag; the body stays
// clickable / selectable. One row is locked (non-displaceable + not draggable).
// ============================================================================

mount({
  label: 'Handles',
  options: { orientation: 'vertical', handle: true, keyboard: true, threshold: 5 },
  columns: [{
    id: 'handles', mountEl: $('handlelist'), handle: true,
    items: [
      { key: 'h0', label: 'Pinned header', disabled: true, locked: true },
      { key: 'h1', label: 'Drag me by the grip', sub: 'the body text stays selectable' },
      { key: 'h2', label: 'Second row' },
      { key: 'h3', label: 'Third row' },
      { key: 'h4', label: 'Fourth row' },
    ],
  }],
});

// ============================================================================
// Section D — AUTO-SCROLL: a tall list in a short scroll viewport. Drag a row to
// the top/bottom edge and the engine scrolls the container so off-screen targets
// become reachable, recomputing the drop index against the new scroll offset.
// ============================================================================

const tall = [];
for (let i = 1; i <= 20; i++) tall.push({ key: `s${i}`, label: `Row ${i}`, sub: i % 5 === 0 ? 'milestone' : '' });
mount({
  label: 'Auto-scroll',
  options: { orientation: 'vertical', keyboard: true, threshold: 5, autoScroll: { speed: 14, edge: 48 } },
  columns: [{
    id: 'scroll', mountEl: $('scrolllist'), listEl: $('scrolllist'), scrollEl: $('scrolllist'),
    items: tall,
  }],
});

// ---- a couple of console pokes for manual verification ---------------------
console.log('[sortable demo] four mounts ready. Engine renders nothing — this page paints from the emitted order + drag-state.');
