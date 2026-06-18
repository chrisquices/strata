// sortable-engine.js
// A headless DRAG-TO-REORDER engine — the framework-agnostic core that lets a user
// drag items already on the page to reorder them within a list, or move them between
// connected lists (kanban). It tracks the drag, computes the resulting order, and
// emits state; the CONSUMER renders the items, the lifted item, the gap/placeholder,
// and every pixel of styling and animation. The engine ships no item DOM and no CSS.
//
// SCOPE LINE (read first). This is REORDER BY POINTER-DRAG of on-page items. It is
// NOT file drag-and-drop (that is the separate drag-n-drop-engine, which rides native
// OS file-drop events — a different input entirely). Sortable's input is pointer
// drags on DOM elements, so it reuses shared/gestures.js for the drag recognition. The
// engine owns: the reorder logic, the drag lifecycle, cross-list movement, the
// drop-position math, auto-scroll, keyboard reordering, and emitting order + drag-state.
//
// REORDER MODEL: data-driven, ORDER-OUT, with optional offset hints. The source of
// truth during a drag is the PROVISIONAL ORDER — as the dragged item moves, the engine
// emits the new array order (item was at index 2, now provisionally at index 5) and the
// consumer re-renders the list from that order. This is the headless-pure model (emit
// data, consumer paints — identical in React/Vue/Svelte/vanilla). For consumers who
// want items to SLIDE to make room (FLIP-style), the engine ALSO emits optional
// per-item offset hints, but never applies a transform itself. Order is primary;
// offsets are an optional convenience.
//
// HEADLESS. No built-in sortable component, no default look. The engine manages the
// list order(s) + drag-state and emits them via getState() + subscribe()/onChange; the
// consumer renders. The engine never reorders the consumer's DOM nor applies transforms
// — it tells the consumer the order (and optional offsets) and the consumer renders.
// The ONE place it touches a consumer element's presentation is driving auto-scroll on
// a scrollable container, which is behavior, not painting.
//
// ELEMENT BY REFERENCE; ITEMS BY STABLE KEY. The consumer hands the engine the list
// container element(s) and each item element paired with its stable key. No selector
// strings. The engine works in terms of keys (the emitted order is ['a','c','b'],
// meaningful regardless of DOM); it reads element geometry (rects) to compute the drop
// position but identifies items by key. The consumer maps keys <-> its data.
//
// REUSE shared/gestures.js (do NOT reinvent pointer handling). The pointer-drag
// activation (a press becomes a drag only after the move threshold — which is exactly
// what distinguishes a drag from a click) comes from the shared gesture recognizer,
// configured in always-PAN mode (isZoomed:()=>true) so every one-finger drag resolves
// to the generic panstart/pan/panend lifecycle. We supply our own thin per-item pointer
// binding rather than recognizer.attach(): attach() also claims the wheel for zoom
// (which a scrollable list must keep) and captures on the element (a sortable drag must
// continue across into other lists), and we need to know WHICH item/handle the press
// hit. Touch long-press-to-activate (which the recognizer does not provide) is the one
// small addition layered on top, so a drag does not fight page scroll on mobile.
//
// DEPENDENCY-FREE & DOM-OPTIONAL. Zero runtime dependencies beyond ../shared/. Every
// browser API it touches — pointer events, getBoundingClientRect, element scroll,
// requestAnimationFrame, keydown/focus — is touched ONLY inside method bodies behind
// capability checks, never at module scope. So the pure reorder logic (the drop-index
// math, the splice/cross-list reorder, keyboard reordering, the order state model)
// imports and runs clean in Node with no `document`, and is unit-testable with
// rects-as-data and no DOM.
//
// Exports: { createSortable, computeDropIndex, reorderWithin, Orientation }

import { Emitter } from '../shared/emitter.js';
import { createGestureRecognizer } from '../shared/gestures.js';
import { clamp } from '../shared/clamp.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/** List axis the drop-index math projects the pointer onto. */
export const Orientation = Object.freeze({
  VERTICAL: 'vertical',     // items stack top-to-bottom (the common case)
  HORIZONTAL: 'horizontal', // items run left-to-right
  GRID: 'grid',             // items wrap in a 2D grid (optional/stretch)
});

// ============================================================================
// Pure geometry + reorder helpers (no DOM — module scope is safe in Node).
// These take rects/positions/keys as plain data, so they are provably correct
// headlessly. The live getBoundingClientRect() calls are confined to methods.
// ============================================================================

/**
 * @typedef {Object} Rect  a normalized bounding box (the subset of DOMRect we use)
 * @property {number} left
 * @property {number} top
 * @property {number} right
 * @property {number} bottom
 * @property {number} width
 * @property {number} height
 */

/** Vertical midpoint of a rect. */
const midpointY = (rect) => (rect.top + rect.bottom) / 2;
/** Horizontal midpoint of a rect. */
const midpointX = (rect) => (rect.left + rect.right) / 2;
/** Is point (x,y) inside rect r (inclusive)? */
const pointInRect = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

/**
 * THE CORE MATH. Given the candidate item rects (already EXCLUDING the dragged
 * item's own slot when reordering within its source list — the caller removes it so
 * the gap is never double-counted) in list order, plus a pointer position and the
 * list orientation, return the provisional insertion index: where the dragged item
 * would land in the candidate sequence.
 *
 * The result is in [0, rects.length]:
 *   0               — before the first item (pointer above/left of every midpoint)
 *   rects.length    — after the last item (pointer below/right of every midpoint)
 *   k               — between candidate k-1 and k
 *
 * Insert BEFORE the first item whose midpoint sits past the pointer (vertical: below
 * the pointer's Y; horizontal: right of the pointer's X). At exactly a midpoint the
 * pointer counts as past it (inserts after) — a stable, documented tie rule.
 *
 * @param {Rect[]} rects     candidate rects in list order (dragged item removed)
 * @param {{x:number,y:number}} pointer
 * @param {string} [orientation=Orientation.VERTICAL]
 * @returns {number}
 */
export function computeDropIndex(rects, pointer, orientation = Orientation.VERTICAL) {
  const count = rects.length;
  if (count === 0) return 0; // empty list (or empty connected column) -> index 0
  if (orientation === Orientation.GRID) return gridDropIndex(rects, pointer);
  if (orientation === Orientation.HORIZONTAL) {
    for (let i = 0; i < count; i++) if (pointer.x < midpointX(rects[i])) return i;
    return count;
  }
  // vertical (default)
  for (let i = 0; i < count; i++) if (pointer.y < midpointY(rects[i])) return i;
  return count;
}

/**
 * Grid drop index (optional/stretch). Row-major reading-order insertion: an item
 * precedes the pointer if it is in a row entirely above the pointer, or in the
 * pointer's row band and centered to the pointer's left. The insertion index is the
 * count of preceding items. Defined for unambiguous placements; items exactly under
 * the pointer's column center insert before that item.
 * @param {Rect[]} rects     candidate rects in list order (dragged item removed)
 * @param {{x:number,y:number}} pointer
 * @returns {number}
 */
function gridDropIndex(rects, pointer) {
  let count = 0;
  for (const rect of rects) {
    if (pointer.y > rect.bottom) { count++; continue; } // whole item is above the pointer's row
    if (pointer.y < rect.top) continue;                  // whole item is below the pointer's row
    if (pointer.x > midpointX(rect)) count++;                 // same row band, pointer to the item's right
  }
  return count;
}

/**
 * Move the element at `from` to `to` within a copy of `keys` (the splice logic the
 * provisional order is built from). Indices are clamped; `from === to` is a no-op copy.
 * @param {string[]} keys
 * @param {number} from
 * @param {number} to
 * @returns {string[]} a new array
 */
export function reorderWithin(keys, from, to) {
  const out = keys.slice();
  const len = out.length;
  if (len === 0) return out;
  const fromIndex = clamp(from, 0, len - 1);
  const toIndex = clamp(to, 0, len - 1);
  if (fromIndex === toIndex) return out;
  const [moved] = out.splice(fromIndex, 1);
  out.splice(toIndex, 0, moved);
  return out;
}

