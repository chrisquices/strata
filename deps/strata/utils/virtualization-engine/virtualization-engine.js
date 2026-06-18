// virtualization-engine.js
// A headless vertical virtualization engine.
//
// The engine renders no content and creates no DOM of its own. It owns the
// scroll container (to read scroll/size and attach listeners), computes
// geometry through a pluggable layout strategy, and reports which items are
// visible. The consumer owns and styles every element.
//
// Exports: { VirtualizationEngine, gridLayout, listLayout }

/**
 * @typedef {Object} Rect
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} VirtualItem
 * @property {number} index
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * A layout strategy is a plain object implementing this contract:
 *   measure(containerWidth, itemCount) -> void
 *   getTotalSize() -> number
 *   getRange(scrollTop, viewportHeight, overscan) -> [start, endExclusive]
 *   getRect(index) -> Rect
 *   getInfo() -> object
 * @typedef {Object} Layout
 */

const REM_IN_PX = 16;
const TAILWIND_SPACING_IN_PX = 4;

/** Resolve engine lengths to pixels. Numbers are already pixels; rem and the
 * standard Tailwind gap scale intentionally use their conventional defaults. */
function resolveLength(value, name, allowGapClass = false) {
  if (typeof value === 'number') return value;
  if (value == null) return NaN;
  if (typeof value !== 'string') throw new TypeError(`${name} must be a number or CSS length`);

  const input = value.trim();
  const cssLength = input.match(/^(\d+(?:\.\d+)?|\.\d+)(px|rem)$/);
  if (cssLength) {
    const amount = Number(cssLength[1]);
    return cssLength[2] === 'rem' ? amount * REM_IN_PX : amount;
  }

  if (allowGapClass) {
    const tailwindGap = input.match(/^gap-(px|\d+(?:\.\d+)?|\.\d+)$/);
    if (tailwindGap) {
      return tailwindGap[1] === 'px' ? 1 : Number(tailwindGap[1]) * TAILWIND_SPACING_IN_PX;
    }
  }

  throw new TypeError(`Unsupported ${name}: ${value}`);
}

/**
 * The windowing core. Layout-agnostic: it knows nothing about grids or lists,
 * only how to drive a Layout and report visible items.
 */
export class VirtualizationEngine {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.scrollElement  overflow:auto/scroll container
   * @param {number} options.count               total number of items
   * @param {Layout|(()=>Layout)} options.layout a layout strategy object or factory
   * @param {number} [options.overscan=2]        extra rows rendered each side
   * @param {(state:Object) => void} [options.onChange] fired whenever the visible set or geometry changes
   */
  constructor({ scrollElement, count, layout, overscan = 2, onChange }) {
    this.scrollElement = scrollElement;
    // Finite-integer guard: count flows into measure()/getTotalSize() and the
    // spacer size. `count || 0` (the old idiom) passes Infinity through, sizing
    // the spacer to Infinity px; reject NaN/Infinity/<=0, keep prior state of 0.
    this.count = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
    this.layout = typeof layout === 'function' ? layout() : layout;
    // Finite-integer guard: overscan is a loop-bound term in every layout's
    // getRange. Infinity renders ALL items (defeating virtualization), NaN
    // renders none (Math.max/min do not reject NaN). Sanitize to a small
    // non-negative integer, mirroring the media-engine `preload` fix; an absurd
    // finite value is capped so it cannot materialize an unbounded window.
    this.overscan = Number.isFinite(overscan) && overscan >= 0 ? Math.min(Math.floor(overscan), 1024) : 2;
    this.onChange = onChange;

    /** @type {VirtualItem[]} */
    this._virtualItems = [];
    this._firstVisibleIndex = 0; // first item actually in the viewport (no overscan);
    //                              also the anchor kept stable across relayouts
    this._scrollTop = 0;
    this._measured = false;
    this._animationFrameId = null;
    this._destroyed = false;
    // Monotonic update token. Bumped on every _update entry so the deferred
    // anchored scrollTop write can detect a nested _update (a mutating
    // setCount/setLayout/refresh/scrollToIndex called re-entrantly from inside
    // onChange) that superseded this update's geometry, and suppress its now-stale
    // write — mirroring the _destroyed re-check for the destroy()-in-onChange case.
    this._updateSeq = 0;

    // Scroll: cheap, coalesced to one update per frame. No relayout/anchoring.
    this._handleScroll = this._handleScroll.bind(this);
    this.scrollElement.addEventListener('scroll', this._handleScroll, { passive: true });

    // Resize the container -> relayout with anchoring. Observe the container
    // ONLY (never items or anything our writes mutate) to avoid feedback loops.
    // Capability-guarded so the engine can be constructed in hosts without
    // ResizeObserver (resize tracking is simply absent there).
    this._resizeObserver =
      typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.refresh()) : null;
    if (this._resizeObserver) this._resizeObserver.observe(this.scrollElement);

