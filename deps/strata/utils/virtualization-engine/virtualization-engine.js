// Headless vertical virtualization. Consumers own all rendered elements while
// the engine measures the scroll container and calculates visible item geometry.

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
 *   getRange(scrollTop, viewportHeight, overscan) -> [start, endExclusive, firstVisible]
 *   getRect(index) -> Rect
 *   getInfo() -> { name: string, ...extra }   // `name` is required
 * @typedef {Object} Layout
 */

const REM_IN_PX = 16;
const TAILWIND_SPACING_IN_PX = 4;
const REQUIRED_LAYOUT_METHODS = ['measure', 'getTotalSize', 'getRange', 'getRect', 'getInfo'];
// Idle window after the last scroll event before isScrolling resets to false.
const SCROLL_IDLE_MS = 150;

function resolveLayout(layout) {
    const resolvedLayout = typeof layout === 'function' ? layout() : layout;
    if (!resolvedLayout || REQUIRED_LAYOUT_METHODS.some((method) => typeof resolvedLayout[method] !== 'function')) {
        throw new TypeError(`layout must implement ${REQUIRED_LAYOUT_METHODS.join(', ')}`);
    }
    return resolvedLayout;
}

function normalizeItemCount(value) {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const count = Math.floor(value);
    return Number.isSafeInteger(count) ? count : 0;
}

/**
 * Resolve engine lengths to pixels. Numbers are pixels; rem and Tailwind gap
 * classes use their conventional default scales.
 */
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
 * Resolve a required positive length, throwing on a missing/non-positive value
 * so a bad dimension surfaces immediately instead of silently becoming 1px.
 */
function resolveRequiredLength(value, name, allowGapClass = false) {
    const resolved = resolveLength(value, name, allowGapClass);
    if (!Number.isFinite(resolved) || resolved <= 0) {
        throw new RangeError(`${name} must resolve to a positive number`);
    }
    return resolved;
}