/** A new array with `key` removed (first occurrence). */
const without = (keys, key) => { const i = keys.indexOf(key); return i < 0 ? keys.slice() : keys.slice(0, i).concat(keys.slice(i + 1)); };
/** A new array with `key` inserted at `index` (clamped to [0, len]). */
const insertAt = (keys, key, index) => { const out = keys.slice(); out.splice(clamp(index, 0, out.length), 0, key); return out; };

/**
 * Per-item FLIP offset hints for one list: how far each non-dragged item must shift
 * from its resting position to its provisional slot, so a consumer that keeps its DOM
 * in resting order can `translate()` each item and watch them slide. Computed purely
 * from the captured resting rects — the engine applies nothing.
 *
 * Slots are the resting rects' top-left corners in resting order; an item now at
 * provisional index j targets slot j (overflowing slots, when a list gained an item,
 * extrapolate one uniform step past the last rect). The dragged item is skipped (it
 * floats under the pointer). Approximate for non-uniform item sizes — offsets are a
 * convenience; order is the source of truth.
 *
 * @param {string[]} restOrder   resting key order for this list
 * @param {Map<string,Rect>} rectByKey
 * @param {string[]} provOrder   provisional key order for this list
 * @param {string} orientation
 * @param {string} draggedKey
 * @returns {Object<string,{x:number,y:number}>}
 */
function computeOffsets(restOrder, rectByKey, provOrder, orientation, draggedKey) {
  const offsets = {};
  if (!restOrder.length) return offsets;
  const horizontal = orientation === Orientation.HORIZONTAL;
  // Slot positions (top-left of each resting slot, in order) + a uniform step to
  // extrapolate a slot past the end when a list gained an item.
  const slots = restOrder.map((key) => { const rect = rectByKey.get(key); return rect ? { x: rect.left, y: rect.top } : null; });
  let step = 0;
  if (restOrder.length >= 2) {
    const a = rectByKey.get(restOrder[0]); const b = rectByKey.get(restOrder[1]);
    if (a && b) step = horizontal ? (b.left - a.left) : (b.top - a.top);
  } else {
    const a = rectByKey.get(restOrder[0]);
    if (a) step = horizontal ? a.width : a.height;
  }
  const slotPos = (j) => {
    if (j < slots.length && slots[j]) return slots[j];
    const last = slots[slots.length - 1];
    if (!last) return { x: 0, y: 0 };
    const over = j - (slots.length - 1);
    return horizontal ? { x: last.x + over * step, y: last.y } : { x: last.x, y: last.y + over * step };
  };
  for (let j = 0; j < provOrder.length; j++) {
    const key = provOrder[j];
    if (key === draggedKey) continue;         // floats — no slide offset
    const own = rectByKey.get(key);
    if (!own) continue;                        // entered from another list; consumer re-renders it
    const target = slotPos(j);
    offsets[key] = { x: target.x - own.left, y: target.y - own.top };
  }
  return offsets;
}

// ============================================================================
// Small environment guards (named DOM globals only behind typeof — never a bare
// access that would throw at load in Node).
// ============================================================================