    this._update(false);
  }

  // ---- Public API ---------------------------------------------------------

  /** @returns {VirtualItem[]} every currently visible item (including overscan) */
  getVirtualItems() {
    return this._virtualItems;
  }

  /**
   * @returns {number} total scrollable content height in px (the consumer sizes
   * a spacer to this so the scrollbar length is correct).
   *
   * Element-height ceiling: browsers cap a rendered element's height (~33.5M px
   * at devicePixelRatio 1, ~16.7M at dpr 2). If this value exceeds that cap, the
   * spacer's scrollHeight is clamped and rows below the cap become unreachable —
   * scrollToIndex() and anchoring to those items land at the cap rather than the
   * true position. As a rough guide that is ~700k–1.4M items at the demo's
   * ~170px row height (fewer with taller rows or fewer columns); beyond it,
   * positions lose accuracy. This is intentional per the spec ("do not engineer
   * around the browser's max element-height limit") — keep counts within the cap
   * for exact positioning. Failure is graceful (no throw/NaN), just clamped.
   */
  getTotalSize() {
    return this.layout.getTotalSize();
  }

  /** @returns {object} current layout geometry and engine state */
  getStats() {
    const { name: layoutName, ...layout } = this.layout.getInfo();
    return {
      layoutName,
      ...layout,
      total: this.count,
      visibleCount: this._virtualItems.length,
      firstIndex: this._firstVisibleIndex,
      scrollTop: this._scrollTop,
    };
  }

  /** Set scrollTop so that `index` is in view (top-aligned). */
  scrollToIndex(index) {
    if (this._destroyed) return; // never write scrollTop on a torn-down instance
    if (this.count === 0) return;
    if (!Number.isFinite(index)) return; // never write NaN into scrollTop
    // Floor before clamping, mirroring count/overscan/setCount. A fractional
    // index would otherwise land between rows (not top-aligned) for list
    // layouts and produce undefined-bearing rects / off-by-a-row scrolls for
    // grid layouts, where column = index % columns leaves a non-integer column.
    const clampedIndex = Math.max(0, Math.min(Math.floor(index), this.count - 1));
    const rect = this.layout.getRect(clampedIndex);
    // Finite-guard the clientHeight DOM read exactly as _update does at intake
    // (line ~232): a non-finite clientHeight (detached/zero-layout element, or a
    // host stub) makes `getTotalSize() - clientHeight` NaN, and Math.max/min do
    // NOT reject NaN — so maxScroll and the scrollTop write would both be NaN,
    // violating the line-149 "never write NaN into scrollTop" contract.
    const viewportHeight = Number.isFinite(this.scrollElement.clientHeight) ? this.scrollElement.clientHeight : 0;
    const maxScroll = Math.max(0, this.layout.getTotalSize() - viewportHeight);
    this.scrollElement.scrollTop = Math.max(0, Math.min(rect.y, maxScroll));
    this._update(false);
  }

  /** Update the item count and recompute. */
  setCount(newCount) {
    // Same finite-integer guard as the constructor: never let Infinity/NaN
    // reach measure()/getTotalSize() and poison the spacer size.
    this.count = Number.isFinite(newCount) && newCount > 0 ? Math.floor(newCount) : 0;
    this._update(true);
  }

  /** Swap the layout strategy and recompute (anchored). */
  setLayout(layout) {
    this.layout = typeof layout === 'function' ? layout() : layout;
    this._update(true);
  }

  /** Force a remeasure + recompute (anchored). */
  refresh() {
    this._update(true);
  }

  /** Detach the scroll listener and disconnect the ResizeObserver. */
  destroy() {
    this._destroyed = true;
    this.scrollElement.removeEventListener('scroll', this._handleScroll);
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._animationFrameId !== null) cancelAnimationFrame(this._animationFrameId);
    this._animationFrameId = null;
  }

  // ---- Internals ----------------------------------------------------------

  _handleScroll() {
    // Minimal inline rAF coalescing: collapse a burst of scroll events into
    // one update per frame. No throttle/debounce dependency.
    if (this._animationFrameId !== null) return;
    this._animationFrameId = requestAnimationFrame(() => {
      this._animationFrameId = null;
      this._update(false);
    });
  }

  /**
   * The single update path, shared by scroll, resize, and the setters.
   * @param {boolean} anchor when true, keep the previously first-visible item stable
   */
  _update(anchor) {
    // No-op after teardown. Covers every entry point — the public setters
    // (refresh/setCount/setLayout/scrollToIndex) and the rAF scroll callback —
    // so a consumer touching the engine post-destroy never re-measures, fires
    // onChange, or writes scrollTop on a freed instance.
    if (this._destroyed) return;
    const element = this.scrollElement;

    // Stamp this update. If onChange re-enters with a mutating call, the nested
    // _update bumps the counter; on resume `this._updateSeq !== mySeq` tells us a
    // newer update already rebuilt the window AND wrote scrollTop for the new
    // geometry, so the deferred anchored write below would park the element at a
    // stale target (e.g. past the end of now-shorter content) and desync _scrollTop.
    const mySeq = ++this._updateSeq;

    // READ all geometry up front (read-then-write; never interleave).
    // Finite-guard every scroll-container read at intake, mirroring
    // selection-engine's autoScrollTick: a non-finite DOM value (Infinity/NaN
    // clientWidth/scrollTop/clientHeight) otherwise flows unchecked into
    // measure() -> new Array(columns) (Infinity throws RangeError 'Invalid array
    // length', crashing this and every subsequent update), into the getRange
    // loop bounds and the anchoring math (Math.max/min/floor do NOT reject
    // NaN/Infinity), and is persisted into _scrollTop (surfaced by getStats).
    // Sanitize to 0 so the prior-state-of-0 contract holds.
    const containerWidth = Number.isFinite(element.clientWidth) ? element.clientWidth : 0;
    const scrollTop = Number.isFinite(element.scrollTop) ? element.scrollTop : 0;
    const viewportHeight = Number.isFinite(element.clientHeight) ? element.clientHeight : 0;

    // Capture the anchor index from the *previous* geometry, before measuring.
    const anchorIndex = anchor && this._measured ? this._firstVisibleIndex : -1;

    // MEASURE for the current container width and count.
    this.layout.measure(containerWidth, this.count);
    this._measured = true;

    // ANCHOR: compute the scrollTop that pins the previously first-visible item
    // to the top so the viewport stays roughly stable across the relayout.
    // The scrollTop *write* is deferred until after onChange: the consumer sizes
    // its spacer to the new getTotalSize() inside onChange, and the browser
    // clamps scrollTop against the current scrollHeight — so writing before the
    // spacer grows would clip the target against stale, shorter content.
    let targetScrollTop = scrollTop;
    if (anchorIndex >= 0 && this.count > 0) {
      const clampedAnchorIndex = Math.min(anchorIndex, this.count - 1);
      const anchorRect = this.layout.getRect(clampedAnchorIndex);
      const maxScroll = Math.max(0, this.layout.getTotalSize() - viewportHeight);
      targetScrollTop = Math.max(0, Math.min(anchorRect.y, maxScroll));
    }

    // Assemble the visible virtual-item list for the target scroll position.
    this._buildVirtualItems(targetScrollTop, viewportHeight);

    if (this.onChange) {
      this.onChange({
        virtualItems: this._virtualItems,
        totalSize: this.layout.getTotalSize(),
        stats: this.getStats(),
      });
    }

    // Deferred anchored write: the spacer now reflects the new total height, so
    // applying the anchored scrollTop is no longer clamped against stale content.
    // Re-check teardown: onChange ran after the line-218 guard, so a consumer that
    // calls destroy() from inside onChange (a common "tear down when the visible
    // set reaches some state" pattern) must suppress this write — otherwise we'd
    // write scrollTop on a just-freed instance whose listener/observer are gone.
    if (!this._destroyed && this._updateSeq === mySeq && targetScrollTop !== scrollTop)
      element.scrollTop = targetScrollTop;
  }

  _buildVirtualItems(scrollTop, viewportHeight) {
    const virtualItems = [];
    let firstVisibleIndex = 0;

    if (this.count > 0) {
      const [start, end] = this.layout.getRange(scrollTop, viewportHeight, this.overscan);
      for (let i = start; i < end; i++) {
        const rect = this.layout.getRect(i);
        virtualItems.push({ index: i, x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      }
      // First item actually in the viewport (no overscan) — the anchor.
      firstVisibleIndex = this.layout.getRange(scrollTop, viewportHeight, 0)[0];
    }

    this._virtualItems = virtualItems;
    this._firstVisibleIndex = firstVisibleIndex;
    this._scrollTop = scrollTop;
  }
}

/**
 * Responsive uniform grid. Column count steps; item width is continuous and
 * stretches up from `minItemWidth` so the grid is always flush edge-to-edge.
 *
 * @param {Object} options
 * @param {number|string} options.minItemWidth  minimum item width; columns derive from it
 * @param {number} options.aspectRatio   width / height for a cell
 * @param {number|string} options.gap    space between items, both axes
 * @returns {Layout}
 */
export function gridLayout({ minItemWidth, aspectRatio, gap }) {
  // Finite-guard the numeric config (the Number.isFinite(...) && ...>0 form
  // rejects NaN, Infinity, and <=0). An unguarded non-finite gap/minItemWidth/
  // aspectRatio poisons rowHeight -> totalSize -> the getRange loop bounds and
  // every getRect, all permanently NaN/Infinity. minItemWidth must be > 0 (it
  // divides into the column count); gap is a non-negative spacing; aspectRatio
  // must be finite & > 0 (it divides into itemHeight). Note that even a finite
  // ratio can be small enough that itemWidth/ratio overflows to Infinity, so
  // the derived itemHeight is finite-guarded at the division site below.
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const resolvedMinItemWidth = resolveLength(minItemWidth, 'minItemWidth');
  const resolvedGap = resolveLength(gap, 'gap', true);
  const minW = Number.isFinite(resolvedMinItemWidth) && resolvedMinItemWidth > 0 ? resolvedMinItemWidth : 1;
  const g = Number.isFinite(resolvedGap) && resolvedGap >= 0 ? resolvedGap : 0;

  let containerWidth = 0;
  let itemCount = 0;
  let columns = 1;
  let itemWidth = 0;
  let itemHeight = 0;
  let rowHeight = 0;
  let rowCount = 0;
  let totalSize = 0;
  /** @type {number[]} */ let columnLeftEdges = [0, 0];
  /** @type {number[]} */ let columnWidths = [0];

  return {
    measure(newContainerWidth, newItemCount) {
      containerWidth = newContainerWidth;
      itemCount = newItemCount;

      // columns = max(1, floor((containerWidth + g) / (minW + g)))
      columns =
        containerWidth > 0 && minW + g > 0
          ? Math.max(1, Math.floor((containerWidth + g) / (minW + g)))
          : 1;

      // itemWidth = (containerWidth - (columns - 1) * g) / columns   (float, for layout)
      itemWidth = containerWidth > 0 ? (containerWidth - (columns - 1) * g) / columns : 0;
      if (itemWidth < 0) itemWidth = 0;
      const h = Math.round(itemWidth / ratio);
      itemHeight = Number.isFinite(h) ? h : 0;
      rowHeight = itemHeight + g;
      rowCount = itemCount > 0 ? Math.ceil(itemCount / columns) : 0;
      totalSize = Math.max(0, rowCount * rowHeight - g);

      // Seam-free integer placement: rounded column left-edges and integer
      // widths that tile the row exactly; the last column absorbs the remainder.
      columnLeftEdges = new Array(columns + 1);
      for (let column = 0; column < columns; column++) {
        columnLeftEdges[column] = Math.round(column * (itemWidth + g));
      }
      columnLeftEdges[columns] = containerWidth + g; // sentinel for the right edge
      columnWidths = new Array(columns);
      for (let column = 0; column < columns; column++) {
        columnWidths[column] = columnLeftEdges[column + 1] - columnLeftEdges[column] - g;
      }
    },

    getTotalSize() {
      return totalSize;
    },

    getRange(scrollTop, viewportHeight, overscan) {
      if (itemCount === 0 || rowHeight <= 0) return [0, 0];
      const firstRow = Math.floor(scrollTop / rowHeight);
      const lastRow = Math.floor((scrollTop + viewportHeight) / rowHeight);
      const start = Math.max(0, (firstRow - overscan) * columns);
      const end = Math.min(itemCount, (lastRow + overscan + 1) * columns);
      return [start, end];
    },

    getRect(index) {
      const column = index % columns;
      const row = Math.floor(index / columns);
      return {
        x: columnLeftEdges[column],
        y: row * rowHeight,
        width: columnWidths[column],
        height: itemHeight,
      };
    },

    getInfo() {
      return { name: 'grid', columns, itemWidth, itemHeight, rowCount };
    },
  };
}

/**
 * The 1-column degenerate case: full-width rows of fixed height. Included to
 * prove the windowing core is genuinely layout-agnostic.
 *
 * @param {Object} options
 * @param {number|string} options.itemHeight fixed row height
 * @param {number|string} options.gap        vertical space between rows
 * @returns {Layout}
 */
export function listLayout({ itemHeight, gap }) {
  // Finite-guard the numeric config (the !(x>0) / x>=0 forms reject NaN). An
  // unguarded NaN itemHeight/gap poisons rowHeight -> totalSize and the getRange
  // loop bounds permanently. itemHeight must be > 0; gap is non-negative spacing.
  const resolvedItemHeight = resolveLength(itemHeight, 'itemHeight');
  const resolvedGap = resolveLength(gap, 'gap', true);
  const ih = Number.isFinite(resolvedItemHeight) && resolvedItemHeight > 0 ? resolvedItemHeight : 1;
  const g = Number.isFinite(resolvedGap) && resolvedGap >= 0 ? resolvedGap : 0;

  let containerWidth = 0;
  let itemCount = 0;
  let rowHeight = ih + g;
  let totalSize = 0;

  return {
    measure(newContainerWidth, newItemCount) {
      containerWidth = newContainerWidth;
      itemCount = newItemCount;
      rowHeight = ih + g;
      totalSize = Math.max(0, itemCount * rowHeight - g);
    },

    getTotalSize() {
      return totalSize;
    },

    getRange(scrollTop, viewportHeight, overscan) {
      if (itemCount === 0 || rowHeight <= 0) return [0, 0];
      const firstRow = Math.floor(scrollTop / rowHeight);
      const lastRow = Math.floor((scrollTop + viewportHeight) / rowHeight);
      const start = Math.max(0, firstRow - overscan); // columns = 1
      const end = Math.min(itemCount, lastRow + overscan + 1);
      return [start, end];
    },

    getRect(index) {
      return { x: 0, y: index * rowHeight, width: containerWidth, height: ih };
    },

    getInfo() {
      return { name: 'list', columns: 1, itemWidth: containerWidth, itemHeight: ih, rowCount: itemCount };
    },
  };
}

// Future option (intentionally not built here): a justified / Flickr-style row
// layout needs per-item aspect ratios and sequential packing, which is outside
// this engine's container-derived grid/list geometry.
