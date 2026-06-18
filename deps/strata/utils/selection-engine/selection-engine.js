// selection-engine.js
// A headless MULTI-SELECTION engine — the framework-agnostic core that lets a user select
// items in a list/grid by clicking, shift-clicking, ctrl/cmd-clicking, select-all, and by
// dragging a MARQUEE box around them (rubber-band selection). The engine owns all the
// selection logic and the drag-box hit-testing; it emits selection state. The CONSUMER
// renders the items, the selected state, and the marquee box. The engine ships no item DOM
// and no CSS.
//
// PERFORMANCE IS THE POINT (read first). The classic failure of marquee selection is lag on
// large lists, because naive implementations hit-test against the LIVE DOM
// (getBoundingClientRect on every item on every mousemove → thousands of synchronous
// reflows/sec) and/or re-render every item each frame. This engine avoids both, by design:
//   • It hit-tests against CACHED ITEM GEOMETRY (rects as plain data), never the live DOM
//     during a drag. Item rects are supplied by the consumer (from layout it already knows,
//     a virtualizer's computed positions, or captured once at marquee-start) via setItems().
//     The engine calls NO getBoundingClientRect at all — there is none in this file.
//   • Each frame it emits DELTAS (which keys just entered / just left the selection) in
//     addition to the full set, so the consumer toggles state on only the few changed items.
//   • Hit-testing is throttled to requestAnimationFrame, coalescing raw pointer moves.
//   • For very large N (tens of thousands) an OPTIONAL spatial index (grid buckets) tests
//     only items near the box. Plain O(N) cached-rect testing is fine up to a few thousand;
//     the index is the optimization for the extreme case — and it is verified to return the
//     exact same set as the brute-force test.
// This decoupling of the geometry math from DOM reads and rendering is what makes marquee
// selection over hundreds–thousands of items smooth, and the reason a headless engine beats
// an ad-hoc store.
//
// SCOPE LINE. This is SELECTION (which keys are picked), not reorder (sortable-engine) and
// not file intake (drag-n-drop-engine). The marquee drags on EMPTY SPACE (pressing on an
// item is a click-select); it is not the same as sortable's item-drag. The engine consumes
// keyed geometry as DATA and emits the selected key set (+ deltas + marquee rect + count);
// it does not window/virtualize the list itself (it COMPOSES with virtualization-engine,
// which owns that) and it owns no item data (it emits keys; the consumer owns the items).
//
// HEADLESS. No built-in selectable-list component, no default look. The engine manages the
// selection set + anchor + marquee state and emits them via getState() + subscribe()/onChange;
// the consumer renders the items, the selected state, and the box. The ONE place it touches
// a consumer element is driving auto-scroll on a scrollable container (behavior, not paint),
// and reading that container's scrollTop/clientHeight to keep the box correct as it scrolls.
//
// ITEMS BY STABLE KEY; GEOMETRY AS DATA. The engine works in terms of stable item keys and
// item rects supplied as data — NOT by reading the DOM during a drag. The consumer supplies
// geometry in a single consistent "content space" (the same space the rects live in); for a
// virtualized list that is the virtualizer's coordinate space, so the marquee can correctly
// select items that are not even rendered (off-screen). Order matters: shift-range walks the
// items' order.
//
// DEPENDENCY-FREE & DOM-OPTIONAL. Zero runtime dependencies beyond ../shared/. Every browser API
// it touches — requestAnimationFrame, and a scroll container's scrollTop/clientHeight for
// auto-scroll — is touched ONLY inside method bodies behind capability checks, never at module
// scope. So the pure selection + hit-test logic imports and runs clean in Node with no
// `document`/`window`, and is unit-testable with rects-as-data and no DOM.
//
// Exports: { createSelection, boxHitTest, normalizeBox, rangeBetween, createSpatialIndex, IntersectMode }

import { Emitter } from '../shared/emitter.js';
import { clamp } from '../shared/clamp.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/** How the marquee box decides an item is "in" it. */
export const IntersectMode = Object.freeze({
  INTERSECT: 'intersect', // the item's rect overlaps the box (touching counts) — desktop default
  CONTAIN: 'contain',     // the box fully contains the item's rect
});

// ============================================================================
// Pure geometry (no DOM — module scope is safe in Node). These take rects/boxes as
// plain data, so the hit-testing is provably correct headlessly. There is no
// getBoundingClientRect anywhere in this file: geometry comes in as data.
// ============================================================================

/**
 * @typedef {Object} Rect  a normalized axis-aligned box. We carry both the {x,y,width,height}
 *   form (what we emit / accept) and the edge form (left/top/right/bottom) so hit-tests
 *   are branch-free.
 * @property {number} x      left
 * @property {number} y      top
 * @property {number} width      width  (>= 0)
 * @property {number} height      height (>= 0)
 * @property {number} left
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 */

/**
 * Normalize a press→pointer drag (in ANY direction) into a positive-size box. Dragging
 * up-left and down-right both yield a box with non-negative width/height and correct edges.
 * @param {number} x0 @param {number} y0  the press (anchor) point
 * @param {number} x1 @param {number} y1  the current pointer point
 * @returns {Rect}
 */
export function normalizeBox(x0, y0, x1, y1) {
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const right = Math.max(x0, x1);
  const bottom = Math.max(y0, y1);
  return { x: left, y: top, width: right - left, height: bottom - top, left, top, right, bottom };
}

/** True if box and rect OVERLAP — touching edges count (the desktop default). */
function intersects(box, rect) {
  return box.left <= rect.right && box.right >= rect.left && box.top <= rect.bottom && box.bottom >= rect.top;
}
/** True if box FULLY CONTAINS rect. */
function contains(box, rect) {
  return box.left <= rect.left && box.right >= rect.right && box.top <= rect.top && box.bottom >= rect.bottom;
}
/** The predicate for a mode. */
function hitTestFor(mode) {
  return mode === IntersectMode.CONTAIN ? contains : intersects;
}

/**
 * THE CORE GEOMETRY. Brute-force O(N): given item rects (as plain data) and a box, return
 * the Set of keys the box selects under `mode`. Each item is `{ key, left, top, right, bottom }`
 * (an engine-normalized item) or anything exposing those edges. Used directly when there is
 * no spatial index, and as the correctness oracle the index is verified against.
 *
 * @param {Array<{key:string,left:number,top:number,right:number,bottom:number}>} items
 * @param {Rect} box
 * @param {string} [mode=IntersectMode.INTERSECT]
 * @returns {Set<string>}
 */