const canUseAnimationFrame = () => typeof requestAnimationFrame === 'function' && typeof cancelAnimationFrame === 'function';
/** Read a normalized rect from anything exposing getBoundingClientRect (real Node or test stub). */
function getRect(el) {
  if (!el || typeof el.getBoundingClientRect !== 'function') return null;
  const rect = el.getBoundingClientRect();
  if (!rect) return null;
  // Finite-guard every field so a misbehaving/stub container reporting a non-finite
  // left/top/width/etc. cannot poison grabOffset/position (captured once at grab and
  // never recomputed) or the drop-index/offset math. Mirrors the auto-scroll scrollTop
  // guard and selection-engine's normalizeItem: a non-finite field coerces to 0 rather
  // than carrying NaN forward for the rest of the drag (NON-FINITE POISONING, class #1).
  const finOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);
  const left = finOr(rect.left, 0), top = finOr(rect.top, 0);
  const width = finOr(rect.width, finOr(rect.right - rect.left, 0));
  const height = finOr(rect.height, finOr(rect.bottom - rect.top, 0));
  return {
    left, top,
    right: finOr(rect.right, left + width),
    bottom: finOr(rect.bottom, top + height),
    width, height,
  };
}
/** The window that owns `el`, when there is one. */
const ownerWindow = (el) => (el && el.ownerDocument && el.ownerDocument.defaultView) || (typeof window !== 'undefined' ? window : null);
/** Capability check before wiring DOM events on a handed-in element. */
const canListen = (el) => !!el && typeof el.addEventListener === 'function';

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} DragState
 * @property {boolean} active       a drag is in progress
 * @property {?string} key          the dragged item's key
 * @property {?string} sourceList   list the drag started in
 * @property {?number} fromIndex    the dragged item's index at grab time
 * @property {?string} targetList   the list the item would drop into now (null = over nothing valid)
 * @property {?number} index        provisional drop index in targetList (the item's final position)
 * @property {boolean} keyboard     true when the drag is keyboard-driven
 * @property {boolean} grabbed      accessibility "picked up" flag (mirrors active, for aria-grabbed)
 * @property {boolean} dropValid    would a drop here commit (false when over nothing — a drop reverts)
 * @property {?{x:number,y:number}} pointer    current pointer position (pointer drags only)
 * @property {?{x:number,y:number}} grabOffset pointer-to-item-top-left at grab (render the lifted clone with this)
 * @property {?{x:number,y:number}} position   suggested top-left for the lifted item (pointer - grabOffset)
 * @property {?string} announcement aria-live text describing the latest move (for the consumer to announce)
 * @property {Object<string,Object<string,{x:number,y:number}>>} offsets  optional FLIP hints, by list id then key
 */

/**
 * @typedef {Object} SortableState
 * @property {Array<{id:string, items:string[], orientation:string, group:?string}>} lists
 *           every registered list with its CURRENT order (provisional during a drag,
 *           committed otherwise) — the consumer renders each list from `items`.
 * @property {DragState} drag
 * @property {Object} config  a readable snapshot of the resolved options
 */

// ============================================================================
// createSortable
// ============================================================================

/**
 * Create a headless drag-to-reorder instance.
 *
 * @param {Object} [options]
 * @param {string} [options.orientation='vertical']  default list axis ('vertical'|'horizontal'|'grid')
 * @param {?string} [options.group=null]             default connection group; lists sharing a group accept each other's items
 * @param {boolean} [options.handle=false]           require a per-item handle element to start a drag
 * @param {number} [options.threshold=6]             px of movement before a press becomes a drag (drag-vs-click)
 * @param {number} [options.longPressDelay=0]        ms to hold on touch before a drag activates (0 = off; avoids fighting scroll)
 * @param {boolean|Object} [options.autoScroll=false] auto-scroll near a scroll container's edge; object tunes {speed,edge}
 * @param {boolean} [options.keyboard=true]          enable keyboard reordering (Space/Enter grab, arrows move, Esc cancel)
 * @param {boolean|((key:string,listId:string)=>boolean)} [options.disabled]  items that cannot be dragged (predicate or true)
 * @param {(state: SortableState) => void} [options.onChange]   called with state on every change
 * @param {(payload: {key:string,fromList:string,fromIndex:number,toList:string,toIndex:number}) => void} [options.onChanged]
 *           called when an order actually commits (the data-sync event)
 * @returns {Object} the sortable instance
 */
export function createSortable(options = {}) {
  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  const onChanged = typeof options.onChanged === 'function' ? options.onChanged : null;

  let destroyed = false;
  let config = buildConfig(options);

  /**
   * @type {Map<string, {
   *   id:string, el:any, orientation:string, group:?string, scrollEl:any,
   *   keys:string[], items:Map<string,{el:any,handleEl:any,disabled:boolean,locked:boolean}>,
   *   detach:?(()=>void)
   * }>}
   */
  const lists = new Map();

  // The gesture recognizer is the shared, DOM-free pointer-drag discriminator. Always
  // in pan mode (isZoomed:()=>true) so any one-finger drag past the threshold escalates
  // to panstart — that is our "this press is now a drag" signal (not a click). We feed
  // it normalized samples from our own per-item binding and read its panstart.
  //
  // The recognizer captures moveThreshold once at construction (shared/gestures.js merges
  // it into a closed-over settings object) and exposes no reconfiguration method. So that
  // setOptions({threshold}) actually changes the desktop drag-activation distance (not
  // just the snapshot), buildRecognizer() can rebuild it with a new moveThreshold and
  // re-wire panstart. The binding is `let` so every closure reads the live recognizer.
  let recognizer;
  function buildRecognizer() {
    recognizer = createGestureRecognizer({ isZoomed: () => true, moveThreshold: config.threshold });
    // panstart is the authoritative "this press became a drag" signal from the recognizer.
    recognizer.on('panstart', () => { if (session && session.usingRecognizer && !drag.active) beginDrag(session.key, { pointer: { x: session.lastX != null ? session.lastX : session.startX, y: session.lastY != null ? session.lastY : session.startY } }); });
  }
  buildRecognizer();

  /** @type {DragState & {provisional: Map<string,string[]>, preDrag: Map<string,string[]>, rectByKey: Map<string,Rect>, groupLists: string[]}} */
  let drag = idleDrag();

  // In-flight pointer session (between pointerdown and the drag activating / ending).
  let session = null;
  let autoScrollFrameId = 0;
  // Disposer for an armed post-drag click guard (removes the global 'click' listener and
  // cancels its self-clear timer); null when no guard is pending. Run on re-arm and destroy().
  let clickGuardDispose = null;

  function idleDrag() {
    return {
      active: false, key: null, sourceList: null, fromIndex: null,
      targetList: null, index: null, keyboard: false, grabbed: false, dropValid: false,
      pointer: null, grabOffset: null, position: null, announcement: null, offsets: {},
      provisional: new Map(), preDrag: new Map(), rectByKey: new Map(), groupLists: [],
    };
  }

  // ---- configuration ------------------------------------------------------

  function buildConfig(sourceOptions) {
    // Throw on an explicitly-provided unknown orientation rather than silently resetting to
    // vertical, matching setOrientation and the repo's throw-on-unknown-enum convention. An
    // omitted orientation defaults to vertical; a typo'd one is a loud programming error.
    // (setOptions routes through here with optionsView() supplying the current axis, so a
    // silent fallback here would discard a previously-set 'horizontal'/'grid' on any typo.)
    const orientation = sourceOptions.orientation === undefined
      ? Orientation.VERTICAL
      : (isOrientation(sourceOptions.orientation)
          ? sourceOptions.orientation
          : (() => { throw new TypeError(`unknown orientation "${sourceOptions.orientation}"`); })());
    const autoScroll = sourceOptions.autoScroll;
    return {
      orientation,
      group: sourceOptions.group != null ? sourceOptions.group : null,
      handle: !!sourceOptions.handle,
      // Finite guards mirror the autoScroll.speed/edge siblings below: a bare typeof check
      // admits Infinity (Infinity >= 0 and Infinity > 0 are both true), which would poison
      // the gesture recognizer's moveThreshold (Math.hypot(...) < Infinity is always true, so
      // a desktop drag can never escalate) and the long-press setTimeout delay (a non-finite
      // delay is coerced to 0 by the timer spec, firing immediately). Non-finite falls back.
      threshold: (Number.isFinite(sourceOptions.threshold) && sourceOptions.threshold >= 0) ? sourceOptions.threshold : 6,
      longPressDelay: (Number.isFinite(sourceOptions.longPressDelay) && sourceOptions.longPressDelay > 0) ? sourceOptions.longPressDelay : 0,
      keyboard: sourceOptions.keyboard !== false, // default on
      disabled: typeof sourceOptions.disabled === 'function' ? sourceOptions.disabled : (sourceOptions.disabled === true ? () => true : null),
      autoScroll: autoScroll ? {
        // Finite-and-positive guards: a bare typeof check passes NaN, which would
        // poison the consumer container's scrollTop/scrollLeft (speed) or silently
        // disable every edge-band test (edge). NaN/Infinity fall back to the default.
        speed: (Number.isFinite(autoScroll.speed) && autoScroll.speed > 0) ? autoScroll.speed : 12,   // px per frame at the edge
        edge: (Number.isFinite(autoScroll.edge) && autoScroll.edge >= 0) ? autoScroll.edge : 60,      // px-deep activation band
      } : null,
    };
  }

  function isOrientation(value) { return value === Orientation.VERTICAL || value === Orientation.HORIZONTAL || value === Orientation.GRID; }

  function configSnapshot() {
    return {
      orientation: config.orientation,
      group: config.group,
      handle: config.handle,
      threshold: config.threshold,
      longPressDelay: config.longPressDelay,
      keyboard: config.keyboard,
      autoScroll: config.autoScroll ? { ...config.autoScroll } : false,
      hasDisabled: !!config.disabled,
    };
  }

  // ---- registration -------------------------------------------------------

  /**
   * Register a list container with its ordered item keys (and, optionally, the item
   * elements so the engine can read their geometry and wire drag/keyboard input).
   * @param {any} el   the container element (or any object with getBoundingClientRect for headless use)
   * @param {Object} listOptions
   * @param {string} listOptions.id
   * @param {Array<string|{key:string,el?:any,handleEl?:any,disabled?:boolean,locked?:boolean}>} [listOptions.items]
   * @param {string} [listOptions.orientation]   per-list override of the default axis
   * @param {?string} [listOptions.group]        per-list override of the default group
   * @param {any} [listOptions.scrollEl]         the scrollable ancestor to auto-scroll (defaults to el)
   * @returns {() => void} an unregister function
   */
  function registerList(el, listOptions = {}) {
    if (destroyed) return () => {};
    const id = String(listOptions.id != null ? listOptions.id : el && el.id);
    if (!id || id === 'undefined') throw new Error('registerList requires an id');
    // Re-registering an id replaces it (consumer's data changed) without leaking listeners.
    if (lists.has(id)) unregisterList(id);

    const listRecord = {
      id, el,
      // Per-list axis: an omitted override inherits config.orientation; an explicitly-provided
      // typo throws (matching setOrientation/buildConfig) instead of silently inheriting.
      orientation: listOptions.orientation === undefined
        ? config.orientation
        : (isOrientation(listOptions.orientation)
            ? listOptions.orientation
            : (() => { throw new TypeError(`unknown orientation "${listOptions.orientation}"`); })()),
      group: listOptions.group !== undefined ? listOptions.group : config.group,
      scrollEl: listOptions.scrollEl || el,
      keys: [],
      items: new Map(),
      detach: null,
    };
    lists.set(id, listRecord);

    for (const entry of listOptions.items || []) {
      if (typeof entry === "string") { listRecord.keys.push(entry); listRecord.items.set(entry, { el: null, handleEl: null, disabled: false, locked: false }); }
      else if (entry && entry.key != null) {
        const key = String(entry.key);
        listRecord.keys.push(key);
        listRecord.items.set(key, { el: entry.el || null, handleEl: entry.handleEl || null, disabled: !!entry.disabled, locked: !!entry.locked });
      }
    }
    // Wire input for any items that came with elements.
    for (const [key, item] of listRecord.items) if (item.el) bindItem(listRecord, key, item);
    queueNotify();
    return () => unregisterList(id);
  }

  /** Remove a list, detaching every item's input listeners. */
  function unregisterList(id) {
    const listRecord = lists.get(String(id));
    if (!listRecord) return instance;
    for (const [, item] of listRecord.items) if (item.detach) item.detach();
    if (drag.active && (drag.sourceList === listRecord.id || drag.groupLists.includes(listRecord.id))) cancel();
    endSessionIfAffected((sessionKey) => listRecord.items.has(sessionKey));
    lists.delete(listRecord.id);
    queueNotify();
    return instance;
  }

  /**
   * Register (or re-register) one item element with its key and list. Use when items
   * are added incrementally rather than via registerList's `items`.
   * @param {any} el
   * @param {string} key
   * @param {string} listId
   * @param {{handleEl?:any, disabled?:boolean, locked?:boolean, index?:number}} [options]
   */
  function registerItem(el, key, listId, options = {}) {
    const listRecord = lists.get(String(listId));
    if (!listRecord) throw new Error(`registerItem: unknown list "${listId}"`);
    key = String(key);
    // Mirror unregisterItem/setItems/unregisterList: an active drag holds a pre-drag
    // snapshot it rebuilds from on drop(). Splicing a new key into this list mid-drag would
    // leave that snapshot stale, so drop() would commit the old order and silently discard
    // the newly registered key. Cancel first if the drag touches this list.
    if (drag.active && (drag.sourceList === listRecord.id || drag.groupLists.includes(listRecord.id))) cancel();
    // Re-registering this key detaches its previous element's listeners below, so a pending
    // session armed on it (and its window listeners) is stale — release it.
    endSessionIfAffected((sessionKey) => sessionKey === key);
    const prev = listRecord.items.get(key);
    if (prev && prev.detach) prev.detach();
    const item = { el, handleEl: options.handleEl || null, disabled: !!options.disabled, locked: !!options.locked };
    listRecord.items.set(key, item);
    if (!listRecord.keys.includes(key)) {
      // `typeof NaN === 'number'` is true, so a NaN index would take the clamp branch where
      // clamp(NaN,...) returns NaN and splice coerces it to 0 (insert at front). Use a finite
      // check so a non-finite index falls back to the documented default: append at the end.
      const at = Number.isFinite(options.index) ? clamp(options.index, 0, listRecord.keys.length) : listRecord.keys.length;
      listRecord.keys.splice(at, 0, key);
    }
    if (el) bindItem(listRecord, key, item);
    queueNotify();
    return instance;
  }

  /** Unregister one item (detaching its listeners) and drop it from the order. */
  function unregisterItem(key, listId) {
    const listRecord = lists.get(String(listId));
    if (!listRecord) return instance;
    key = String(key);
    // Mirror setItems/unregisterList: an active drag holds a pre-drag snapshot that still
    // contains this key, so dropping after the removal would rebuild from that snapshot and
    // resurrect the deleted key. Cancel first if the drag touches this list or this key.
    if (drag.active && (key === drag.key || drag.sourceList === listRecord.id || drag.groupLists.includes(listRecord.id))) cancel();
    endSessionIfAffected((sessionKey) => sessionKey === key);
    const item = listRecord.items.get(key);
    if (item && item.detach) item.detach();
    listRecord.items.delete(key);
    const i = listRecord.keys.indexOf(key);
    if (i >= 0) listRecord.keys.splice(i, 1);
    queueNotify();
    return instance;
  }

  /**
   * Replace a list's order to match external data (items added/removed/reordered by the
   * consumer). An active drag touching this list is cancelled cleanly first so the
   * engine never commits against a stale snapshot.
   * @param {string} listId
   * @param {string[]} keys
   */
  function setItems(listId, keys) {
    const listRecord = lists.get(String(listId));
    if (!listRecord) return instance;
    if (drag.active && (drag.sourceList === listRecord.id || drag.groupLists.includes(listRecord.id))) cancel();
    const next = (keys || []).map(String);
    // A pending session whose key lived in this list but is dropped by the new order has its
    // element detached below; release its armed timer + window listeners.
    endSessionIfAffected((sessionKey) => listRecord.items.has(sessionKey) && !next.includes(sessionKey));
    listRecord.keys = next.slice();
    // Drop registrations for keys no longer present; keep elements for surviving keys.
    for (const [key, item] of [...listRecord.items]) {
      if (!next.includes(key)) { if (item.detach) item.detach(); listRecord.items.delete(key); }
    }
    for (const k of next) if (!listRecord.items.has(k)) listRecord.items.set(k, { el: null, handleEl: null, disabled: false, locked: false });
    notify();
    return instance;
  }

  /** The current order of a list (a copy). */
  function getItems(listId) {
    const listRecord = lists.get(String(listId));
    return listRecord ? listRecord.keys.slice() : [];
  }

  // ---- draggability rules -------------------------------------------------

  function findList(key) {
    for (const listRecord of lists.values()) if (listRecord.keys.includes(key)) return listRecord;
    return null;
  }

  /** Lists that can receive an item dragged out of `listRecord` (itself + same-group lists). */
  function connectedLists(listRecord) {
    const out = [listRecord.id];
    if (listRecord.group != null) for (const other of lists.values()) if (other.id !== listRecord.id && other.group === listRecord.group) out.push(other.id);
    return out;
  }

  /** Can `key` in `listId` be picked up? Disabled items (per-item or via the predicate) cannot. */
  function canDrag(key, listId) {
    const listRecord = lists.get(listId);
    if (!listRecord) return false;
    const item = listRecord.items.get(key);
    if (item && item.disabled) return false;
    if (config.disabled && config.disabled(key, listId)) return false;
    return true;
  }

  // ---- measurement (capture resting geometry at grab time) ----------------
  //
  // The drop-index math runs against the items' RESTING positions captured once at
  // grab — NOT the live, shifting positions a re-rendering consumer produces. Computing
  // against a stable snapshot is what makes the result deterministic and free of the
  // oscillation you get when each provisional re-render moves the very rects you are
  // measuring. Auto-scroll shifts the snapshot by the scroll delta; refresh() re-reads.

  function measureGroup(listRecord) {
    const groupLists = connectedLists(listRecord);
    const rectByKey = new Map();
    for (const id of groupLists) {
      const list = lists.get(id);
      if (!list) continue;
      for (const key of list.keys) {
        const item = list.items.get(key);
        const rect = item && getRect(item.el);
        if (rect) rectByKey.set(key, rect);
      }
    }
    return { groupLists, rectByKey };
  }

  /** The list whose container the pointer is over (prefers the deepest match; null if none). */
  function hitTestList(groupLists, pointer) {
    let hit = null;
    for (const id of groupLists) {
      const list = lists.get(id);
      const rect = list && getRect(list.el);
      if (rect && pointInRect(rect, pointer.x, pointer.y)) hit = id; // last match wins (later = more specific in registration order)
    }
    return hit;
  }

  /**
   * Candidate rects for computing a drop into `targetId`, in list order, dragged item removed,
   * plus `subToFull` — the map from a computeDropIndex result (an index in [0, rects.length],
   * i.e. RECT-SUBSET space) back to an insertion index in the FULL candidate order. When a list
   * mixes measured items with unmeasured keys (bare-string registrations, or registerItem(null)),
   * `rects` is shorter than the order; without this remap, an index computed against the subset
   * would splice into the full order off by the count of preceding unmeasured keys.
   */
  function candidateRects(targetId, draggedKey) {
    const list = lists.get(targetId);
    const order = list.keys.filter((candidateKey) => candidateKey !== draggedKey);
    const rects = [];
    // subToFull[p] = full-order insertion index for the p-th surviving (rect-having) key;
    // the final entry maps "after the last surviving key" to the end of the full order.
    const subToFull = [];
    for (let i = 0; i < order.length; i++) {
      const rect = drag.rectByKey.get(order[i]);
      if (rect) { rects.push(rect); subToFull.push(i); }
    }
    subToFull.push(order.length);
    return { rects, subToFull };
  }

  /** Clamp an insertion index so leading/trailing LOCKED (non-displaceable) items stay pinned. */
  function clampForLocked(targetId, draggedKey, index) {
    const list = lists.get(targetId);
    const order = list.keys.filter((candidateKey) => candidateKey !== draggedKey);
    let lead = 0; while (lead < order.length && isLocked(list, order[lead])) lead++;
    let trail = 0; while (trail < order.length && isLocked(list, order[order.length - 1 - trail])) trail++;
    // Leading and trailing locked regions are counted independently, so when they meet or
    // overlap (e.g. an all-locked target) lead + trail can exceed order.length, making the
    // clamp range inverted (min > max). clamp() then returns min below min and max above max,
    // yielding inconsistent, pin-violating insertion points. Cap trail so the regions cannot
    // overlap, collapsing a fully/partially-locked target to a single valid insertion point.
    trail = Math.min(trail, order.length - lead);
    return clamp(index, lead, order.length - trail);
  }
  const isLocked = (list, key) => { const item = list.items.get(key); return !!(item && item.locked); };

  // ---- the input-agnostic drag controller ---------------------------------
  // Pointer binding, keyboard binding, and tests all funnel through these so every
  // input path produces the same provisional order, the same "changed" payload, and
  // the same revert. This is the seam that makes the engine testable headlessly.

  /**
   * Begin a drag of `key`. Records the pre-drag order for revert, captures resting
   * geometry, and emits drag-state. Returns false if the item cannot be dragged.
   * @param {string} key
   * @param {Object} [options]
   * @param {boolean} [options.keyboard=false]
   * @param {{x:number,y:number}} [options.pointer]   pointer position (pointer drags)
   */
  function beginDrag(key, options = {}) {
    if (destroyed || drag.active) return false;
    key = String(key);
    const listRecord = findList(key);
    if (!listRecord || !canDrag(key, listRecord.id)) return false;

    const { groupLists, rectByKey } = measureGroup(listRecord);
    const preDrag = new Map();
    for (const id of groupLists) preDrag.set(id, lists.get(id).keys.slice());

    const fromIndex = listRecord.keys.indexOf(key);
    drag = idleDrag();
    drag.active = true;
    drag.grabbed = true;
    drag.key = key;
    drag.sourceList = listRecord.id;
    drag.fromIndex = fromIndex;
    drag.targetList = listRecord.id;
    drag.index = fromIndex;
    drag.dropValid = true;
    drag.keyboard = !!options.keyboard;
    drag.groupLists = groupLists;
    drag.rectByKey = rectByKey;
    drag.preDrag = preDrag;
    drag.provisional = new Map(); // empty => lists render their committed order until a move shifts them

    if (options.pointer && !drag.keyboard) {
      // grabOffset is captured ONCE here and never recomputed; a non-finite pointer would
      // permanently poison grabOffset and every later position (NON-FINITE POISONING).
      // Reject the grab rather than carry NaN forward, mirroring move()'s finite-guard.
      if (!Number.isFinite(options.pointer.x) || !Number.isFinite(options.pointer.y)) { drag = idleDrag(); return false; }
      const rect = rectByKey.get(key);
      drag.pointer = { x: options.pointer.x, y: options.pointer.y };
      drag.grabOffset = rect ? { x: options.pointer.x - rect.left, y: options.pointer.y - rect.top } : { x: 0, y: 0 };
      drag.position = rect ? { x: rect.left, y: rect.top } : { x: options.pointer.x, y: options.pointer.y };
    }
    drag.announcement = drag.keyboard
      ? `Grabbed item ${key}. Position ${fromIndex + 1} of ${listRecord.keys.length} in ${listRecord.id}. Use arrow keys to move, space to drop, escape to cancel.`
      : null;

    emit('dragstart', publicDrag());
    notify();
    return true;
  }

  /**
   * Update the provisional order from a pointer position: hit-test the connected lists,
   * compute the drop index against the captured resting rects, and rebuild the
   * provisional order(s). Drives the gap and (for the lifted clone) the pointer-follow.
   * @param {{x:number,y:number}} pointer
   */
  function moveDragTo(pointer) {
    if (!drag.active || drag.keyboard) return;
    // A non-finite pointer would poison drag.pointer and drag.position (NaN/Infinity), and
    // because refresh() re-invokes moveDragTo(drag.pointer) the poison would survive for the
    // rest of the drag. Ignore the move and keep the last good pointer/position, mirroring
    // beginDrag's grab-time finite-guard (NON-FINITE POISONING).
    if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return;
    drag.pointer = { x: pointer.x, y: pointer.y };
    if (drag.grabOffset) drag.position = { x: pointer.x - drag.grabOffset.x, y: pointer.y - drag.grabOffset.y };

    const target = hitTestList(drag.groupLists, pointer);
    if (target == null) {
      // Over nothing valid: the gap returns home and a drop here will revert.
      setProvisional(new Map(), null, null, false);
      maybeAutoScroll(pointer, null);
      notify();
      return;
    }
    const list = lists.get(target);
    const { rects, subToFull } = candidateRects(target, drag.key);
    // computeDropIndex works in rect-subset space; remap to full-order space before splicing.
    let index = subToFull[computeDropIndex(rects, pointer, list.orientation)];
    index = clampForLocked(target, drag.key, index);
    buildProvisional(target, index);
    maybeAutoScroll(pointer, list);
    notify();
  }

  /**
   * Keyboard / programmatic move by whole steps within the current target list.
   * +1 moves the item one slot toward the end, -1 toward the start.
   * @param {number} delta
   */
  function moveDragBy(delta) {
    if (!drag.active) return;
    // delta is consumer-supplied and flows unguarded through clamp() (which does NOT reject
    // NaN) into clampForLocked then Array.splice (which coerces a NaN start to 0). Without
    // this guard moveDragBy(NaN) would splice the item to the front, poison drag.index to
    // NaN, and commit the corrupt order on drop. Mirror move()'s toIndex finite-guard.
    if (!Number.isFinite(delta)) return;
    const targetId = drag.targetList || drag.sourceList;
    const list = lists.get(targetId);
    if (!list) return;
    // Length of the list WITH the dragged item: its provisional order if it is already
    // sitting in this list, else committed length + 1 (it has not been inserted yet).
    const provOrder = drag.provisional.get(targetId);
    const len = provOrder ? provOrder.length : (targetId === drag.sourceList ? list.keys.length : list.keys.length + 1);
    const next = clampForLocked(targetId, drag.key, clamp(drag.index + delta, 0, Math.max(0, len - 1)));
    if (next === drag.index && drag.targetList === targetId) return;
    buildProvisional(targetId, next);
    drag.announcement = `Item ${drag.key} moved to position ${next + 1} of ${len} in ${targetId}.`;
    notify();
  }

  /**
   * Keyboard cross-list move: shift the dragged item to the previous/next connected
   * list (kanban), inserting near the same index. `direction` is -1 (prev) or +1 (next).
   */
  function moveDragToList(direction) {
    if (!drag.active) return;
    const currentId = drag.targetList || drag.sourceList;
    const listPosition = drag.groupLists.indexOf(currentId);
    const nextId = drag.groupLists[listPosition + direction];
    if (!nextId || nextId === currentId) return;
    const list = lists.get(nextId);
    const order = list.keys.filter((candidateKey) => candidateKey !== drag.key);
    const index = clampForLocked(nextId, drag.key, clamp(drag.index, 0, order.length));
    buildProvisional(nextId, index);
    drag.announcement = `Item ${drag.key} moved to ${nextId}, position ${index + 1} of ${order.length + 1}.`;
    notify();
  }

  /** Build the provisional order(s) for a drop into `targetId` at `index` and stash drag fields. */
  function buildProvisional(targetId, index) {
    const provisionalOrders = new Map();
    const sourceListId = drag.sourceList;
    const sourceWithoutDragged = without(drag.preDrag.get(sourceListId), drag.key);
    if (targetId === sourceListId) {
      provisionalOrders.set(sourceListId, insertAt(sourceWithoutDragged, drag.key, index));
    } else {
      provisionalOrders.set(sourceListId, sourceWithoutDragged);
      provisionalOrders.set(targetId, insertAt(drag.preDrag.get(targetId), drag.key, index));
    }
    setProvisional(provisionalOrders, targetId, index, true);
  }

  function setProvisional(provisionalOrders, targetId, index, dropValid) {
    drag.provisional = provisionalOrders;
    drag.targetList = targetId;
    drag.index = index;
    drag.dropValid = dropValid;
    drag.offsets = {};
    for (const [id, provOrder] of provisionalOrders) {
      const list = lists.get(id);
      if (list) drag.offsets[id] = computeOffsets(drag.preDrag.get(id) || list.keys, drag.rectByKey, provOrder, list.orientation, drag.key);
    }
  }

  /** Commit the provisional order. Emits "changed" only when the order actually moved. */
  function drop() {
    if (!drag.active) return instance;
    stopAutoScroll();
    const committed = drag.dropValid && drag.provisional.size > 0;
    let payload = null;
    if (committed) {
      for (const [id, order] of drag.provisional) lists.get(id).keys = order.slice();
      const toList = drag.targetList;
      // Cross-list: carry the item's REGISTRATION (element, handle, flags) to the new
      // list so a later drag of it has geometry and the same element binding.
      if (toList !== drag.sourceList) {
        const sourceRecord = lists.get(drag.sourceList);
        const destinationRecord = lists.get(toList);
        const movedItem = sourceRecord && sourceRecord.items.get(drag.key);
        if (sourceRecord) sourceRecord.items.delete(drag.key);
        if (destinationRecord && !destinationRecord.items.has(drag.key)) {
          const carried = movedItem || { el: null, handleEl: null, disabled: false, locked: false };
          destinationRecord.items.set(drag.key, carried);
          // Re-bind the element's listeners against the DESTINATION list record:
          // the old binding's closures still pointed at the source list, so the
          // next drag of this item would consult stale registration state.
          if (carried.el) bindItem(destinationRecord, drag.key, carried);
        }
      }
      const toIndex = lists.get(toList).keys.indexOf(drag.key);
      const moved = toList !== drag.sourceList || toIndex !== drag.fromIndex;
      if (moved) payload = { key: drag.key, fromList: drag.sourceList, fromIndex: drag.fromIndex, toList, toIndex };
    }
    const endState = publicDrag();
    drag = idleDrag();
    // A direct drop() of an ACTIVE pointer drag (e.g. a consumer "drop on button"/Enter UX or a
    // programmatic commit, bypassing onSessionUp) must also release the live pointer session and
    // idle the recognizer — symmetric to cancel() (see its note below). onSessionUp already nulled
    // `session` and ran recognizer.pointerUp() before calling drop(), and a keyboard drop has no
    // session, so guarding on `session` makes this a no-op on those paths. Without it the window
    // pointer listeners (and any longPressTimer) leak past the drop, and the recognizer is stuck in
    // 'pan' — so the next stray pointermove hits onSessionMove's belt-and-suspenders branch and
    // RESURRECTS a fresh drag of the just-dropped key against the freshly-committed data.
    if (session) { endSession(false); recognizer.reset(); }
    if (payload) { emit('changed', payload); if (onChanged) onChanged(payload); }
    emit('dragend', { ...endState, committed: !!payload });
    notify();
    // Only a POINTER drag fires a synthetic click on release that we need to swallow. A
    // keyboard drop (Space/Enter) fires no such click, so arming the global capture-phase
    // click guard there would instead eat the user's next GENUINE click within 350ms.
    // Re-check liveness: a consumer callback fired above (onChanged / 'dragend' / 'change')
    // may have called destroy(), which already disposed any armed guard. Arming a fresh
    // window listener + timer here would leak past teardown (destroy() is idempotent and
    // would never run again to clean it up). Mirrors the destroyed-guards on emit()/notify().
    // Re-check liveness: a consumer callback fired above (onChanged / 'dragend' / 'change')
    // may have called destroy(), which already disposed any armed guard. Arming a fresh
    // window listener + timer here would leak past teardown (destroy() is idempotent and
    // would never run again to clean it up). Mirrors the destroyed-guards on emit()/notify().
    if (!destroyed && !endState.keyboard) armClickGuard(); // a real pointer drag should not also fire a click on release
    return instance;
  }

  /** Abort an active drag and revert to the pre-drag order. */
  function cancel() {
    // Tear down a pending pre-activation pointer session too: a pointerdown may have armed
    // a longPressTimer + window pointer listeners without a drag having activated yet
    // (drag.active === false). Mutators (unregisterList/unregisterItem/registerItem/setItems/
    // move) call cancel() when they remove the item out from under the press, so release that
    // session here as destroy() does — otherwise the timer + window listeners leak, closing
    // over the freed item until a later window pointerup self-heals them (which never comes if
    // the element was torn out of the DOM mid-press). endSession nulls `session` before it can
    // re-enter cancel() via its cancelled+drag.active branch, so this does not recurse.
    if (session && !drag.active) endSession(true);
    if (!drag.active) return instance;
    stopAutoScroll();
    const endState = publicDrag();
    drag = idleDrag();
    // A programmatic cancel() of an ACTIVE pointer drag must also release the live pointer
    // session and reset the recognizer. The recognizer is still in 'pan' mode (it was never
    // told the pointer lifted — unlike onSessionUp, which calls recognizer.pointerUp()), so a
    // stray pointermove would hit onSessionMove's belt-and-suspenders branch
    // (drag.active===false && recognizer.getMode()==='pan') and RESURRECT the just-cancelled
    // drag on the reverted/replaced data. Tear down with drag already idle so endSession(false)
    // cannot re-enter cancel() (its cancelled+drag.active branch is now dead).
    if (session) endSession(false);
    recognizer.reset();
    emit('cancel', endState);
    emit('dragend', { ...endState, committed: false, cancelled: true });
    notify();
    return instance;
  }

  /**
   * Programmatic one-shot reorder (no active drag): move `key` to `toListId` at
   * `toIndex`, emitting the same "changed" payload a drop would.
   * @param {string} key
   * @param {string} toListId
   * @param {number} toIndex
   */
  function move(key, toListId, toIndex) {
    if (destroyed) return instance;
    // toIndex is consumer-supplied and flows unguarded through clamp() (which does NOT
    // reject NaN) into Array.splice (which coerces a NaN start to 0). Without this guard
    // move(key, list, NaN) would silently splice the item to the front instead of a no-op.
    // Mirror the repo's finite-guard convention for consumer-supplied indices.
    if (!Number.isFinite(toIndex)) return instance;
    key = String(key);
    const src = findList(key);
    const dst = lists.get(String(toListId));
    if (!src || !dst) return instance;
    // Mirror setItems/unregisterItem/unregisterList: an active drag holds a pre-drag
    // snapshot (drag.preDrag) it rebuilds from on drop(). Mutating src/dst keys here would
    // leave that snapshot stale, so drop() would overwrite this move() with the old order —
    // and a move() touching the dragged key could even duplicate it across two lists.
    if (drag.active && (key === drag.key
      || drag.sourceList === src.id || drag.groupLists.includes(src.id)
      || drag.sourceList === dst.id || drag.groupLists.includes(dst.id))) cancel();
    // Moving the key re-binds its element's listeners against the destination record below,
    // so a pending session armed on it is stale — release its timer + window listeners.
    endSessionIfAffected((sessionKey) => sessionKey === key);
    const fromIndex = src.keys.indexOf(key);
    if (src === dst) {
      dst.keys = reorderWithin(src.keys, fromIndex, toIndex);
    } else {
      src.keys = without(src.keys, key);
      const item = src.items.get(key);
      src.items.delete(key);
      dst.keys = insertAt(dst.keys, key, toIndex);
      // Carry the item's REGISTRATION to the destination, mirroring the drag drop()
      // path: re-bind the element's listeners against the DESTINATION record so the
      // old source-bound closures (which consulted stale registration state for the
      // handle/predicate checks) are removed and replaced.
      if (!dst.items.has(key)) {
        const carried = item || { el: null, handleEl: null, disabled: false, locked: false };
        dst.items.set(key, carried);
        if (carried.el) bindItem(dst, key, carried);
      }
    }
    const newIndex = dst.keys.indexOf(key);
    if (src !== dst || newIndex !== fromIndex) {
      const payload = { key, fromList: src.id, fromIndex, toList: dst.id, toIndex: newIndex };
      emit('changed', payload);
      if (onChanged) onChanged(payload);
    }
    notify();
    return instance;
  }

  /** Re-read resting geometry mid-drag (e.g. after the consumer scrolled the page). */
  function refresh() {
    if (!drag.active) return instance;
    const rectByKey = new Map();
    for (const id of drag.groupLists) {
      const list = lists.get(id);
      if (!list) continue;
      for (const key of list.keys) { const item = list.items.get(key); const rect = item && getRect(item.el); if (rect) rectByKey.set(key, rect); }
    }
    drag.rectByKey = rectByKey;
    if (drag.pointer) moveDragTo(drag.pointer);
    return instance;
  }

  // ---- auto-scroll --------------------------------------------------------
  // The one place the engine touches a consumer element's behavior: when the pointer
  // nears a scroll container's edge, nudge its scroll each frame so off-screen targets
  // become reachable, then shift the captured rects by the delta so the drop math stays
  // correct against the new scroll offset (never against stale positions).

  function maybeAutoScroll(pointer, list) {
    if (!config.autoScroll || !list) { stopAutoScroll(); return; }
    const scrollEl = list.scrollEl;
    if (!scrollEl || typeof scrollEl.scrollTop !== 'number') { stopAutoScroll(); return; }
    const rect = getRect(scrollEl);
    if (!rect) { stopAutoScroll(); return; }
    const { edge, speed } = config.autoScroll;
    let stepX = 0, stepY = 0;
    if (list.orientation === Orientation.HORIZONTAL || list.orientation === Orientation.GRID) {
      if (pointer.x < rect.left + edge) stepX = -speed; else if (pointer.x > rect.right - edge) stepX = speed;
    }
    if (list.orientation === Orientation.VERTICAL || list.orientation === Orientation.GRID) {
      if (pointer.y < rect.top + edge) stepY = -speed; else if (pointer.y > rect.bottom - edge) stepY = speed;
    }
    if (stepX === 0 && stepY === 0) { stopAutoScroll(); return; }
    startAutoScroll(scrollEl, stepX, stepY);
  }

  function startAutoScroll(scrollEl, stepX, stepY) {
    if (!canUseAnimationFrame()) return;
    stopAutoScroll();
    const tick = () => {
      if (!drag.active) { autoScrollFrameId = 0; return; }
      const beforeTop = Number.isFinite(scrollEl.scrollTop) ? scrollEl.scrollTop : 0; // scrollTop may be non-finite on stubs/odd containers
      const beforeLeft = Number.isFinite(scrollEl.scrollLeft) ? scrollEl.scrollLeft : 0; // scrollLeft may be non-finite on stubs/odd containers
      scrollEl.scrollTop = beforeTop + stepY;
      if (stepX !== 0) scrollEl.scrollLeft = beforeLeft + stepX;
      const deltaY = (Number.isFinite(scrollEl.scrollTop) ? scrollEl.scrollTop : 0) - beforeTop;
      const deltaX = (Number.isFinite(scrollEl.scrollLeft) ? scrollEl.scrollLeft : 0) - beforeLeft;
      if (deltaX === 0 && deltaY === 0) {
        // The container cannot scroll any further: stop spinning frames. The next
        // pointer move re-arms the loop via maybeAutoScroll if still in the band.
        autoScrollFrameId = 0;
        return;
      }
      if (deltaX !== 0 || deltaY !== 0) {
        // Scrolling moved the items under the pointer: shift the captured rects so the
        // drop index recomputes against where the items ACTUALLY are now.
        for (const rect of drag.rectByKey.values()) { rect.left -= deltaX; rect.right -= deltaX; rect.top -= deltaY; rect.bottom -= deltaY; }
        if (drag.pointer) {
          const target = hitTestList(drag.groupLists, drag.pointer);
          if (target != null) {
            const list = lists.get(target);
            const { rects, subToFull } = candidateRects(target, drag.key);
            buildProvisional(target, clampForLocked(target, drag.key, subToFull[computeDropIndex(rects, drag.pointer, list.orientation)]));
            notify();
          }
        }
      }
      autoScrollFrameId = requestAnimationFrame(tick);
    };
    autoScrollFrameId = requestAnimationFrame(tick);
  }

  function stopAutoScroll() { if (autoScrollFrameId && canUseAnimationFrame()) cancelAnimationFrame(autoScrollFrameId); autoScrollFrameId = 0; }

  // ---- pointer binding (per item; reuses the gesture recognizer) ----------

  function bindItem(listRecord, key, item) {
    if (item.detach) item.detach();
    const handlers = [];
    if (canListen(item.el)) {
      const handlePointerDown = (e) => onItemPointerDown(e, listRecord, key, item);
      item.el.addEventListener('pointerdown', handlePointerDown);
      handlers.push(() => item.el.removeEventListener('pointerdown', handlePointerDown));
    }
    if (config.keyboard && canListen(item.el)) {
      const handleKeyDown = (e) => onItemKeyDown(e, listRecord, key, item);
      item.el.addEventListener('keydown', handleKeyDown);
      handlers.push(() => item.el.removeEventListener('keydown', handleKeyDown));
    }
    item.detach = handlers.length ? () => { for (const h of handlers) h(); item.detach = null; } : null;
  }

  function onItemPointerDown(e, listRecord, key, item) {
    if (drag.active || session) return;
    if (config.handle) { if (!item.handleEl || !(item.handleEl.contains && item.handleEl.contains(e.target))) return; }
    if (!canDrag(key, listRecord.id)) return;
    if (e.button != null && e.button !== 0) return; // primary button only

    const windowRef = ownerWindow(item.el);
    if (!windowRef) return;
    const isTouch = e.pointerType === 'touch';
    const sample = { id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp != null ? e.timeStamp : 0 };

    const handleMove = (ev) => onSessionMove(ev);
    const handleUp = (ev) => onSessionUp(ev);
    const handleCancel = () => endSession(true);
    windowRef.addEventListener('pointermove', handleMove, { passive: false });
    windowRef.addEventListener('pointerup', handleUp);
    windowRef.addEventListener('pointercancel', handleCancel);

    session = {
      key, windowRef, handleMove, handleUp, handleCancel,
      startX: e.clientX, startY: e.clientY, longPressTimer: 0,
      usingRecognizer: !isTouch || config.longPressDelay === 0,
    };

    if (session.usingRecognizer) {
      // Mouse / pen (or touch with no long-press): the recognizer decides when the
      // press is a drag (panstart at the threshold), separating it from a click.
      recognizer.reset();
      recognizer.pointerDown(sample);
    } else {
      // Touch with long-press: hold to activate so a drag does not hijack page scroll.
      session.longPressTimer = windowRef.setTimeout(() => {
        if (!session || drag.active) return;
        beginDrag(session.key, { pointer: { x: session.lastX != null ? session.lastX : session.startX, y: session.lastY != null ? session.lastY : session.startY } });
      }, config.longPressDelay);
    }
  }

  function onSessionMove(e) {
    if (!session) return;
    session.lastX = e.clientX; session.lastY = e.clientY;
    const pointer = { x: e.clientX, y: e.clientY };
    if (session.usingRecognizer) {
      recognizer.pointerMove({ id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp != null ? e.timeStamp : 0 });
      if (drag.active) { e.preventDefault(); moveDragTo(pointer); }
      else if (recognizer.getMode() === 'pan') beginDrag(session.key, { pointer }); // belt-and-suspenders if panstart was missed
    } else if (drag.active) {
      e.preventDefault();
      moveDragTo(pointer);
    } else {
      // Before long-press fires: a real scroll move cancels the pending drag.
      const moved = Math.hypot(e.clientX - session.startX, e.clientY - session.startY);
      if (moved > Math.max(config.threshold, 10)) endSession(false);
    }
  }

  function onSessionUp(e) {
    if (!session) return;
    if (session.usingRecognizer) recognizer.pointerUp({ id: e.pointerId, x: e.clientX, y: e.clientY, time: e.timeStamp != null ? e.timeStamp : 0 });
    const wasDragging = drag.active;
    endSession(false);
    if (wasDragging) drop();
  }

  function endSession(cancelled) {
    if (!session) return;
    const endedSession = session; session = null;
    if (endedSession.longPressTimer) endedSession.windowRef.clearTimeout(endedSession.longPressTimer);
    endedSession.windowRef.removeEventListener('pointermove', endedSession.handleMove);
    endedSession.windowRef.removeEventListener('pointerup', endedSession.handleUp);
    endedSession.windowRef.removeEventListener('pointercancel', endedSession.handleCancel);
    if (cancelled && drag.active) cancel();
  }

  /**
   * Release a pending pre-activation pointer session whose item is being mutated out from
   * under it. A pointerdown can arm a longPressTimer + window listeners on session.key with
   * no drag yet active; if the consumer then unregisters/replaces/moves that key, those would
   * otherwise linger (the armed timer wakes against a now-unregistered key, the window
   * listeners close over the freed item). When a drag IS active the mutators already cancel()
   * (which now tears the session down too), so this only handles the pre-activation window.
   * @param {(key:string) => boolean} affects
   */
  function endSessionIfAffected(affects) {
    if (session && !drag.active && affects(session.key)) endSession(true);
  }

  /** Suppress the click that a browser fires after a drag-release, so a drag is not also a click. */
  function armClickGuard() {
    const windowRef = typeof window !== 'undefined' ? window : null;
    if (!windowRef || typeof windowRef.addEventListener !== 'function') return;
    // Dispose any still-armed guard from a prior drop before arming a new one.
    if (clickGuardDispose) clickGuardDispose();
    let timerId = 0;
    const dispose = () => {
      clickGuardDispose = null;
      windowRef.removeEventListener('click', guard, true);
      if (timerId && typeof windowRef.clearTimeout === 'function') windowRef.clearTimeout(timerId);
    };
    const guard = (ev) => { ev.stopPropagation(); ev.preventDefault(); dispose(); };
    clickGuardDispose = dispose;
    windowRef.addEventListener('click', guard, true);
    // Self-clear if no click arrives (e.g. keyboard / touch with no synthetic click).
    if (typeof windowRef.setTimeout === 'function') timerId = windowRef.setTimeout(dispose, 350);
  }

  // ---- keyboard binding ---------------------------------------------------

  function onItemKeyDown(e, listRecord, key, item) {
    if (!config.keyboard) return;
    const pressedKey = e.key;
    if (!drag.active) {
      if ((pressedKey === ' ' || pressedKey === 'Spacebar' || pressedKey === 'Enter') && canDrag(key, listRecord.id)) {
        e.preventDefault();
        beginDrag(key, { keyboard: true });
      }
      return;
    }
    // A drag is active (this item is the grabbed one).
    if (drag.key !== key) return;
    const horizontal = listRecord.orientation === Orientation.HORIZONTAL;
    if (pressedKey === ' ' || pressedKey === 'Spacebar' || pressedKey === 'Enter') { e.preventDefault(); drop(); return; }
    if (pressedKey === 'Escape' || pressedKey === 'Esc') { e.preventDefault(); cancel(); return; }
    const primaryNext = horizontal ? 'ArrowRight' : 'ArrowDown';
    const primaryPrev = horizontal ? 'ArrowLeft' : 'ArrowUp';
    const crossNext = horizontal ? 'ArrowDown' : 'ArrowRight';
    const crossPrev = horizontal ? 'ArrowUp' : 'ArrowLeft';
    if (pressedKey === primaryNext) { e.preventDefault(); moveDragBy(1); }
    else if (pressedKey === primaryPrev) { e.preventDefault(); moveDragBy(-1); }
    else if (pressedKey === crossNext) { e.preventDefault(); moveDragToList(1); }
    else if (pressedKey === crossPrev) { e.preventDefault(); moveDragToList(-1); }
  }

  // ---- runtime config setters ---------------------------------------------

  function setOptions(patch = {}) {
    if (destroyed) return instance;
    const previousThreshold = config.threshold;
    const previousKeyboard = config.keyboard;
    config = buildConfig({ ...optionsView(), ...patch });
    // The desktop drag-activation threshold lives in the gesture recognizer's closed-over
    // settings (captured once at construction); rebuild it so a changed threshold actually
    // takes effect and the snapshot does not advertise a value the recognizer never uses.
    // Skip mid-drag (the recognizer is mid-session); the next pointerdown uses the new one.
    if (config.threshold !== previousThreshold && !drag.active && !session) buildRecognizer();
    // bindItem only attaches the keydown listener when keyboard is true AT BIND TIME, so
    // toggling keyboard off→on must rebind already-registered items (the runtime guard in
    // onItemKeyDown handles on→off). Rebind every item that has an element.
    if (config.keyboard !== previousKeyboard) {
      for (const listRecord of lists.values()) for (const [key, item] of listRecord.items) if (item.el) bindItem(listRecord, key, item);
    }
    notify();
    return instance;
  }
  function optionsView() {
    return {
      orientation: config.orientation, group: config.group, handle: config.handle,
      threshold: config.threshold, longPressDelay: config.longPressDelay, keyboard: config.keyboard,
      disabled: config.disabled, autoScroll: config.autoScroll,
    };
  }
  function setOrientation(arg1, arg2) {
    if (destroyed) return instance;
    // Throw on an unknown orientation rather than silently keeping the prior axis, matching the
    // repo's throw-on-unknown-enum convention (selection-engine's setIntersectMode, transform2d's
    // validateFitMode). A typo'd axis is a programming error, not a no-op.
    if (arg2 === undefined) {
      if (!isOrientation(arg1)) throw new TypeError(`unknown orientation "${arg1}"`);
      config.orientation = arg1;
    } else {
      if (!isOrientation(arg2)) throw new TypeError(`unknown orientation "${arg2}"`);
      const listRecord = lists.get(String(arg1));
      if (listRecord) listRecord.orientation = arg2;
    }
    notify();
    return instance;
  }
  function setGroup(listId, group) {
    if (destroyed) return instance;
    const listRecord = lists.get(String(listId));
    if (listRecord) listRecord.group = group;
    notify();
    return instance;
  }
  function setDisabled(predicateOrFlag) {
    if (destroyed) return instance;
    config.disabled = typeof predicateOrFlag === 'function' ? predicateOrFlag : (predicateOrFlag === true ? () => true : null);
    notify();
    return instance;
  }

  // ---- state emission -----------------------------------------------------

  function publicDrag() {
    return {
      active: drag.active, key: drag.key, sourceList: drag.sourceList, fromIndex: drag.fromIndex,
      targetList: drag.targetList, index: drag.index, keyboard: drag.keyboard, grabbed: drag.grabbed,
      dropValid: drag.dropValid,
      pointer: drag.pointer ? { ...drag.pointer } : null,
      grabOffset: drag.grabOffset ? { ...drag.grabOffset } : null,
      position: drag.position ? { ...drag.position } : null,
      announcement: drag.announcement,
      offsets: drag.offsets,
    };
  }

  /** A list's CURRENT order: provisional while dragging, committed otherwise. */
  function currentOrder(listRecord) {
    if (drag.active && drag.provisional.has(listRecord.id)) return drag.provisional.get(listRecord.id).slice();
    return listRecord.keys.slice();
  }

  function buildState() {
    const out = [];
    for (const listRecord of lists.values()) {
      out.push({ id: listRecord.id, items: currentOrder(listRecord), orientation: listRecord.orientation, group: listRecord.group });
    }
    return { lists: out, drag: publicDrag(), config: configSnapshot() };
  }

  function notify() {
    if (destroyed) return;
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }
  const emit = (type, payload) => { if (!destroyed) emitter.emit(type, payload); };

  // Coalesce a burst of synchronous registrations into one emit (so registering a list
  // with N items does not fire N change events). Falls back to sync if no microtask.
  let notifyQueued = false;
  function queueNotify() {
    if (destroyed || notifyQueued) return;
    notifyQueued = true;
    const flush = () => { notifyQueued = false; notify(); };
    if (typeof queueMicrotask === 'function') queueMicrotask(flush); else flush();
  }

  // ---- subscription / reads -----------------------------------------------

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }
  /** Subscribe to a named event: 'change' | 'changed' | 'dragstart' | 'dragend' | 'cancel'. */
  function on(type, callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on(type, callback);
  }
  function getState() { return buildState(); }

  // ---- lifecycle ----------------------------------------------------------

  function destroy() {
    if (destroyed) return;
    if (drag.active) { stopAutoScroll(); drag = idleDrag(); }
    if (session) endSession(true);
    if (clickGuardDispose) clickGuardDispose(); // remove any armed post-drag click guard + its timer
    stopAutoScroll();
    for (const listRecord of lists.values()) for (const [, item] of listRecord.items) if (item.detach) item.detach();
    lists.clear();
    recognizer.reset();
    destroyed = true;
    emitter.clear();
  }

  const instance = {
    // registration
    registerList, unregisterList, registerItem, unregisterItem, setItems, getItems,
    // input-agnostic drag controller (used by the bindings and drivable in tests)
    beginDrag, moveDragTo, moveDragBy, moveDragToList, drop, cancel, refresh,
    // programmatic
    move,
    // config
    setOptions, setOrientation, setGroup, setDisabled,
    // state
    subscribe, on, getState,
    // lifecycle
    destroy,
  };

  // Emit the initial state once after construction — deferred a microtask so a
  // synchronous subscribe() right after creation still receives it (as the other
  // engines do).
  queueMicrotask(() => { if (!destroyed && !notifyQueued) notify(); });

  return instance;
}