/**
 * Layout-agnostic windowing core.
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
    constructor({scrollElement, count, layout, overscan = 2, onChange}) {
        if (
            !scrollElement ||
            typeof scrollElement.addEventListener !== 'function' ||
            typeof scrollElement.removeEventListener !== 'function'
        ) {
            throw new TypeError('scrollElement must support addEventListener and removeEventListener');
        }

        this.scrollElement = scrollElement;
        // Normalize loop bounds and spacer geometry to a non-negative integer.
        this.count = normalizeItemCount(count);
        this.layout = resolveLayout(layout);
        // Bound overscan so invalid or extreme values cannot defeat virtualization.
        // Surface clearly-invalid input rather than silently swapping the default in.
        if (Number.isFinite(overscan) && overscan >= 0) {
            this.overscan = Math.min(Math.floor(overscan), 1024);
        } else {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
                console.warn('VirtualizationEngine: invalid overscan', overscan, '— using default 2');
            }
            this.overscan = 2;
        }
        this.onChange = onChange;

        /** @type {VirtualItem[]} */
        this._virtualItems = [];
        // First item in the viewport, excluding overscan; used as the relayout anchor.
        this._firstVisibleIndex = 0;
        this._scrollTop = 0;
        this._measured = false;
        this._animationFrameId = null;
        this._destroyed = false;
        // Prevent an outer update from applying stale scroll state after onChange
        // triggers a nested update.
        this._updateSeq = 0;

        // Whether a scroll gesture is in progress; reset SCROLL_IDLE_MS after the
        // last scroll event. Exposed to consumers so they can defer expensive work
        // (e.g. full-res decode) while scrolling.
        this.isScrolling = false;
        this._scrollIdleTimer = null;
        // One-shot flag: the next scroll event is the browser echoing our own
        // programmatic scrollTop write, not a user gesture.
        this._selfScroll = false;

        // Memo of the last published window so a plain scroll that does not move
        // the visible set skips the rebuild + onChange entirely.
        this._pStart = -1;
        this._pEnd = -1;
        this._pFirst = -1;
        this._pTotal = -1;
        this._pScrolling = false;

        // Last container width fed to measure(); resize ticks that do not change
        // width (height-only changes, the observer's redundant initial delivery)
        // need no relayout because measure() depends only on width.
        this._lastWidth = -1;
        this._resizeFrameId = null;

        // Scroll updates are coalesced to one per animation frame.
        this._handleScroll = this._handleScroll.bind(this);
        this._handleScrollIdle = this._handleScrollIdle.bind(this);
        this._handleResize = this._handleResize.bind(this);

        // Resize tracking is optional in hosts without ResizeObserver; the observer
        // is created in the try block below. We observe only the scroll container,
        // never the spacer/content the consumer resizes in onChange, so spacer
        // writes don't retrigger the observer (RO -> refresh -> onChange -> resize
        // feedback loop).
        this._resizeObserver = null;

        // Construction failures must release resources because no instance is
        // returned for the consumer to destroy.
        try {
            this.scrollElement.addEventListener('scroll', this._handleScroll, {passive: true});
            this._resizeObserver =
                typeof ResizeObserver === 'function' ? new ResizeObserver(this._handleResize) : null;
            if (this._resizeObserver) this._resizeObserver.observe(this.scrollElement);
            this._update(false);
        } catch (error) {
            this.destroy();
            throw error;
        }
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
     * Browsers clamp extremely tall elements. Content beyond that platform limit
     * is unreachable; this engine does not compensate for it.
     */
    getTotalSize() {
        return this.layout.getTotalSize();
    }

    /** @returns {object} current layout geometry and engine state */
    getStats() {
        const {name: layoutName = 'unknown', ...layout} = this.layout.getInfo();
        return {
            layoutName,
            ...layout,
            total: this.count,
            visibleCount: this._virtualItems.length,
            firstIndex: this._firstVisibleIndex,
            scrollTop: this._scrollTop,
            isScrolling: this.isScrolling,
        };
    }

    /**
     * Set scrollTop so that `index` is positioned per `align` within the viewport.
     * @param {number} index
     * @param {{align?: 'start'|'center'|'end'|'auto'}} [options]
     */
    scrollToIndex(index, {align = 'start'} = {}) {
        if (this._destroyed) return;
        if (this.count === 0) return;
        if (!Number.isFinite(index)) return;
        // Layout indices are integers; clamp before requesting a rectangle.
        const clampedIndex = Math.max(0, Math.min(Math.floor(index), this.count - 1));

        // Remeasure against live width so a width change since the last
        // resize/scroll can't make getRect read a stale row position.
        const containerWidth = Number.isFinite(this.scrollElement.clientWidth) ? this.scrollElement.clientWidth : 0;
        this.layout.measure(containerWidth, this.count);
        this._lastWidth = containerWidth;

        const rect = this.layout.getRect(clampedIndex);
        const viewportHeight = Number.isFinite(this.scrollElement.clientHeight) ? this.scrollElement.clientHeight : 0;
        const maxScroll = Math.max(0, this.layout.getTotalSize() - viewportHeight);

        let target = rect.y;
        if (align === 'center') {
            target = rect.y - (viewportHeight - rect.height) / 2;
        } else if (align === 'end') {
            target = rect.y - viewportHeight + rect.height;
        } else if (align === 'auto') {
            const current = Number.isFinite(this.scrollElement.scrollTop)
                ? Math.max(0, this.scrollElement.scrollTop)
                : 0;
            // Already fully in view — don't scroll.
            if (rect.y >= current && rect.y + rect.height <= current + viewportHeight) return;
            target =
                rect.y + rect.height > current + viewportHeight
                    ? rect.y - viewportHeight + rect.height // below the fold → align end
                    : rect.y; // above the fold → align start
        }
        target = Math.max(0, Math.min(target, maxScroll));

        // Build from the intended offset and write scrollTop AFTER onChange so the
        // consumer can resize its spacer first (avoids clamping against stale height).
        this._update(false, undefined, target);
    }

    /** Scroll to an absolute pixel offset (clamped to the content range). */
    scrollToOffset(offset) {
        if (this._destroyed) return;
        if (!Number.isFinite(offset)) return;
        const containerWidth = Number.isFinite(this.scrollElement.clientWidth) ? this.scrollElement.clientWidth : 0;
        this.layout.measure(containerWidth, this.count);
        this._lastWidth = containerWidth;
        const viewportHeight = Number.isFinite(this.scrollElement.clientHeight) ? this.scrollElement.clientHeight : 0;
        const maxScroll = Math.max(0, this.layout.getTotalSize() - viewportHeight);
        this._update(false, undefined, Math.max(0, Math.min(offset, maxScroll)));
    }

    /** Update the item count and recompute. */
    setCount(newCount) {
        if (this._destroyed) return;
        this.count = normalizeItemCount(newCount);
        this._update(true);
    }

    /** Swap the layout strategy and recompute (anchored). */
    setLayout(layout) {
        if (this._destroyed) return;
        const nextLayout = resolveLayout(layout);
        let anchorOffset;
        if (this._measured && this.count > 0) {
            const scrollTop = Number.isFinite(this.scrollElement.scrollTop)
                ? Math.max(0, this.scrollElement.scrollTop)
                : 0;
            // Capture the offset into the anchor item against the OUTGOING layout;
            // _update applies it (clamped) under the new geometry.
            anchorOffset = scrollTop - this.layout.getRect(this._firstVisibleIndex).y;
        }
        this.layout = nextLayout;
        this._update(true, anchorOffset);
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
        if (this._resizeFrameId !== null) cancelAnimationFrame(this._resizeFrameId);
        this._resizeFrameId = null;
        if (this._scrollIdleTimer !== null) clearTimeout(this._scrollIdleTimer);
        this._scrollIdleTimer = null;
    }

    // ---- Internals ----------------------------------------------------------

    _handleScroll() {
        if (this._selfScroll) {
            // The browser echoing our own programmatic scrollTop write — not a
            // user gesture, so don't flip isScrolling or extend the idle timer.
            this._selfScroll = false;
        } else {
            this.isScrolling = true;
            if (this._scrollIdleTimer !== null) clearTimeout(this._scrollIdleTimer);
            this._scrollIdleTimer = setTimeout(this._handleScrollIdle, SCROLL_IDLE_MS);
        }
        if (this._animationFrameId !== null) return;
        this._animationFrameId = requestAnimationFrame(() => {
            this._animationFrameId = null;
            this._update(false);
        });
    }

    _handleScrollIdle() {
        this._scrollIdleTimer = null;
        if (this._destroyed) return;
        this.isScrolling = false;
        // The window has not moved, but isScrolling toggled — let the consumer
        // learn the scroll settled (the memo keys on isScrolling so this notifies).
        this._update(false);
    }

    _handleResize() {
        if (this._destroyed) return;
        // measure() depends only on container width; ignore height-only changes,
        // no-op ticks, and the observer's redundant initial delivery.
        const width = Number.isFinite(this.scrollElement.clientWidth) ? this.scrollElement.clientWidth : 0;
        if (width === this._lastWidth) return;
        if (this._resizeFrameId !== null) return;
        this._resizeFrameId = requestAnimationFrame(() => {
            this._resizeFrameId = null;
            if (!this._destroyed) this.refresh();
        });
    }

    /**
     * The single update path, shared by scroll, resize, and the setters.
     * @param {boolean} anchor when true, keep the previously first-visible item stable
     * @param {number} [preservedAnchorOffset] offset captured before replacing the layout
     * @param {number} [forcedScrollTop] explicit target offset (scrollToIndex/scrollToOffset)
     */
    _update(anchor, preservedAnchorOffset, forcedScrollTop) {
        if (this._destroyed) return;
        const element = this.scrollElement;

        // onChange may trigger a nested update; only the newest update may publish
        // or write scroll state.
        const mySeq = ++this._updateSeq;

        // Read geometry together and sanitize malformed host values before measuring.
        const containerWidth = Number.isFinite(element.clientWidth) ? element.clientWidth : 0;
        const scrollTop = Number.isFinite(element.scrollTop) ? Math.max(0, element.scrollTop) : 0;
        const viewportHeight = Number.isFinite(element.clientHeight) ? element.clientHeight : 0;

        // Capture the anchor from the previous geometry before measuring.
        const anchorIndex = anchor && this._measured ? this._firstVisibleIndex : -1;
        let anchorOffset = 0;
        if (anchorIndex >= 0) {
            anchorOffset = preservedAnchorOffset ?? scrollTop - this.layout.getRect(anchorIndex).y;
        }

        if (!this._measured || anchor) {
            this.layout.measure(containerWidth, this.count);
            this._measured = true;
            this._lastWidth = containerWidth;
        }

        // Resolve the offset this update should render at: a forced target
        // (scrollToIndex/scrollToOffset) wins; otherwise hold the anchor stable.
        // Defer any write until after onChange lets the consumer resize its spacer,
        // otherwise the browser may clamp against the old scroll height.
        let targetScrollTop = scrollTop;
        if (forcedScrollTop !== undefined) {
            targetScrollTop = forcedScrollTop;
        } else if (anchorIndex >= 0 && this.count > 0) {
            const clampedAnchorIndex = Math.min(anchorIndex, this.count - 1);
            const anchorRect = this.layout.getRect(clampedAnchorIndex);
            const maxScroll = Math.max(0, this.layout.getTotalSize() - viewportHeight);
            // Clamp the preserved offset to the item's extent so a tall->short
            // relayout cannot push the anchor item entirely out of view.
            const boundedOffset = Math.max(0, Math.min(anchorOffset, anchorRect.height));
            targetScrollTop = Math.max(0, Math.min(anchorRect.y + boundedOffset, maxScroll));
        }

        const totalSize = this.layout.getTotalSize();

        // Compute the window and the overscan-free first index in a single pass.
        let start = 0;
        let end = 0;
        let firstVisibleIndex = 0;
        if (this.count > 0) {
            const range = this.layout.getRange(targetScrollTop, viewportHeight, this.overscan);
            start = range[0];
            end = range[1];
            firstVisibleIndex = Math.min(this.count - 1, Math.max(0, range[2]));
        }
        this._scrollTop = targetScrollTop;

        // Skip the rebuild + notify on a plain scroll when nothing a consumer can
        // observe has changed. Anchored/forced updates always run so the spacer and
        // scroll position stay in sync.
        const forced = anchor || forcedScrollTop !== undefined;
        if (
            !forced &&
            start === this._pStart &&
            end === this._pEnd &&
            firstVisibleIndex === this._pFirst &&
            totalSize === this._pTotal &&
            this.isScrolling === this._pScrolling
        ) {
            return;
        }

        const virtualItems = [];
        for (let i = start; i < end; i++) {
            const rect = this.layout.getRect(i);
            virtualItems.push(
                Object.freeze({index: i, x: rect.x, y: rect.y, width: rect.width, height: rect.height}),
            );
        }
        // Publish immutable snapshots so consumers cannot mutate engine state.
        this._virtualItems = Object.freeze(virtualItems);
        this._firstVisibleIndex = firstVisibleIndex;
        this._pStart = start;
        this._pEnd = end;
        this._pFirst = firstVisibleIndex;
        this._pTotal = totalSize;
        this._pScrolling = this.isScrolling;

        // A superseded (re-entrant) update must not publish stale data.
        if (this.onChange && this._updateSeq === mySeq) {
            this.onChange({
                virtualItems: this._virtualItems,
                totalSize,
                stats: this.getStats(),
                isScrolling: this.isScrolling,
            });
        }

        // onChange may destroy the engine or supersede this update; only the newest
        // update may write, and the write happens after onChange so the spacer is
        // already sized.
        if (!this._destroyed && this._updateSeq === mySeq && targetScrollTop !== scrollTop) {
            this._selfScroll = true;
            element.scrollTop = targetScrollTop;
        }
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
export function gridLayout({minItemWidth, aspectRatio, gap}) {
    // Normalize numeric dimensions and reject derived overflow.
    const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
    const minW = resolveRequiredLength(minItemWidth, 'minItemWidth');
    const resolvedGap = resolveLength(gap, 'gap', true);
    const g = Number.isFinite(resolvedGap) && resolvedGap >= 0 ? resolvedGap : 0;

    let itemCount = 0;
    let columns = 1;
    let itemWidth = 0;
    let itemHeight = 0;
    let rowHeight = 0;
    let rowCount = 0;
    let totalSize = 0;

    return {
        measure(newContainerWidth, newItemCount) {
            // minW > 0 and g >= 0, so minW + g > 0 — no divide-by-zero possible.
            const nextColumns =
                newContainerWidth > 0 ? Math.max(1, Math.floor((newContainerWidth + g) / (minW + g))) : 1;
            if (!Number.isSafeInteger(nextColumns)) {
                throw new RangeError('Grid geometry exceeds the supported column range');
            }

            const nextItemWidth =
                newContainerWidth > 0 ? (newContainerWidth - (nextColumns - 1) * g) / nextColumns : 0;
            const nextItemHeight = Math.round(Math.max(0, nextItemWidth) / ratio);
            const nextRowHeight = nextItemHeight + g;
            const nextRowCount = newItemCount > 0 ? Math.ceil(newItemCount / nextColumns) : 0;
            // A collapsed cell (0-width/hidden container) has no reachable content,
            // so report zero total rather than phantom gap-only height.
            const nextTotalSize = nextItemHeight > 0 ? Math.max(0, nextRowCount * nextRowHeight - g) : 0;

            if (
                !Number.isFinite(nextItemWidth) ||
                !Number.isFinite(nextItemHeight) ||
                !Number.isFinite(nextRowHeight) ||
                !Number.isFinite(nextTotalSize)
            ) {
                throw new RangeError('Grid geometry exceeds the supported numeric range');
            }

            itemCount = newItemCount;
            columns = nextColumns;
            itemWidth = Math.max(0, nextItemWidth);
            itemHeight = nextItemHeight;
            rowHeight = nextRowHeight;
            rowCount = nextRowCount;
            totalSize = nextTotalSize;
        },

        getTotalSize() {
            return totalSize;
        },

        getRange(scrollTop, viewportHeight, overscan) {
            // itemHeight <= 0 also covers a collapsed/0-width container (itemWidth 0
            // => itemHeight 0), where rowHeight can still be > 0 from the gap.
            if (itemCount === 0 || rowHeight <= 0 || itemHeight <= 0) return [0, 0, 0];
            const rowAtViewportTop = Math.floor(scrollTop / rowHeight);
            const firstRow =
                scrollTop - rowAtViewportTop * rowHeight >= itemHeight
                    ? rowAtViewportTop + 1
                    : rowAtViewportTop;
            const endRowExclusive = Math.ceil((scrollTop + viewportHeight) / rowHeight);
            const start = Math.max(0, (firstRow - overscan) * columns);
            const end = Math.min(itemCount, (endRowExclusive + overscan) * columns);
            const firstVisible = Math.max(0, firstRow * columns);
            return [start, end, firstVisible];
        },

        getRect(index) {
            const column = index % columns;
            const row = Math.floor(index / columns);
            return {
                x: column * (itemWidth + g),
                y: row * rowHeight,
                width: itemWidth,
                height: itemHeight,
            };
        },

        getInfo() {
            return {name: 'grid', columns, itemWidth, itemHeight, rowCount};
        },
    };
}

/**
 * Full-width rows of fixed height.
 *
 * @param {Object} options
 * @param {number|string} options.itemHeight fixed row height
 * @param {number|string} options.gap        vertical space between rows
 * @returns {Layout}
 */
export function listLayout({itemHeight, gap}) {
    // Normalize numeric dimensions and reject derived overflow.
    const ih = resolveRequiredLength(itemHeight, 'itemHeight');
    const resolvedGap = resolveLength(gap, 'gap', true);
    const g = Number.isFinite(resolvedGap) && resolvedGap >= 0 ? resolvedGap : 0;
    // ih and g are constant for the layout's lifetime, so the row pitch is invariant.
    const rowHeight = ih + g;

    let containerWidth = 0;
    let itemCount = 0;
    let totalSize = 0;

    return {
        measure(newContainerWidth, newItemCount) {
            const nextTotalSize = Math.max(0, newItemCount * rowHeight - g);
            if (!Number.isFinite(nextTotalSize)) {
                throw new RangeError('List geometry exceeds the supported numeric range');
            }

            containerWidth = newContainerWidth;
            itemCount = newItemCount;
            totalSize = nextTotalSize;
        },

        getTotalSize() {
            return totalSize;
        },

        getRange(scrollTop, viewportHeight, overscan) {
            if (itemCount === 0 || rowHeight <= 0) return [0, 0, 0];
            const rowAtViewportTop = Math.floor(scrollTop / rowHeight);
            const firstRow =
                scrollTop - rowAtViewportTop * rowHeight >= ih
                    ? rowAtViewportTop + 1
                    : rowAtViewportTop;
            const endRowExclusive = Math.ceil((scrollTop + viewportHeight) / rowHeight);
            const start = Math.max(0, firstRow - overscan); // columns = 1
            const end = Math.min(itemCount, endRowExclusive + overscan);
            const firstVisible = Math.max(0, firstRow);
            return [start, end, firstVisible];
        },

        getRect(index) {
            return {x: 0, y: index * rowHeight, width: containerWidth, height: ih};
        },

        getInfo() {
            return {name: 'list', columns: 1, itemWidth: containerWidth, itemHeight: ih, rowCount: itemCount};
        },
    };
}