export function boxHitTest(items, box, mode = IntersectMode.INTERSECT) {
  const hit = hitTestFor(mode);
  const out = new Set();
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (hit(box, item)) out.add(item.key);
  }
  return out;
}

/**
 * A uniform-grid spatial index over item rects (plain data) for very large N. Each item is
 * bucketed into every grid cell its rect overlaps; a box query gathers candidate keys from
 * the cells the box overlaps, then the caller exact-tests them. Because an item that truly
 * intersects the box shares a point — hence a cell — with the box, the candidate set is a
 * superset of the real hits, so exact-testing the candidates yields EXACTLY the brute-force
 * result. This is the property the test pins.
 *
 * @param {Array<{key:string,left:number,top:number,right:number,bottom:number}>} items
 * @param {number} [cellSize]  grid cell size; derived from average item size when omitted
 * @returns {{ cellSize:number, query:(box:Rect)=>Array<object> }}
 */
export function createSpatialIndex(items, cellSize) {
  // Derive a reasonable cell from the average item size: roughly one item per cell keeps
  // both the per-item insert count and the per-query candidate count small.
  if (!(cellSize > 0)) {
    let widthSum = 0;
    let heightSum = 0;
    for (const item of items) {
      widthSum += item.right - item.left;
      heightSum += item.bottom - item.top;
    }
    const averageSide = items.length ? (widthSum + heightSum) / (2 * items.length) : 64;
    cellSize = Math.max(1, Math.round(averageSide) || 64);
  }
  const inverseCellSize = 1 / cellSize;
  /** @type {Map<string, {cellX:number, cellY:number, items:object[]}>} A bucket carries its own
   * grid coords so a query can iterate the POPULATED cells directly (no id decode) when that is
   * cheaper than walking the envelope rectangle — see query(). */
  const cells = new Map();
  // A composite key for (cellX, cellY). Coordinates can be negative and reach the tens-of-thousands
  // over a large scrollable content space; a "x,y" string is collision-free across that whole range,
  // whereas an integer pack `(cellX+BIAS)*K + (cellY+BIAS)` carries into the cellX band once a
  // coordinate exceeds the K/2 bound (e.g. cells (0,40000) and (1,-25536) both packed to one id),
  // mis-filing the second item into the first cell's bucket so a query silently dropped it.
  const cellId = (cellX, cellY) => `${cellX},${cellY}`;

  // An item spanning more cells than this per axis would explode the bucket count
  // (a degenerate "covers everything" rect would otherwise loop millions of times),
  // so such items skip the grid and are exact-tested on EVERY query instead. This
  // keeps build time bounded for any input while preserving exact results.
  const MAX_CELLS_PER_AXIS = 256;
  const oversizedItems = [];

  // The populated cell envelope. Queries clamp into it: cells outside hold nothing. But the
  // envelope is a BOUNDING RECTANGLE, not the populated-cell COUNT — sparse-but-wide layouts
  // (clusters far apart) make it span a huge mostly-empty area. So query() walks the envelope
  // only when that is cheaper than the populated cells, else it iterates the cells directly
  // (cost is O(min(envelopeArea, populatedCells)), never the empty-cell walk → never a hang).
  let minCellX = Infinity;
  let maxCellX = -Infinity;
  let minCellY = Infinity;
  let maxCellY = -Infinity;

  for (const item of items) {
    const firstCellX = Math.floor(item.left * inverseCellSize);
    const lastCellX = Math.floor(item.right * inverseCellSize);
    const firstCellY = Math.floor(item.top * inverseCellSize);
    const lastCellY = Math.floor(item.bottom * inverseCellSize);
    if (
      !Number.isFinite(firstCellX) || !Number.isFinite(lastCellX) ||
      !Number.isFinite(firstCellY) || !Number.isFinite(lastCellY) ||
      lastCellX - firstCellX > MAX_CELLS_PER_AXIS ||
      lastCellY - firstCellY > MAX_CELLS_PER_AXIS
    ) {
      oversizedItems.push(item);
      continue;
    }
    if (firstCellX < minCellX) minCellX = firstCellX;
    if (lastCellX > maxCellX) maxCellX = lastCellX;
    if (firstCellY < minCellY) minCellY = firstCellY;
    if (lastCellY > maxCellY) maxCellY = lastCellY;
    for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
      for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
        const id = cellId(cellX, cellY);
        let bucket = cells.get(id);
        if (!bucket) {
          bucket = { cellX, cellY, items: [] };
          cells.set(id, bucket);
        }
        bucket.items.push(item);
      }
    }
  }

  function collect(bucket, seen, candidates) {
    for (const item of bucket.items) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        candidates.push(item);
      }
    }
  }

  function query(box) {
    const seen = new Set();
    const candidates = [];
    // Clamp the query range into the populated envelope — cells outside are empty.
    const firstCellX = Math.max(Math.floor(box.left * inverseCellSize), minCellX);
    const lastCellX = Math.min(Math.floor(box.right * inverseCellSize), maxCellX);
    const firstCellY = Math.max(Math.floor(box.top * inverseCellSize), minCellY);
    const lastCellY = Math.min(Math.floor(box.bottom * inverseCellSize), maxCellY);
    // The clamped envelope rectangle can still be enormous when items are sparse over a wide
    // extent (its AREA, not its populated-cell count, bounds the nested walk). If that area
    // exceeds the number of populated cells, iterate the cells instead and test each against the
    // query rect — so query cost is O(min(envelopeArea, populatedCells)), never the empty walk.
    const envelopeArea = (lastCellX - firstCellX + 1) * (lastCellY - firstCellY + 1);
    if (!(envelopeArea > 0) || envelopeArea > cells.size) {
      for (const bucket of cells.values()) {
        if (bucket.cellX >= firstCellX && bucket.cellX <= lastCellX &&
            bucket.cellY >= firstCellY && bucket.cellY <= lastCellY) {
          collect(bucket, seen, candidates);
        }
      }
    } else {
      for (let cellX = firstCellX; cellX <= lastCellX; cellX++) {
        for (let cellY = firstCellY; cellY <= lastCellY; cellY++) {
          const bucket = cells.get(cellId(cellX, cellY));
          if (bucket) collect(bucket, seen, candidates);
        }
      }
    }
    // Oversized items skipped the grid; they are candidates on every query.
    for (const item of oversizedItems) {
      if (!seen.has(item.key)) {
        seen.add(item.key);
        candidates.push(item);
      }
    }
    return candidates;
  }

  return { cellSize, query };
}

// ============================================================================
// Pure selection helpers (no DOM).
// ============================================================================

