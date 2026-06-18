// selection-engine/selection-engine.demo.js
// Reference CONSUMER for the headless selection engine (../selection-engine.js).
// The engine ships no item DOM and no CSS — EVERYTHING visible here is the consumer's: the
// tiles, the selected highlight, the marquee box, the count, the live-state log. The engine
// is handed KEYED GEOMETRY (setItems) and pointer-driven marquee/click calls; it emits the
// selected key set + per-change deltas + the marquee rect, and we paint.
//
// The proof points (Gate 3): we render selected state purely from the emitted Set + delta —
// toggling only the few changed tiles, never re-rendering all N. We never ask the engine to
// touch a tile; it hit-tests the rects we supply, NOT the live DOM (there is no
// getBoundingClientRect per move anywhere). Swap this renderer for React/Vue and the engine
// is unchanged.
//
// Two sections, two engine instances:
//   1) a static photo grid (every tile in the DOM) — the interactions up close;
//   2) a 10,000-item VIRTUALIZED grid composing virtualization-engine — the performance
//      story: positions for ALL items fed as data, smooth marquee, auto-scroll across
//      off-screen items.
//
// Loaded as a native ES module (no build step); the dev server serves the repo root so the
// bare relative imports resolve.

import { createSelection } from './selection-engine.js';
import { VirtualizationEngine, gridLayout } from '../virtualization-engine/virtualization-engine.js';

const $ = (id) => document.getElementById(id);
const mods = (e) => ({ shift: e.shiftKey, ctrl: e.ctrlKey, meta: e.metaKey, alt: e.altKey });
const log = $('log');
function logState(label, st) {
  const sample = st.selectedKeys.slice(0, 8).join(', ');
  const more = st.count > 8 ? ` …+${st.count - 8}` : '';
  const d = (st.delta.entered.length || st.delta.left.length)
    ? `  Δ +${st.delta.entered.length}/-${st.delta.left.length}` : '';
  log.textContent = `[${label}] ${st.count} selected${d}\n  { ${sample}${more} }`
    + (st.marquee.active ? `\n  marquee ${Math.round(st.marquee.rect.width)}×${Math.round(st.marquee.rect.height)} @ ${Math.round(st.marquee.rect.x)},${Math.round(st.marquee.rect.y)}` : '');
}

// ============================================================================
// Shared pointer wiring: distinguish an empty-space DRAG (marquee) from a press on a
// TILE (click-select), and convert the pointer to the engine's content space. The engine
// is framework-agnostic — it just receives selectAt() / startMarquee() / updateMarquee().
// ============================================================================

/**
 * @param {Object} engine          a createSelection() instance
 * @param {HTMLElement} surface     the element pointer events bind to (its rect = content origin)
 * @param {Object} hooks
 * @param {(e:PointerEvent)=>?HTMLElement} hooks.tileFromEvent  the tile under the press, or null (empty space)
 * @param {()=>{x:number,y:number}} hooks.scrollOf             live scroll offset of the content (0,0 if none)
 */
function wire(engine, surface, { tileFromEvent, scrollOf }) {
  let mode = null;            // 'click' | 'marquee'
  let downKey = null, downMods = null, downX = 0, downY = 0;
  let originLeft = 0, originTop = 0; // surface's on-screen origin, cached at gesture start

  // Pointer (viewport) → content space: subtract the surface's screen origin, add scroll.
  // The surface origin is read ONCE per gesture (the surface doesn't move during a drag);
  // scroll is read live (it changes under auto-scroll). This is a per-gesture container read,
  // never a per-item read — the items' geometry came in via setItems().
  const toContent = (e) => {
    const s = scrollOf();
    return { x: e.clientX - originLeft + s.x, y: e.clientY - originTop + s.y };
  };

  surface.addEventListener('pointerdown', (e) => {
    if (e.button != null && e.button !== 0) return;
    downX = e.clientX; downY = e.clientY; downMods = mods(e);
    const r = surface.getBoundingClientRect();   // once, at gesture start (a container read)
    originLeft = r.left; originTop = r.top;
    const tile = tileFromEvent(e);
    if (tile && !tile.classList.contains('disabled')) {
      mode = 'click'; downKey = tile.dataset.key;
    } else if (tile && tile.classList.contains('disabled')) {
      mode = null; // press on a disabled tile: ignore
    } else {
      mode = 'marquee';
      const p = toContent(e);
      engine.startMarquee(p.x, p.y, { modifiers: downMods });
      try { surface.setPointerCapture?.(e.pointerId); } catch { /* capture is best-effort */ }
      e.preventDefault();
    }
  });

  surface.addEventListener('pointermove', (e) => {
    if (mode === 'marquee') {
      const p = toContent(e);
      engine.updateMarquee(p.x, p.y);
      e.preventDefault();
    } else if (mode === 'click') {
      // Pressing a tile then dragging is not a marquee (that starts on empty space) — once the
      // pointer leaves the tile meaningfully, just drop the pending click.
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 6) mode = null;
    }
  });

  const finish = (e) => {
    if (mode === 'marquee') { engine.endMarquee(); try { surface.releasePointerCapture?.(e.pointerId); } catch { /* */ } }
    else if (mode === 'click') { engine.selectAt(downKey, downMods); }
    mode = null; downKey = null;
  };
  surface.addEventListener('pointerup', finish);
  surface.addEventListener('pointercancel', () => { if (mode === 'marquee') engine.cancelMarquee(); mode = null; });
}