/**
 * The contiguous range of keys from `anchor` to `target` (inclusive) over `orderedKeys`,
 * in whichever direction — forward or backward. This is the shift-range slice. `orderedKeys`
 * should already exclude non-selectable items (disabled items are simply not in it, so a
 * range over them skips them automatically).
 *
 * Re-extension correctness lives in the CALLER, not here: because the anchor is held fixed
 * across consecutive shift-clicks, calling rangeBetween(keys, anchor, t1) then
 * rangeBetween(keys, anchor, t2) always re-extends from the SAME anchor — never from the
 * last shift-clicked item.
 *
 * @param {string[]} orderedKeys  selectable keys in item order
 * @param {?string} anchor
 * @param {string} target
 * @returns {string[]}  the slice (possibly just [target] when there is no usable anchor)
 */
export function rangeBetween(orderedKeys, anchor, target) {
  const targetIndex = orderedKeys.indexOf(target);
  if (targetIndex < 0) return [];
  const anchorIndex = anchor == null ? -1 : orderedKeys.indexOf(anchor);
  if (anchorIndex < 0) return [target];
  const firstIndex = Math.min(anchorIndex, targetIndex);
  const lastIndex = Math.max(anchorIndex, targetIndex);
  return orderedKeys.slice(firstIndex, lastIndex + 1);
}

/**
 * Normalize a consumer item into the engine's internal item: a key + edges + the {x,y,width,height}
 * the box-rect emits, plus the selectable flag. Accepts several geometry shapes:
 *   { key, rect:{x,y,width,height} } | { key, rect:{left,top,right,bottom} (DOMRect) }
 *   { key, x, y, width, height } | { key, x, y, w, h }
 * plus optional `selectable` (default true) and `disabled` (default false).
 * @param {Object} raw
 * @returns {?{key:string,x:number,y:number,width:number,height:number,left:number,top:number,right:number,bottom:number,selectable:boolean}}
 */
function normalizeItem(raw) {
  if (!raw || raw.key == null) return null;
  const key = String(raw.key);
  const rect = raw.rect || raw;
  let x, y, width, height;
  if (rect.width != null && rect.left != null && rect.right != null && rect.x == null) {
    // DOMRect-ish: prefer left/top + width/height.
    x = rect.left; y = rect.top; width = rect.width; height = rect.height;
  } else if (rect.x != null) {
    x = rect.x; y = rect.y;
    width = rect.w != null ? rect.w : (rect.width != null ? rect.width : (rect.right != null ? rect.right - rect.x : 0));
    height = rect.h != null ? rect.h : (rect.height != null ? rect.height : (rect.bottom != null ? rect.bottom - rect.y : 0));
  } else if (rect.left != null) {
    x = rect.left; y = rect.top;
    width = rect.width != null ? rect.width : (rect.right != null ? rect.right - rect.left : 0);
    height = rect.height != null ? rect.height : (rect.bottom != null ? rect.bottom - rect.top : 0);
  } else {
    x = 0; y = 0; width = 0; height = 0;
  }
  // Coerce to finite numbers: NaN AND Infinity become 0 (an Infinity-sized rect
  // used to slip through `|| 0` and hang the spatial index's bucketing loop).
  x = Number.isFinite(+x) ? +x : 0;
  y = Number.isFinite(+y) ? +y : 0;
  width = Number.isFinite(+width) ? Math.max(0, +width) : 0;
  height = Number.isFinite(+height) ? Math.max(0, +height) : 0;
  // selfSelectable is the item's OWN selectability (its flags); the engine folds in the
  // config-level disabled predicate to produce the effective `selectable`. Keeping them
  // separate lets setDisabled()/setOptions() recompute the effect without losing the baseline.
  const selfSelectable = raw.selectable !== false && raw.disabled !== true;
  return { key, x, y, width, height, left: x, top: y, right: x + width, bottom: y + height, selfSelectable, selectable: selfSelectable };
}

// ============================================================================
// Small environment guards (named DOM globals only behind typeof — never a bare
// access that would throw at load in Node).
// ============================================================================

const canUseAnimationFrame = () => typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
/** A scroll container we can read/drive for auto-scroll (real element or test stub). */
const isScrollContainerLike = (el) => !!el && typeof el.scrollTop === 'number' && typeof el.clientHeight === 'number';

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} SelectionState
 * @property {Set<string>} selected   the engine's LIVE selected set — cheap O(1) membership;
 *           treat as READ-ONLY (it mutates in place next change). Use `delta` to diff.
 * @property {number} count           selected.size
 * @property {?string} anchor         the item a shift-range extends from
 * @property {{entered:string[], left:string[]}} delta  keys that just entered / left the
 *           selection for THIS change (empty arrays on a pull via getState()). This is the
 *           efficient render path: the consumer toggles only these, never all N.
 * @property {{active:boolean, additive:boolean, rect:?Rect}} marquee  the live marquee box
 *           (rect in content space) while a box-drag is active.
 * @property {string[]} selectedKeys  selected keys in item order — a LAZY getter (built only
 *           if you read it), so the hot marquee path pays nothing for it.
 * @property {Object} config          a readable snapshot of the resolved options
 */

// ============================================================================
// createSelection
// ============================================================================

/**
 * Create a headless multi-selection instance.
 *
 * @param {Object} [options]
 * @param {boolean} [options.multiple=true]        allow multi-select; false = single-select (interactions degrade sensibly)
 * @param {string} [options.intersect='intersect'] marquee rule: 'intersect' (touching selects) | 'contain'
 * @param {string} [options.additiveModifier='shift'] which modifier, held at marquee-start, makes the marquee ADD to the
 *           selection instead of replacing it: 'shift' | 'ctrl' | 'meta' | 'alt' | 'ctrlOrMeta' | null
 * @param {boolean|Object} [options.index=false]   spatial index for huge N: true | 'auto' (enable past ~2000 items) |
 *           { cellSize } | false. 'auto' is a good default for unknown sizes.
 * @param {boolean|Object} [options.autoScroll=false] drive auto-scroll while marqueeing near a scroll container's edge;
 *           object tunes { speed, edge }. Needs a container via setScrollContainer() (or options.autoScroll.scrollElement).
 * @param {boolean|((key:string)=>boolean)} [options.disabled]  items that cannot be selected (predicate or true)
 * @param {(state: SelectionState) => void} [options.onChange]  called with state on every change
 * @returns {Object} the selection instance
 */
export function createSelection(options = {}) {
  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;

  let destroyed = false;
  let config = buildConfig(options);

  // ---- the model ----------------------------------------------------------

  /** Ordered, normalized items (geometry as data). Order matters for ranges. */
  let items = [];
  /** Selectable items only, in order — the index/brute hit-test and ranges run over these. */
  let selectableItems = [];
  /** Selectable keys in order (for ranges / select-all). */
  let selectableKeys = [];
  /** key -> normalized item (all items). */
  const itemsByKey = new Map();
  /** Optional spatial index over selectableItems (when enabled). */
  let index = null;

  /** The selected set (live). */
  const selected = new Set();
  /** The shift-range anchor. */
  let anchor = null;
  /** Selection snapshot at the last anchor-setting click — the base an additive (shift+ctrl) range unions onto. */
  let rangeBase = new Set();

  // Delta accounting: low-level add/remove maintain these; notify() drains them. This makes
  // the emitted delta O(changed), never O(N) — the whole point on the marquee hot path.
  const pendingEntered = new Set();
  const pendingLeft = new Set();

  /** Marquee gesture state. */
  let marquee = idleMarquee();
  let marqueeFrameId = 0;

  // Auto-scroll.
  let scrollElement = config.autoScroll && config.autoScroll.scrollElement ? config.autoScroll.scrollElement : null;
  let autoScrollFrameId = 0;

  function idleMarquee() {
    return {
      active: false, additive: false,
      startPoint: { x: 0, y: 0 }, currentPoint: { x: 0, y: 0 }, box: null,
      additiveBase: new Set(),  // keys kept regardless of the box (additive: the full prior selection; replace: empty)
      selectionBefore: new Set(),   // selection before the marquee (for cancel/revert)
      keysInBox: new Set(),  // keys currently in the box (marquee-owned), to diff frame-to-frame
    };
  }

  // ---- configuration ------------------------------------------------------

  function buildConfig(o) {
    const auto = o.autoScroll;
    return {
      multiple: o.multiple !== false, // default true
      intersect: normalizeIntersect(o.intersect),
      additiveModifier: normalizeModifier(o.additiveModifier),
      // Accept 'on' as well as true: optionsView() round-trips the resolved value
      // back through here on setOptions(), and 'on' used to fall through to false
      // (silently disabling a previously-enabled index on any unrelated setOptions).
      index: o.index === true || o.index === 'on' ? 'on'
        : (o.index === 'auto' ? 'auto' : (o.index && typeof o.index === 'object' ? o.index : false)),
      autoScroll: auto ? {
        // Finite-guard: a NaN speed would survive clamp() (NaN<min and NaN>max are both false)
        // and poison the consumer's scrollTop to NaN, permanently breaking that container.
        speed: (auto && Number.isFinite(auto.speed) && auto.speed >= 0) ? auto.speed : 14, // px/frame at the edge
        edge: (auto && Number.isFinite(auto.edge) && auto.edge >= 0) ? auto.edge : 56,    // px-deep activation band
        scrollElement: (auto && auto.scrollElement) || null,
      } : null,
      disabled: typeof o.disabled === 'function' ? o.disabled : (o.disabled === true ? () => true : null),
    };
  }
  function normalizeModifier(m) {
    if (m === null) return null;      // explicit null disables the additive modifier
    if (m === undefined) return 'shift'; // not supplied → default
    const v = String(m);
    if (!['shift', 'ctrl', 'meta', 'alt', 'ctrlOrMeta'].includes(v)) {
      throw new TypeError(`Unknown additiveModifier: ${v}`);
    }
    return v;
  }
  function normalizeIntersect(m) {
    if (m === undefined) return IntersectMode.INTERSECT; // not supplied → default
    if (m !== IntersectMode.INTERSECT && m !== IntersectMode.CONTAIN) {
      throw new TypeError(`Unknown intersect mode: ${m}`); // mirror setIntersectMode — all paths agree
    }
    return m;
  }
  const AUTO_INDEX_THRESHOLD = 2000;
  function shouldUseIndex() {
    if (config.index === 'on' || (config.index && typeof config.index === 'object')) return true;
    if (config.index === 'auto') return selectableItems.length >= AUTO_INDEX_THRESHOLD;
    return false;
  }
  function configSnapshot() {
    return {
      multiple: config.multiple,
      intersect: config.intersect,
      additiveModifier: config.additiveModifier,
      index: index ? { on: true, cellSize: index.cellSize } : { on: false },
      autoScroll: config.autoScroll ? { speed: config.autoScroll.speed, edge: config.autoScroll.edge } : false,
      hasDisabled: !!config.disabled,
    };
  }

  // ---- item registration / geometry ---------------------------------------

  /**
   * Set (replace) the ordered, keyed item geometry the engine hit-tests and ranges against.
   * Re-callable whenever the list/layout changes — a list add/remove, a relayout, or a
   * virtualizer recomputing positions. The selection stays consistent: keys still present
   * stay selected; keys that vanished drop out (and the delta reports them as `left`). The
   * anchor is cleared if its key vanished. Order is the shift-range order.
   *
   * @param {Array<{key:string|number, rect?:Object, x?:number, y?:number, width?:number, height?:number, w?:number, h?:number, selectable?:boolean, disabled?:boolean}>} list
   */
  function setItems(list) {
    if (destroyed) return instance;
    const next = [];
    const nextByKey = new Map();
    for (const raw of list || []) {
      const item = normalizeItem(raw);
      if (!item) continue;
      if (nextByKey.has(item.key)) continue; // first wins; keys are unique
      next.push(item);
      nextByKey.set(item.key, item);
    }
    items = next;
    itemsByKey.clear();
    for (const item of next) itemsByKey.set(item.key, item);
    applyDisabledPredicate(); // fold the config-level disabled predicate into each effective `selectable`
    rebuildSelectable();

    // Drop selected keys that vanished or became non-selectable; keep the rest.
    for (const k of [...selected]) {
      const item = itemsByKey.get(k);
      if (!item || !item.selectable) removeKey(k);
    }
    if (anchor != null && (!itemsByKey.get(anchor) || !itemsByKey.get(anchor).selectable)) anchor = null;

    if (marquee.active) { recomputeMarquee(); }   // geometry changed mid-drag → re-test now
    else queueNotify();
    return instance;
  }

  function rebuildSelectable() {
    selectableItems = items.filter((item) => item.selectable);
    selectableKeys = selectableItems.map((item) => item.key);
    index = shouldUseIndex()
      ? createSpatialIndex(selectableItems, config.index && config.index.cellSize)
      : null;
  }
  /** Recompute each item's effective `selectable` = its own flag AND not config-disabled. */
  function applyDisabledPredicate() {
    for (const item of items) item.selectable = item.selfSelectable && !(config.disabled && config.disabled(item.key));
  }

  /** Ordered keys of all registered items. */
  function getItemKeys() { return items.map((item) => item.key); }
  /** Number of registered items. */
  function getItemCount() { return items.length; }
  /** Is `key` a registered, selectable item? */
  function isSelectable(key) { const item = itemsByKey.get(String(key)); return !!(item && item.selectable); }

  // ---- low-level selection mutation (delta-tracked) -----------------------

  function addKey(key) {
    if (selected.has(key)) return;
    selected.add(key);
    if (pendingLeft.has(key)) pendingLeft.delete(key); else pendingEntered.add(key);
  }
  function removeKey(key) {
    if (!selected.has(key)) return;
    selected.delete(key);
    if (pendingEntered.has(key)) pendingEntered.delete(key); else pendingLeft.add(key);
  }
  /**
   * Reconcile the selection to exactly `next` (a Set of keys) via add/remove.
   * Single-mode safe. Keys that are no longer registered/selectable are skipped:
   * snapshots taken earlier (rangeBase, a marquee's selectionBefore-selection) can contain
   * keys that vanished from setItems() since — re-adding those would emit ghost
   * keys the consumer cannot render.
   */
  function applySelection(next) {
    if (!config.multiple && next.size > 1) next = reduceToFirst(next);
    for (const k of [...selected]) if (!next.has(k)) removeKey(k);
    for (const k of next) if (!selected.has(k) && isSelectable(k)) addKey(k);
  }
  /** The first key of `set` in item order (single-select collapse). */
  function reduceToFirst(set) {
    for (const k of selectableKeys) if (set.has(k)) return new Set([k]);
    return new Set();
  }
  /**
   * Set the anchor and snapshot the selection as the base for an additive (shift+ctrl) range.
   * Internal click-path helper: `key` is already String()-coerced and selectable here, so no
   * re-validation, and the caller emits its own notify() afterward (this stays silent).
   */
  function anchorAt(key) { anchor = key; rangeBase = new Set(selected); }

  /**
   * Public anchor setter. Item keys are always normalized to strings (normalizeItem), so coerce
   * the argument to match — otherwise a numeric key would never index selectableKeys and the next
   * shift-range would degrade to just the target. Mirrors the other public mutators: destroyed-guard,
   * coerce, validate, and notify.
   */
  function setAnchor(key) {
    if (destroyed) return instance;
    key = key == null ? null : String(key);
    anchor = (key != null && isSelectable(key)) ? key : null;
    rangeBase = new Set(selected);
    notify();
    return instance;
  }

  // ---- click selection ----------------------------------------------------

  /**
   * Apply a click on item `key` with the consumer-reported modifier state. The consumer
   * captures the click and passes the key + modifiers — keeping the engine framework-agnostic.
   *   • plain        → select just `key`, clear the rest, set the anchor.
   *   • shift        → select the contiguous range from the (held) anchor to `key` (replace).
   *                    Repeated shift-clicks re-extend from the SAME anchor.
   *   • ctrl / meta  → toggle `key` in/out without clearing the rest; the anchor becomes `key`.
   *   • shift+ctrl   → additive range: add the anchor→`key` range to the selection-as-it-was
   *                    before this range sequence (so re-extending replaces the range, not trails).
   * Disabled/unknown keys are ignored. In single-select mode every path collapses to one item.
   *
   * @param {string|number} key
   * @param {{shift?:boolean, ctrl?:boolean, meta?:boolean, alt?:boolean}} [modifiers]
   */
  function selectAt(key, modifiers = {}) {
    if (destroyed) return instance;
    key = String(key);
    if (!isSelectable(key)) return instance;
    const shift = !!modifiers.shift;
    const toggle = !!(modifiers.ctrl || modifiers.meta);

    if (!config.multiple) {
      // Single-select: ctrl toggles the one item; everything else selects just `key`.
      if (toggle && selected.has(key)) applySelection(new Set());
      else applySelection(new Set([key]));
      anchorAt(key);
      notify();
      return instance;
    }

    if (shift && anchor != null && isSelectable(anchor)) {
      const range = rangeBetween(selectableKeys, anchor, key);
      if (toggle) {
        const union = new Set(rangeBase);
        for (const k of range) union.add(k);
        applySelection(union);          // additive range from the selectionBefore-range base
      } else {
        applySelection(new Set(range)); // plain range: replace
      }
      // anchor + rangeBase stay → re-extension extends from the same anchor.
    } else if (toggle) {
      if (selected.has(key)) removeKey(key); else addKey(key);
      anchorAt(key);                    // a later shift-click ranges from the toggled item
    } else {
      applySelection(new Set([key]));
      anchorAt(key);
    }
    notify();
    return instance;
  }

  // ---- bulk / programmatic ------------------------------------------------

  /** Select every selectable item (no-op in single-select mode). */
  function selectAll() {
    if (destroyed) return instance;
    if (config.multiple) applySelection(new Set(selectableKeys));
    notify();
    return instance;
  }
  /** Clear the selection and the anchor. */
  function clear() {
    if (destroyed) return instance;
    applySelection(new Set());
    anchor = null; rangeBase = new Set();
    notify();
    return instance;
  }
  /** Toggle one key in/out of the selection. Single-mode: turning a key on clears the others. */
  function toggle(key) {
    if (destroyed) return instance;
    key = String(key);
    if (!isSelectable(key)) return instance;
    if (selected.has(key)) removeKey(key);
    else if (config.multiple) addKey(key);
    else applySelection(new Set([key]));
    anchorAt(key);
    notify();
    return instance;
  }
  /** ADD keys to the selection (union; selectable only). Pairs with deselect(). */
  function select(keys) {
    if (destroyed) return instance;
    const valid = (keys || []).map(String).filter(isSelectable);
    if (config.multiple) { const next = new Set(selected); for (const k of valid) next.add(k); applySelection(next); }
    // Single-select collapse uses item order, matching setSelection()/applySelection() — not arg order.
    else if (valid.length) applySelection(reduceToFirst(new Set(valid)));
    notify();
    return instance;
  }
  /** Remove keys from the selection. */
  function deselect(keys) {
    if (destroyed) return instance;
    for (const k of (keys || []).map(String)) removeKey(k);
    notify();
    return instance;
  }
  /** Replace the selection with exactly `keys` (selectable only). */
  function setSelection(keys) {
    if (destroyed) return instance;
    const valid = (keys || []).map(String).filter(isSelectable);
    applySelection(new Set(valid));
    // Key off SELECTABILITY (not membership), matching setItems/setAnchor/pruneUnselectable and
    // deselect(): a still-selectable anchor whose key left the selection stays valid so a later
    // shift-click still ranges from it.
    if (anchor != null && !isSelectable(anchor)) anchor = null;
    notify();
    return instance;
  }
  /** Is `key` selected? */
  function isSelected(key) { return selected.has(String(key)); }
  /** Selected keys in item order (a fresh array). */
  function getSelectedKeys() { const out = []; for (const item of items) if (selected.has(item.key)) out.push(item.key); return out; }
  /** The current anchor key (or null). */
  function getAnchor() { return anchor; }

  // ---- marquee (drag-box) selection — the headline feature ----------------
  //
  // Coordinates are CONTENT SPACE: the same space as the rects passed to setItems(). The
  // consumer maps its pointer into that space (for a non-scrolled container that is just
  // pointer-minus-container-origin; for a virtualized list it adds the scroll offset, exactly
  // as it computes the virtualizer's positions). The engine never reads the DOM here — it
  // intersects the box against the cached rects in pure JS.

  /**
   * Begin a marquee at content-space (x, y). Call this only when the press was on EMPTY SPACE
   * (the consumer knows its own DOM); pressing on an item is a click, not a marquee.
   *   • Replace (default): the existing selection is cleared and the box builds the selection
   *     from scratch as it grows. (Clicking empty space then releasing thus clears — standard.)
   *   • Additive: pass { additive:true } (or { modifiers } matching `additiveModifier`) to ADD
   *     the box's hits to the existing selection instead of replacing it.
   * @param {number} x @param {number} y
   * @param {{additive?:boolean, modifiers?:Object}} [marqueeOptions]
   */
  function startMarquee(x, y, marqueeOptions = {}) {
    if (destroyed) return instance;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return instance; // never seed a NaN box
    // cancelMarquee() notifies synchronously; an onChange handler may destroy() us mid-call
    // (re-entrant teardown). Re-check `destroyed` before rebuilding a LIVE marquee on a freed
    // instance — mirrors the autoScrollTick re-arm guard after its recomputeMarquee().
    if (marquee.active) cancelMarquee();
    if (destroyed) return instance;
    // Additive only makes sense for multi-select; single-select marquee always replaces.
    const additive = !config.multiple ? false
      : (marqueeOptions.additive != null ? !!marqueeOptions.additive
        : (marqueeOptions.modifiers && config.additiveModifier ? !!modifierActive(marqueeOptions.modifiers, config.additiveModifier) : false));

    marquee = idleMarquee();
    marquee.active = true;
    marquee.additive = additive;
    marquee.startPoint = { x, y };
    marquee.currentPoint = { x, y };
    marquee.selectionBefore = new Set(selected);
    marquee.additiveBase = additive ? new Set(selected) : new Set();
    // Replace mode clears the prior selection immediately; the box then fills it in.
    if (!additive) applySelection(new Set());
    marquee.box = normalizeBox(x, y, x, y);
    marquee.keysInBox = new Set();
    emit('marqueestart', { x, y, additive });
    notify();
    return instance;
  }

  /**
   * Update the marquee to content-space (x, y). The expensive hit-test is throttled to one
   * requestAnimationFrame (coalescing a burst of pointer moves); in a no-rAF environment
   * (Node tests) it runs synchronously so results are immediately observable.
   * @param {number} x @param {number} y
   */
  function updateMarquee(x, y) {
    if (destroyed || !marquee.active) return instance;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return instance; // ignore NaN pointer noise
    marquee.currentPoint = { x, y };
    scheduleMarqueeFrame();
    return instance;
  }

  function scheduleMarqueeFrame() {
    if (!canUseAnimationFrame()) { recomputeMarquee(); return; }      // sync fallback (headless / tests)
    if (marqueeFrameId) return;                              // already scheduled → coalesce this frame
    marqueeFrameId = requestAnimationFrame(() => { marqueeFrameId = 0; recomputeMarquee(); });
  }

  /** One marquee frame: rebuild the box, hit-test cached rects, reconcile hits, drive auto-scroll, emit. */
  function recomputeMarquee() {
    if (!marquee.active) return;
    const box = normalizeBox(marquee.startPoint.x, marquee.startPoint.y, marquee.currentPoint.x, marquee.currentPoint.y);
    marquee.box = box;

    // Cached-geometry hit-test — index when present (only items near the box), else brute O(N).
    let newHits;
    if (!config.multiple) {
      // Single-select: at most one — the first selectable item (in order) the box touches.
      const k = firstHit(box);
      newHits = k != null ? new Set([k]) : new Set();
      // Enforce the at-most-one invariant directly against `selected`, not via keysInBox/
      // additiveBase: a mode switch mid-drag (setMultiple(false)/setOptions({multiple:false}))
      // can leave a residual selected key that is in neither set, which the box-delta reconcile
      // below would never remove. Drop anything not in newHits so single-select stays singular.
      for (const sk of [...selected]) if (!newHits.has(sk)) removeKey(sk);
    } else if (index) {
      const hit = hitTestFor(config.intersect);
      newHits = new Set();
      for (const item of index.query(box)) if (hit(box, item)) newHits.add(item.key);
    } else {
      newHits = boxHitTest(selectableItems, box, config.intersect);
    }

    // Reconcile selected toward base ∪ newHits, touching only what changed (O(changed)).
    for (const k of newHits) if (!selected.has(k)) addKey(k);            // entered the box
    for (const k of marquee.keysInBox) {                                      // left the box
      if (!newHits.has(k) && !marquee.additiveBase.has(k)) removeKey(k);         // (keep additive base)
    }
    marquee.keysInBox = newHits;

    maybeAutoScroll();
    notify();
  }

  /** The first selectable item (item order) the box hits — for single-select marquee. */
  function firstHit(box) {
    const hit = hitTestFor(config.intersect);
    for (const item of selectableItems) if (hit(box, item)) return item.key;
    return null;
  }

  /** Commit the marquee (selection is already live) and clear marquee state. */
  function endMarquee() {
    if (destroyed || !marquee.active) return instance;
    if (marqueeFrameId && canUseAnimationFrame()) { cancelAnimationFrame(marqueeFrameId); marqueeFrameId = 0; }
    const gesture = marquee;   // identity to detect a re-entrant onChange replacing/clearing us
    recomputeMarquee();        // flush the final box/pointer position — notifies (onChange may re-enter)
    // recomputeMarquee()→notify() ran arbitrary consumer code (onChange). If it started a fresh
    // marquee (startMarquee) or tore us down (cancel/destroy), `marquee` is no longer this gesture;
    // leave that state intact rather than reading the NEW box and clobbering it to idle. Mirrors
    // autoScrollTick's post-recompute liveness re-check.
    if (destroyed || marquee !== gesture) return instance;
    stopAutoScroll();
    const box = marquee.box;
    marquee = idleMarquee();
    emit('marqueeend', { rect: box ? { ...box } : null });
    notify();
    return instance;
  }

  /** Abort the marquee and REVERT to the selection that existed before it started. */
  function cancelMarquee() {
    if (destroyed || !marquee.active) return instance;
    if (marqueeFrameId && canUseAnimationFrame()) { cancelAnimationFrame(marqueeFrameId); marqueeFrameId = 0; }
    stopAutoScroll();
    const selectionBefore = marquee.selectionBefore;
    marquee = idleMarquee();
    applySelection(selectionBefore);       // revert provisional changes
    emit('marqueecancel', {});
    notify();
    return instance;
  }

  function modifierActive(modifiers, name) {
    if (name === 'ctrlOrMeta') return !!(modifiers.ctrl || modifiers.meta);
    return !!modifiers[name];
  }

  // ---- auto-scroll --------------------------------------------------------
  // The one place the engine touches a consumer element's behavior. While marqueeing, if the
  // pointer nears the scroll container's edge, nudge its scroll each frame so off-screen items
  // come into the box's range, and advance the box's current point by the scroll delta so the
  // box keeps growing to cover them (the start point stays fixed in content space, so items
  // scrolled-past while inside the box stay selected). The hit-test still runs against the
  // fixed, content-space item positions — never a stale viewport-relative coordinate.

  /** Provide (or change) the scrollable container the marquee auto-scrolls. */
  function setScrollContainer(el) { if (destroyed) return instance; scrollElement = el || null; return instance; }

  function maybeAutoScroll() {
    if (!config.autoScroll || !isScrollContainerLike(scrollElement) || !canUseAnimationFrame() || !marquee.active) { return; }
    if (!autoScrollFrameId) autoScrollFrameId = requestAnimationFrame(autoScrollTick);
  }

  function autoScrollTick() {
    // This callback owns the handle it was scheduled under — clear it first (mirroring
    // scheduleMarqueeFrame's rAF callback) so the inner recomputeMarquee()→maybeAutoScroll()
    // and the re-arm guard below both see 0 and schedule exactly one next frame; otherwise the
    // stale non-zero id makes every re-arm path a no-op and the loop dies after a single step.
    autoScrollFrameId = 0;
    if (!marquee.active || !config.autoScroll || !isScrollContainerLike(scrollElement)) { return; }
    const { edge, speed } = config.autoScroll;
    // Finite-guard EVERY metric read off the consumer element: `|| 0` rejects NaN (falsy) but
    // NOT Infinity (truthy), so an Infinity scrollLeft/scrollWidth used to flow through clamp()
    // into leftBefore/deltaX and poison marquee.currentPoint.x permanently. Number.isFinite
    // rejects both, matching the vertical axis (scrollTop/clientHeight).
    const scrollTop = Number.isFinite(scrollElement.scrollTop) ? scrollElement.scrollTop : 0;
    const scrollLeft = Number.isFinite(scrollElement.scrollLeft) ? scrollElement.scrollLeft : 0;
    const clientHeight = Number.isFinite(scrollElement.clientHeight) ? scrollElement.clientHeight : 0;
    const clientWidth = Number.isFinite(scrollElement.clientWidth) ? scrollElement.clientWidth : 0;
    const scrollHeight = Number.isFinite(scrollElement.scrollHeight) ? scrollElement.scrollHeight : 0;
    const scrollWidth = Number.isFinite(scrollElement.scrollWidth) ? scrollElement.scrollWidth : 0;
    // Edge proximity in content space: the current point near the visible window's edges.
    let stepY = 0;
    let stepX = 0;
    if (marquee.currentPoint.y > scrollTop + clientHeight - edge && scrollTop + clientHeight < scrollHeight) {
      stepY = speed;
    } else if (marquee.currentPoint.y < scrollTop + edge && scrollTop > 0) {
      stepY = -speed;
    }
    if (scrollWidth > clientWidth) {
      if (marquee.currentPoint.x > scrollLeft + clientWidth - edge && scrollLeft + clientWidth < scrollWidth) {
        stepX = speed;
      } else if (marquee.currentPoint.x < scrollLeft + edge && scrollLeft > 0) {
        stepX = -speed;
      }
    }
    if (stepY === 0 && stepX === 0) { autoScrollFrameId = 0; return; } // off the edge → stop (restarts on re-entry)

    const topBefore = scrollTop;
    const leftBefore = scrollLeft;
    scrollElement.scrollTop = clamp(topBefore + stepY, 0, Math.max(0, scrollHeight - clientHeight));
    if (scrollWidth > clientWidth) {
      scrollElement.scrollLeft = clamp(leftBefore + stepX, 0, Math.max(0, scrollWidth - clientWidth));
    }
    const deltaY = (Number.isFinite(scrollElement.scrollTop) ? scrollElement.scrollTop : 0) - topBefore;
    const deltaX = (Number.isFinite(scrollElement.scrollLeft) ? scrollElement.scrollLeft : 0) - leftBefore;
    if (deltaY || deltaX) {
      // The pointer is stationary in the viewport, so scrolling by (deltaX,deltaY) moves the
      // content point under it by the same amount: grow the box's current edge, then re-test.
      marquee.currentPoint = { x: marquee.currentPoint.x + deltaX, y: marquee.currentPoint.y + deltaY };
      recomputeMarquee(); // re-tests + notifies — onChange may end/cancel/destroy us, so re-check below
    }
    // recomputeMarquee() ran arbitrary consumer code (onChange) that may have torn us down via
    // end/cancel/destroy (each calls stopAutoScroll(), zeroing autoScrollFrameId). Only re-arm if
    // the marquee is still live and nothing else already re-armed — never resurrect a dead loop.
    if (!destroyed && marquee.active && autoScrollFrameId === 0) {
      autoScrollFrameId = requestAnimationFrame(autoScrollTick);
    }
  }

  function stopAutoScroll() { if (autoScrollFrameId && canUseAnimationFrame()) cancelAnimationFrame(autoScrollFrameId); autoScrollFrameId = 0; }

  // ---- runtime config setters ---------------------------------------------

  function setOptions(patch = {}) {
    if (destroyed) return instance;
    config = buildConfig({ ...optionsView(), ...patch });
    if (config.autoScroll && config.autoScroll.scrollElement) scrollElement = config.autoScroll.scrollElement;
    applyDisabledPredicate();
    rebuildSelectable();
    pruneUnselectable();
    if (!config.multiple && selected.size > 1) applySelection(reduceToFirst(selected));
    // A live marquee reads config.intersect/multiple + selectableItems each frame; re-test it
    // now so the change takes effect immediately, matching setIntersectMode()/setItems().
    if (marquee.active) recomputeMarquee(); else notify();
    return instance;
  }
  function optionsView() {
    return {
      multiple: config.multiple, intersect: config.intersect, additiveModifier: config.additiveModifier,
      index: config.index, autoScroll: config.autoScroll, disabled: config.disabled,
    };
  }
  function setIntersectMode(mode) {
    if (destroyed) return instance;
    if (mode !== IntersectMode.INTERSECT && mode !== IntersectMode.CONTAIN) {
      throw new TypeError(`Unknown intersect mode: ${mode}`);
    }
    config.intersect = mode;
    if (marquee.active) recomputeMarquee(); else notify();
    return instance;
  }
  function setMultiple(multiple) {
    if (destroyed) return instance;
    config.multiple = !!multiple;
    if (!config.multiple && selected.size > 1) applySelection(reduceToFirst(selected));
    // Re-test a live marquee: recomputeMarquee() branches on config.multiple (single vs multi
    // hit-test). Mirrors setIntersectMode()/setItems() so all marquee-affecting setters agree.
    if (marquee.active) recomputeMarquee(); else notify();
    return instance;
  }
  function setDisabled(predicateOrFlag) {
    if (destroyed) return instance;
    config.disabled = typeof predicateOrFlag === 'function' ? predicateOrFlag : (predicateOrFlag === true ? () => true : null);
    applyDisabledPredicate(); // recompute each effective `selectable` from its own flag + the new predicate
    rebuildSelectable();
    pruneUnselectable();
    // selectableItems/index just changed; re-test a live marquee against the new selectable set.
    if (marquee.active) recomputeMarquee(); else notify();
    return instance;
  }
  function setAutoScroll(cfg) {
    if (destroyed) return instance;
    config.autoScroll = cfg ? {
      speed: (Number.isFinite(cfg.speed) && cfg.speed >= 0) ? cfg.speed : 14, // finite-guard: NaN would poison scrollTop
      edge: (Number.isFinite(cfg.edge) && cfg.edge >= 0) ? cfg.edge : 56,
      scrollElement: cfg.scrollElement || (config.autoScroll && config.autoScroll.scrollElement) || null,
    } : null;
    if (config.autoScroll && config.autoScroll.scrollElement) scrollElement = config.autoScroll.scrollElement;
    if (!config.autoScroll) stopAutoScroll();
    // Re-test a live marquee: recomputeMarquee() is the only path that calls maybeAutoScroll(),
    // so enabling auto-scroll mid-drag arms the rAF loop immediately rather than waiting for the
    // next updateMarquee(). Mirrors setIntersectMode()/setMultiple()/setDisabled() — all
    // marquee-affecting setters re-engage an active marquee.
    if (marquee.active) recomputeMarquee(); else notify();
    return instance;
  }
  /** Drop selected/anchor keys that are no longer selectable (after a disabled change). */
  function pruneUnselectable() {
    for (const k of [...selected]) if (!isSelectable(k)) removeKey(k);
    if (anchor != null && !isSelectable(anchor)) anchor = null;
  }

  // ---- state emission -----------------------------------------------------

  function publicMarquee() {
    return { active: marquee.active, additive: marquee.additive, rect: marquee.box ? { ...marquee.box } : null };
  }

  function buildState(delta) {
    const state = {
      selected,                 // LIVE set (read-only) — O(1) membership for the consumer
      count: selected.size,
      anchor,
      delta: delta || { entered: [], left: [] },
      marquee: publicMarquee(),
      config: configSnapshot(),
    };
    // selectedKeys is lazy: the hot marquee path never builds the ordered array unless read.
    Object.defineProperty(state, 'selectedKeys', { enumerable: true, get: getSelectedKeys });
    return state;
  }

  // Set when a deferred (microtask) emit is pending; a synchronous notify() in the
  // interim consumes it so the flush is skipped — exactly-once in all orderings.
  let notifyQueued = false;

  function notify() {
    if (destroyed) return;
    notifyQueued = false;
    const delta = { entered: [...pendingEntered], left: [...pendingLeft] };
    pendingEntered.clear(); pendingLeft.clear();
    const state = buildState(delta);
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }
  const emit = (type, payload) => { if (!destroyed) emitter.emit(type, payload); };

  // Coalesce a burst of synchronous setItems/registration into one emit. A synchronous
  // interaction notify() in between consumes the queue (notifyQueued=false) so the deferred
  // flush is skipped — exactly-once initial emit in all orderings (matches the other engines).
  function queueNotify() {
    if (destroyed || notifyQueued) return;
    notifyQueued = true;
    const flush = () => { if (notifyQueued) notify(); };
    if (typeof queueMicrotask === 'function') queueMicrotask(flush); else flush();
  }

  // ---- subscription / reads -----------------------------------------------

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }
  /** Subscribe to a named event: 'change' | 'marqueestart' | 'marqueeend' | 'marqueecancel'. */
  function on(type, callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on(type, callback);
  }
  function getState() { return buildState(null); }

  // ---- lifecycle ----------------------------------------------------------

  function destroy() {
    if (destroyed) return;
    if (marqueeFrameId && canUseAnimationFrame()) cancelAnimationFrame(marqueeFrameId);
    marqueeFrameId = 0;
    stopAutoScroll();
    marquee = idleMarquee();
    selected.clear();
    items = []; selectableItems = []; selectableKeys = []; itemsByKey.clear(); index = null;
    destroyed = true;
    emitter.clear();
  }

  const instance = {
    // item geometry
    setItems, getItemKeys, getItemCount, isSelectable,
    // click selection
    selectAt,
    // marquee
    startMarquee, updateMarquee, endMarquee, cancelMarquee, setScrollContainer,
    // bulk / programmatic
    selectAll, clear, toggle, select, deselect, setSelection, isSelected, getSelectedKeys, getAnchor, setAnchor,
    // config
    setOptions, setIntersectMode, setMultiple, setDisabled, setAutoScroll,
    // state
    subscribe, on, getState,
    // lifecycle
    destroy,
  };

  // Defer the initial emit a microtask so a synchronous subscribe() right after creation
  // still receives it (as the other engines do). A synchronous setItems coalesces into it.
  queueNotify();

  return instance;
}