/** Position (or hide) a marquee-box element from the emitted state. */
function renderBox(boxEl, st) {
  const r = st.marquee.rect;
  if (st.marquee.active && r) {
    boxEl.style.display = 'block';
    boxEl.style.transform = `translate(${r.x}px, ${r.y}px)`;
    boxEl.style.width = r.width + 'px';
    boxEl.style.height = r.height + 'px';
  } else {
    boxEl.style.display = 'none';
  }
}

// ============================================================================
// Section 1 — static photo gallery (every tile in the DOM).
// ============================================================================

(function gallery() {
  const surface = $('gallery');
  const boxEl = $('g-box');
  const countEl = $('g-count');
  const IMAGES = ['assets/image-1.1.jpg', 'assets/image-2.3.jpg', 'assets/image-16.9.jpg', 'assets/image-9.16.jpg'];
  const N = 72;
  const TILE = 116, GAP = 10;
  const DISABLED = new Set(['g7']); // one non-selectable tile to prove the skip

  const engine = createSelection({ intersect: 'intersect', multiple: true, additiveModifier: 'shift' });

  // Build the tiles once; their geometry is pure layout arithmetic (the consumer's known
  // layout), so the rects we feed the engine are EXACTLY where we render — no DOM measuring.
  const tiles = new Map();
  for (let i = 0; i < N; i++) {
    const key = 'g' + i;
    const el = document.createElement('div');
    el.className = 'tile' + (DISABLED.has(key) ? ' disabled' : '');
    el.dataset.key = key;
    const img = document.createElement('img');
    img.src = IMAGES[i % IMAGES.length];
    img.alt = '';
    el.appendChild(img);
    const idx = document.createElement('span');
    idx.className = 'idx';
    idx.textContent = key;
    el.appendChild(idx);
    surface.appendChild(el);
    tiles.set(key, el);
  }

  function layout() {
    const W = surface.clientWidth || 800;
    const cols = Math.max(1, Math.floor((W + GAP) / (TILE + GAP)));
    const rects = [];
    let i = 0;
    for (const [key, el] of tiles) {
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * (TILE + GAP), y = row * (TILE + GAP);
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.width = TILE + 'px';
      el.style.height = TILE + 'px';
      rects.push({ key, x, y, w: TILE, h: TILE, disabled: DISABLED.has(key) });
      i++;
    }
    const rows = Math.ceil(N / cols);
    surface.style.height = (rows * (TILE + GAP) - GAP) + 'px';
    engine.setItems(rects); // re-supply geometry on (re)layout — survivors stay selected
  }

  // Selected state from the emitted Set + delta: on a delta, toggle ONLY the changed tiles.
  engine.subscribe((st) => {
    countEl.textContent = st.count;
    if (st.delta.entered.length || st.delta.left.length) {
      for (const k of st.delta.entered) { const t = tiles.get(k); if (t) t.classList.add('sel'); }
      for (const k of st.delta.left) { const t = tiles.get(k); if (t) t.classList.remove('sel'); }
    } else {
      // No delta (e.g. a relayout/config change): reconcile every tile from the set.
      for (const [k, t] of tiles) t.classList.toggle('sel', st.selected.has(k));
    }
    renderBox(boxEl, st);
    logState('gallery', st);
  });

  wire(engine, surface, {
    tileFromEvent: (e) => e.target.closest && e.target.closest('.tile'),
    scrollOf: () => ({ x: 0, y: 0 }), // the gallery does not scroll
  });

  // Toolbar.
  $('g-all').addEventListener('click', () => engine.selectAll());
  $('g-clear').addEventListener('click', () => engine.clear());
  $('g-invert').addEventListener('click', () => {
    const cur = new Set(engine.getState().selected);
    const next = engine.getItemKeys().filter((k) => !cur.has(k) && engine.isSelectable(k));
    engine.setSelection(next);
  });
  for (const b of $('g-rule').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      for (const x of $('g-rule').querySelectorAll('button')) x.classList.toggle('on', x === b);
      engine.setIntersectMode(b.dataset.mode);
    });
  }
  for (const b of $('g-multi').querySelectorAll('button')) {
    b.addEventListener('click', () => {
      for (const x of $('g-multi').querySelectorAll('button')) x.classList.toggle('on', x === b);
      engine.setMultiple(b.dataset.multi === 'true');
    });
  }

  // Keyboard niceties (consumer-owned): Ctrl/⌘+A select-all, Esc clears / cancels a drag.
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); engine.selectAll(); }
    else if (e.key === 'Escape') { engine.cancelMarquee(); engine.clear(); }
  });

  layout();
  window.addEventListener('resize', layout);
})();

// ============================================================================
// Section 2 — 10,000-item VIRTUALIZED grid (compose virtualization-engine).
//   virtualization-engine computes positions for ALL items → fed to the selection engine as
//   data → marquee hit-tests cached geometry → consumer renders the visible window + selected
//   state. Off-screen items are selectable; auto-scroll reveals them.
// ============================================================================

(function bigGrid() {
  const scroller = $('scroller');
  const spacer = $('spacer');
  const boxEl = $('v-box');
  const countEl = $('v-count');
  const N = 10000;

  // index:'auto' switches on the spatial index past ~2000 items; autoScroll drives the
  // scroller when the marquee nears an edge.
  const engine = createSelection({ index: 'auto', multiple: true, autoScroll: { speed: 20, edge: 64 } });
  engine.setScrollContainer(scroller);

  const layout = gridLayout({ minItemWidth: 84, aspectRatio: 1, gap: 8 });
  let lastInfo = null;

  // Feed the FULL position list (all N) to the selection engine — once, and again only when
  // the layout geometry actually changes (a resize), never on scroll. getRect(i) is O(1)
  // arithmetic; positions are content-space and scroll-independent.
  function rebuildGeometry() {
    const rects = new Array(N);
    for (let i = 0; i < N; i++) {
      const r = layout.getRect(i);
      rects[i] = { key: 'n' + i, x: r.x, y: r.y, w: r.width, h: r.height };
    }
    engine.setItems(rects);
  }

  const vtiles = new Map(); // key -> element (only the visible window)
  const HUE = (i) => (i * 47) % 360;

  function makeTile(i) {
    const el = document.createElement('div');
    el.className = 'vtile';
    el.dataset.key = 'n' + i;
    el.style.background = `hsl(${HUE(i)} 42% 30%)`;
    el.textContent = i;
    return el;
  }

  function render({ virtualItems, totalSize, stats }) {
    if (!lastInfo || stats.columns !== lastInfo.columns || stats.itemWidth !== lastInfo.itemWidth || stats.itemHeight !== lastInfo.itemHeight) {
      rebuildGeometry();           // layout changed → re-supply all rects
      lastInfo = stats;
    }
    spacer.style.height = totalSize + 'px';

    const seen = new Set();
    for (const it of virtualItems) {
      const key = 'n' + it.index;
      seen.add(key);
      let tile = vtiles.get(key);
      if (!tile) { tile = makeTile(it.index); vtiles.set(key, tile); spacer.appendChild(tile); }
      tile.style.transform = `translate(${it.x}px, ${it.y}px)`;
      tile.style.width = it.width + 'px';
      tile.style.height = it.height + 'px';
      tile.classList.toggle('sel', engine.isSelected(key)); // newly-visible tiles get current state
    }
    for (const [key, tile] of vtiles) if (!seen.has(key)) { tile.remove(); vtiles.delete(key); }
    renderBox(boxEl, engine.getState());
  }

  new VirtualizationEngine({
    scrollElement: scroller, count: N, layout, overscan: 3, onChange: render,
  });

  // Selection changes: paint ONLY the changed tiles that are currently on screen (off-screen
  // ones are handled when they scroll into view, above). This is what keeps a marquee over
  // thousands of items smooth — the delta, not a full re-render.
  engine.subscribe((st) => {
    countEl.textContent = st.count;
    for (const k of st.delta.entered) { const t = vtiles.get(k); if (t) t.classList.add('sel'); }
    for (const k of st.delta.left) { const t = vtiles.get(k); if (t) t.classList.remove('sel'); }
    renderBox(boxEl, st);
    logState('virtualized', st);
  });

  wire(engine, scroller, {
    tileFromEvent: (e) => e.target.closest && e.target.closest('.vtile'),
    scrollOf: () => ({ x: scroller.scrollLeft, y: scroller.scrollTop }), // live scroll → content space
  });

  $('v-all').addEventListener('click', () => engine.selectAll());
  $('v-clear').addEventListener('click', () => engine.clear());
  $('v-top').addEventListener('click', () => { scroller.scrollTop = 0; });

})();

console.log('[selection demo] two mounts ready. The engine renders nothing — this page paints from the emitted selected set + deltas + marquee rect.');
