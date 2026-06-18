# virtualization-engine — Verification & Regression Suite

Store this file alongside `virtualization-engine.js`. Re-run it after any change to the engine — adding a layout strategy, a method, changing rounding, anything. It is the definition of "still working."

---

## 0. How to use this document

This suite is layered into gates. Run them in order; a failure at an earlier gate makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. Run on every change. If red, stop and fix before anything else. This is the net that should grow the most as the engine grows.
- **Gate 2 — Browser verification protocol.** The DOM/runtime behaviors `node` cannot test (anchoring, recycling, seams under zoom, ResizeObserver). Run after meaningful changes.
- **Gate 3 — Edge-case suite.** Boundary inputs. Run after any change to layout math or guards.
- **Gate 4 — Styling independence.** Confirms the headless boundary still holds. Run after any change to how the engine writes to the DOM.

**Prerequisites for the browser gates:**

- `test.png` must be present in the folder (the demos reference it).
- Serve over HTTP from the repository root: `node demo/server.mjs`, then open `http://localhost:8788/demo/virtualization-engine.html`. ES-module imports are blocked over `file://` - the page will silently fail to populate if opened as a file.
- Pass criteria are written as **invariants** (e.g. "right edge equals clientWidth, whatever it is") because container width fluctuates between machines and runs. Specific numbers given are **example references from a known-good session on a dpr-2 display at the stated width**, not absolute expected values. Trust the invariant, not the number.

**A note on automation (the "better way"):** Gate 1 is already automated. Gates 2–4 are encoded as console snippets you paste into the browser. If re-running them by hand becomes tedious, port the snippets to Playwright/Puppeteer so the whole suite is one command — that's the long-term ideal, at the cost of a dev dependency. For a personal kit, the manual protocol below is sufficient.

---

## 1. What "working" means — the invariants

Every gate exists to protect one of these. If you can't map a test back to one of these, it's probably testing an implementation detail, not a guarantee.

1. **Headless.** The engine creates no DOM, writes only inline `transform` / `width` / `height`, and touches no classes, stylesheets, or computed styles. The consumer owns all markup and styling.
2. **Pure layout core.** The layout strategies are DOM-free; `virtualization-engine.js` imports in Node with no `document` / `window` / `ResizeObserver` at module scope. All DOM access is confined to the `VirtualizationEngine` constructor/methods.
3. **Flush edge-to-edge** (grid). The row spans the full container width: left edge 0, right edge = container width.
4. **Continuous stretch, stepped columns.** Within a column band, cell width grows continuously with container width. Column count steps only when a whole new column fits — never leaves dead gutter.
5. **Seam-free.** Adjacent cells never overlap and never leave a spurious hairline. Inter-cell gaps are exact and uniform.
6. **Bounded DOM.** The number of cell elements stays bounded (≈ visible rows + overscan) regardless of scroll position. Recycling works.
7. **Anchoring.** The first visible item stays roughly in place across relayout (resize, size-control change, strategy switch). Drift ≤ ~1 row, not a jump.
8. **Strategy seam.** `VirtualizationEngine` makes no layout-specific assumptions. A new strategy satisfying the five-method contract drops in with zero engine edits.
9. **Cells never below `minItemWidth`** (stretch grid).
10. **Graceful degradation.** Boundary inputs (count 0, hidden container, oversize count) never throw or produce NaN.
11. **Synchronous initial state.** Construction measures immediately and delivers a complete `{ virtualItems, totalSize, stats }` payload to `onChange`.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node virtualization-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently 43).

This file is the first thing to run after any change. It also doubles as the **headless-core design check**: if importing `virtualization-engine.js` in Node throws because the module touches the DOM at top level, that's a regression in invariant #2 — move the DOM access into the `VirtualizationEngine` constructor/methods.

**What it covers:**

- **grid invariants:** flush/seam (`sum(colWidth) + (cols−1)·gap === W`) across awkward configs, integer widths, ≤1px width spread, continuous stretch, breakpoint stepping.
- **grid golden scalars** (W=1000, gap=8, minW=160): columns 6, `getRect(0)={0,0,160,160}`, `getRect(6).y=168`, rowCount 1667, totalSize 280048, `getRect(9999)={504,279888,160,160}`.
- **Range:** `getRange(0,600,0)=[0,24]`, overscan 2 → `[0,36]`, bottom clamps `end` to count.
- **Locked breakpoints:** columns step at W = 664 / 832 / 1000 / 1168; continuity at W=900↔901 (cells differ by `1/columns` px before rounding); cell width ≥ minItemWidth across a 200–2000px sweep.
- **Guards:** `measure(W,0)` → total 0, empty range; `measure(100,…)` → 1 column.
- **list:** geometry, info, range, and empty-count guards.

**Golden vs invariant — important for maintenance.** Two kinds of assertion live here:

- **Invariants** (flush sum, integer widths, ≤1px spread, margins-equal, never-stretches): survive any rounding change. These should never need editing.
- **Golden values** (totalSize 280048, `getRect(9999)`, the specific breakpoints): encode the *current* rounding rule. If you deliberately change how the last column absorbs the remainder, or how `leftMargin` rounds, **these will fail by design** — update the expected numbers, don't treat it as a bug. Mark golden-value tests with a comment so future-you knows which are safe to update.

**When you add a strategy or method, add tests here first**, in invariant style where possible (see §7).

---

## 3. Gate 2 — Browser verification protocol

Serve the folder and open the plain demo (`index.html`). Keep the monitor visible. Each test unit below is self-contained; paste the snippet into the browser console (or the preview eval) and check the pass criterion.

A reusable measurement helper, used by several units (measures the top row's cell boundaries in CSS and device px):

```js
function measureRow() {
  const dpr = window.devicePixelRatio;
  const cells = [...document.querySelectorAll('.cell')]
    .map(el => ({ el, r: el.getBoundingClientRect() }))
    .filter(c => c.r.top < 5)              // top row only
    .sort((a, b) => a.r.left - b.r.left);
  const gaps = [], overlaps = [];
  for (let i = 1; i < cells.length; i++) {
    const gap = cells[i].r.left - cells[i-1].r.right;
    gaps.push(gap);
    if (gap < -0.01) overlaps.push(gap);
  }
  const scroller = document.querySelector('#scroller'); // adjust selector if renamed
  return {
    cols: cells.length,
    overlaps: overlaps.length,
    gapsCss: [Math.min(...gaps), Math.max(...gaps)],
    gapsDevice: [Math.round(Math.min(...gaps)*dpr), Math.round(Math.max(...gaps)*dpr)],
    leftEdge: cells[0].r.left - scroller.getBoundingClientRect().left,
    rightEdge: cells.at(-1).r.right - scroller.getBoundingClientRect().left,
    clientWidth: scroller.clientWidth,
  };
}
```

### T1 — Initial render & first-paint (no blank flash)

Construction invokes `onChange` synchronously with the initial state, so the consumer can size its spacer and position cells before first paint.

**Pass:** on initial load, the grid is populated with no visible one-frame flash of blank/unpositioned content, and no layout jump when the spacer is sized.
**Reference:** the constructor callback receives a populated virtual window and non-zero total size.

### T2 — Synchronous getters

```js
// construct against an isolated, correctly-sized scroll element, then read synchronously:
const total = v.getTotalSize();          // must be real, not 0
const items = v.getVirtualItems();       // must be populated, not []
// onChange has already received the same initial state
```

**Pass:** getters and the initial `onChange` payload agree immediately after construction.
**Reference:** `getTotalSize()` → 676794, `getVirtualItems()` → 12 items, and the callback receives those values synchronously.
**Watch:** the total may shift slightly afterward (e.g. 676794→660124) as the vertical scrollbar appears and the ResizeObserver re-measures the narrower content-box. Expected, not a bug.

### T3 — Flush edges & seams (multi-zoom, measured)

Do **not** rely on screenshots — downscaled JPEGs can't resolve a 1px line. Use `measureRow()` at each zoom. Apply zoom via the browser's actual Ctrl-+ where possible; CSS `zoom` is a reasonable proxy but is **not byte-identical** to browser zoom in every engine.

```js
// at 67%, 90%, 110% (and, if you can, fractional dpr 1.5 / 125% Windows scaling):
measureRow();
```

**Pass at every zoom:** `overlaps === 0`; `leftEdge === 0`; `rightEdge ≈ clientWidth` (within sub-pixel, < 1 device px); inter-cell CSS gaps uniform to ~0.01px.
**Reference (dpr 2):** 67% → 13 cols, 0 overlaps, device gap 10–11px; 90% → 9 cols, 0 overlaps, 14–15px; 110% → 8 cols, 0 overlaps, 18px.
**Watch:** a ±1 device-px wobble inside an already-wide gap is rounding, not a seam. A true seam is `overlaps > 0` or a gap collapsing toward 0. **Also test fractional dpr** (1.5, 1.25) — it's a different snapping regime than dpr 2 and the most common real-world case (Windows display scaling); it was *not* covered in the original verification.

### T4 — Continuous stretch & breakpoints

```js
// sweep container width or drag the size slider slowly across a band, logging cell width.
// then check the engine's breakpoints directly via the layout math:
//   columns must step at W where itemWidth would drop below minItemWidth.
```

**Pass:** within a column band, cell width changes continuously with width (not in steps); columns increase by exactly 1 when width grows by `minItemWidth + gap`, and only then. No dead gutter at the right edge at any width.
**Reference:** breakpoints at W = 664/832/1000/1168 (minW 160, gap 8); W 900→901 grows each of 5 cells by ~0.2px.

### T5 — Bounded DOM (recycling)

Scroll from top to the very bottom of a large count (10,000+). Watch the monitor's DOM/pool count and "first visible index."

**Pass:** the DOM cell count stays bounded (≈ visible rows + overscan) while "first index" climbs to the end. It must **not** grow with scroll position.
**Reference:** pool stayed ~96 while first index climbed 0 → 5000.
**Known characteristic (not a bug):** the pool **never shrinks** — it stays at its high-water mark. Zooming out to many columns (e.g. 13 at 67%) permanently raises the pool size for the session (it grew to 156 and stayed). Acceptable; just know a brief many-column state costs memory until reload.

### T6 — Anchoring (the most important runtime guarantee)

Three sub-cases. Capture the first visible index, perform the action, confirm the same item stays at/near the top.

- **Slider scrub:** jump to a known item, scrub the size slider rapidly across the full range for several cycles.
- **Resize:** scroll to the middle, resize the window.
- **Strategy switch:** scroll to the middle, cycle through all strategies both directions.

**Pass:** the anchored item stays pinned; cumulative drift ≤ ~1 row; no jump to top or to a random offset; DOM stays bounded throughout.
**Reference:** slider scrub → drift 0 across 4 full cycles; resize → stayed in region; strategy switch → item 3996/4232 pinned, drift 0 across all six permutations.
**Why it's fragile to regressions:** anchoring writes `scrollTop` **after** `onChange`, because the consumer sizes the spacer in `onChange` and writing before that would clamp against the stale (shorter) `scrollHeight`. If you change construction/notify ordering, re-verify this hardest. Strategy-switch anchoring is the strictest case — row math changes underneath the anchor.

### T7 — ResizeObserver live path

Resize the browser window (or the scroll container).

**Pass:** columns/sizes recompute live; the grid stays flush (`rightEdge === clientWidth`); anchoring holds.
**Watch:** a scrollbar appearing/disappearing changes the content-box width and *should* trigger a re-measure (slightly different column width) — that's correct, not a flicker bug. Confirm it doesn't cause a visible reflow loop.

### T8 — `destroy()` leak check

Instrument an `onChange` counter, call `destroy()`, then scroll and resize.

```js
// after destroy():
const before = onChangeCount;
scroller.scrollTop += 5000;       // several times
window.dispatchEvent(new Event('resize'));
// onChangeCount must equal `before` — frozen
```

**Pass:** after `destroy()`, no `onChange` fires on scroll or resize (counter frozen); native scrolling still works; no console errors. Both the scroll listener and ResizeObserver are detached.
**Reference:** counter frozen through 8 scrolls + a resize; live monitor frozen at pre-destroy values.

### T9 — `scrollToIndex`

```js
v.scrollToIndex(5000);
// firstIndex should become the row containing 5000, top-aligned
```

**Pass:** the target item lands top-aligned; the rendered range surrounds it (with overscan).
**Reference:** `scrollToIndex(5000)` → firstIndex 5000 (row 625 × 8 cols), range [4984, 5079].
**Note:** current behavior is top-align only. If you add alignment options (center/bottom), add a test and update this.

### T10 — Live monitor

**Pass:** the monitor updates on scroll, resize, slider, strategy switch, and jump — driven through the public `getStats()` / `getStats()` path with no special-casing per strategy.

### T11 — Image `object-fit: cover`

**Pass:** each cell's image fills the cell completely (no letterbox bars, no gaps), cropping the overflow; the cell shape is exactly the configured aspect ratio regardless of the source image's native shape.
**Confirm the CSS on the cell image is:**

```css
.cell img { width: 100%; height: 100%; object-fit: cover; display: block; }
```

**Watch (source-resolution, not layout):** with `cover`, a source image *smaller* in pixels than the cell is scaled **up** and looks soft/blurry. Check the largest cell size the grid reaches (cells grow with container width and the slider). If thumbnails are low-res, large cells will be fuzzy — fix upstream (bigger source thumbnails), not in the engine.
**Watch (mismatch crop):** a source whose shape differs from the cell ratio loses content to the crop (a 16:9 source in a 2:3 cell loses most of its sides). This is intrinsic to uniform-cell + cover, not a bug. `object-position` (default `center`) controls which part survives.

### T12 — Non-square aspect ratios

The original verification tested aspect 4 and 0.25 numerically (Gate 3) but not as a live visual check. If you add an aspect-ratio control to the demo (recommended — a few presets: 1:1, 2:3, 3:2, 16:9), verify each:

**Pass at each ratio:** cells reshape to the chosen ratio (`aspectRatio` = width ÷ height); rows stay aligned; grid stays flush and seam-free (`measureRow()` → `overlaps 0`, `rightEdge === clientWidth`); `itemHeight === round(itemWidth / aspectRatio)`.
**Watch:** `aspectRatio` is width ÷ height — `2/3` is portrait, `3/2` is landscape. Inverting it silently flips orientation. Write ratios as division expressions (`16/9`) not decimals for readability.

---

## 4. Gate 3 — Edge-case suite

Reproduce each; expected behavior is graceful (no throw, no NaN). Some need the **live, on-screen** demo because Chrome suppresses ResizeObserver callbacks for off-viewport elements (see §6) — those are marked [LIVE].

| # | Case | Expected | Reference |
|---|------|----------|-----------|
| 1 | count = 0 | no throw; total 0; 0 items; monitor "Showing 0 of 0" | ✓ |
| 2 | count = 1 | 1 cell at origin; total = itemHeight; no scroll | ✓ 195×195 |
| 3 | container < minItemWidth [LIVE] | clamp to 1 column; itemWidth = clientWidth; no overflow; no NaN | ✓ 340px→1 col |
| 4 | minItemWidth ≫ container [LIVE] | clamp to 1 column, full width; no NaN | ✓ 585×585 |
| 5 | count = 1,000,000 | **see §6 height cap** — total exceeds browser cap, bottom rows unreachable, scrollToIndex clamps. Graceful (no throw/NaN). | break ~789,513 @ dpr 2 |
| 6 | aspect 4 / 0.25 | itemHeight = round(itemWidth/ar); exact gaps; no overlap | ✓ 48 / 761 |
| 7 | rapid slider scrub | zero cumulative anchor drift; bounded DOM; no thrash | ✓ drift 0 ×4 cycles |
| 8 | count = 10,001, scroll to end | last item bottom = total = scrollHeight; phantom space below = 0; no clipping | ✓ |
| 9 | hidden container (display:none → shown) [LIVE] | no throw on 0×0 measure; sane zero geometry while hidden; full recovery + scroll position restored on show | ✓ item 3000 restored |
| 10 | destroy() then scroll + resize | no callbacks fire; native scroll works; no leak | ✓ |

**New cases to add (were not in the original verification):**

| # | Case | Expected |
|---|------|----------|
| 11 | gap = 0 | tiling still sums exactly to W (`sum(colWidth) === W`, no inter-cell gap); no seam; no off-by-one |
| 12 | aspectRatio = 0 or negative | `itemHeight = round(W/0) = Infinity` → decide: guard to a safe value, or document as caller error. Currently unguarded — confirm behavior and document. |
| 13 | count negative; minItemWidth = 0 or negative; gap negative | define and test: clamp, throw, or document as caller error. Pick one and make it explicit. |
| 14 | setCount mid-scroll (data grows/shrinks live) | recomputes correctly; anchoring holds; no jump; bounded DOM |
| 15 | fractional dpr (1.5 / 1.25) seam | `overlaps 0` at fractional zoom on a fractional-dpr display (covered in T3 but list it here too — it's the highest-risk untested regime) |

**Test-harness reliability note:** pure construction-math cases (1, 2, 6, 8, 11) are reliable in an isolated harness. RO-dependent cases (3, 4, 9, 14) must run on the **live on-screen demo** or RO won't fire (§6).

---

## 5. Gate 4 — Styling independence

Open `index-tailwind.html` (same engine, same consumer logic, Tailwind utilities + preflight instead of hand-written CSS). The point: prove the engine behaves identically under a foreign styling system.

**Pass:** every Gate 2 invariant holds identically (flush, seams at zoom, bounded DOM, anchoring, strategy switch, monitor). `virtualization-engine.js` is unchanged.

**The two failure modes and the correct pattern:**

1. **`box-sizing: border-box` (from preflight).** The engine sets the cell's `width`/`height` as its footprint. If the positioned cell carries padding or a border, border-box shrinks content while the engine still positions assuming the full footprint → apparent overlap/gaps.
   **Correct pattern:** keep the positioned cell's box pristine — only positioning / overflow / background utilities on it (`absolute top-0 left-0 overflow-hidden bg-…`). Put padding/borders/decoration on an **absolutely-positioned inner element** (e.g. the index badge). Verify: `computedWidth === inline width`, `padding-top: 0`, `border-top-width: 0` on the cell.
2. **`!important` utilities.** A Tailwind `!`-prefixed utility on transform/width/height would override the engine's inline style.
   **Correct pattern:** never apply `!` utilities to those three properties. Verify: computed `transform` is a real `matrix(...)` (inline applied), computed width = inline width.

**Classify any breakage:**

- **Consumer-side** (border-box footprint, an `!` utility, a class fighting geometry): fix in the HTML. Engine untouched. Expected and fine.
- **Engine leak** (the engine misbehaves under different styling — depended on a class/stylesheet/computed style the plain demo happened to provide): **fix in `virtualization-engine.js`**. This is the most important possible finding — it defeats the headless purpose. None was found in the original run; a regression here is serious.

**Reference:** 6 cols, 176px cells at clientWidth 1095; transform = matrix; footprint exact; zoom 90/110 → 0 overlaps (14/17px device gaps); DOM bounded at 66; only the benign Tailwind Play CDN "not for production" console warning.

---

## 6. Known characteristics & gotchas

Read this before debugging anything — most "bugs" you'll hit are one of these, and several are test-harness artifacts, not engine faults.

**Engine characteristics (by design):**

- **Height cap — the one real limitation.** Browsers cap rendered element height: **~33.5M px at dpr 1, ~16.7M px at dpr 2** (the device-pixel limit ≈ 2²⁵ maps to fewer CSS px on retina). Beyond it, the spacer's `scrollHeight` clamps: bottom rows become unreachable and `scrollToIndex`/anchoring to them **silently land at the cap with no error**. It is **dpr-dependent** — a grid fine on a 1× monitor can lose rows on a 2× monitor at the same count. Measured break: **~789,513 items** at 8 cols / 170px rows on dpr 2; 1,000,000 items = 21.2M px, ~201k unreachable. Failure is graceful (no throw/NaN) but **silent**. Documented in `getTotalSize()`. *If a consumer might approach hundreds of thousands of items on retina, consider exposing a reachable-index / clamped flag on `getStats()` so the failure is detectable — that's making the limit legible, not engineering around it.*
- **Sub-pixel-long right edge (grid).** The last-column-absorbs-remainder rounding can put the right edge a hair *past* the container (e.g. −0.3 CSS px right-edge gap). Sub-device-pixel, invisible, never seams (inter-cell gaps stay exact). But if you ever see a 1px right-edge clip under some zoom/dpr, this rounding is where to look.
- **Pool never shrinks** (see T5). High-water mark for the session.
- **First `onChange` is synchronous** and receives state directly, so consumers must use the payload rather than close over an engine variable that is still being assigned.
- **Anchor `scrollTop` is written after `onChange`** so the consumer-sized spacer is tall enough to avoid clamping.

**Environment / test-harness gotchas:**

- **ResizeObserver is suppressed for off-viewport elements.** A test container positioned at `left:-20000px` will get **zero** RO callbacks (not even the initial one). RO-dependent cases must run on the live, on-screen demo. This caused false "didn't re-measure" failures in the original run — it was the harness, not the engine.
- **Nested `requestAnimationFrame` waits can hang** if the preview tab is backgrounded (rAF pauses). Use `setTimeout`-based settling in test harnesses, not rAF chains.
- **Unit-mixing in measurements.** Comparing zoom-scaled `getBoundingClientRect()` values against an unscaled `clientWidth` produces nonsense (the original run saw bogus −738/+135 flush numbers this way). Measure everything in one consistent unit.
- **CSS `zoom` ≠ browser zoom.** Close, not identical across engines. For a true seam check, use actual Ctrl-+ zoom in a real window at least once.
- **Scrollbar appear/disappear re-measures the content-box.** A small column-width change when the scrollbar toggles is correct RO behavior, not a flicker bug.
- **`file://` silently breaks ES-module imports.** Always serve over HTTP.

**Out of scope (the engine does not do these — by design):**

- **Accessibility (ARIA, keyboard nav, focus).** The engine is headless; the consumer owns all markup and is responsible for roles/labels/keyboard. Not an engine concern.
- **Per-item variable heights / masonry / justified rows.** The engine assumes one shared aspect ratio per grid. Mixed-height layouts need per-item dimensions and sequential packing — a different tier deliberately excluded.

---

## 7. Extending the suite when you add features

Match the change to the right additions. The discipline that kept the engine clean across five verification passes: **prove the invariant still holds, don't just check the new thing works.**

**Adding a layout strategy:**

- **Hard rule: do not modify the `VirtualizationEngine` class.** Implement the five-method contract (`measure`, `getTotalSize`, `getRange`, `getRect`, `getInfo`) and drop it in via `setLayout`. If you find you *must* edit `VirtualizationEngine`, stop — the strategy seam leaked (the engine made a layout-specific assumption it shouldn't). That leak is the finding; fix it there, not by special-casing.
- Add Gate 1 tests in **invariant style** (e.g. "margins equal and sum to W", "width never stretches", "columns count for a width", "adjacent cells separated by exactly gap"), not only golden values — so the new strategy contributes to the permanent net robustly.
- Wire it into the demo switcher with **no special-casing** in the render loop or monitor; geometry must flow through the `onChange` state payload.
- Re-run T6 (anchoring) **across all strategies both directions** — switching mid-scroll is the strict case.
- Decide the strategy's rounding stance and document why (§6).

**Adding an engine method:**

- Add it to the public surface and include any new state in the synchronous callback contract where appropriate.
- If it attaches any listener/observer, extend the T8 leak check to confirm `destroy()` detaches it.
- If it writes to the DOM, confirm it writes **only** inline geometry (invariant #1) and re-run Gate 4.

**Changing rounding / tiling / layout math:**

- **Golden-value Gate 1 tests will fail by design** — update the expected numbers (totalSize, `getRect` values, breakpoints). Don't update invariant tests; if those fail, you broke a guarantee.
- Re-run T3 (seams) at all zooms **including fractional dpr** — this is exactly the change that can introduce a hairline.

**Adding measurement / variable heights / a new layout tier:**

- You've left the pure-arithmetic regime. This reintroduces a whole risk class: scroll anchoring with unknown positions, estimate-then-correct, scroll-jump on measure. Treat it as a new component with its own full verification, not an extension. Re-read the masonry tradeoffs before committing.

**Adding a new render target (e.g. canvas):**

- The engine should still output only numbers (`getVirtualItems` rects). Confirm the DOM-free core (Gate 1 import check) still passes — the new target must not pull DOM into module scope.

**After any change, minimum re-run:** Gate 1 (always) + the Gate 2/3/4 units touching what you changed. After a *significant* change, run everything.

---

## 8. Quick regression checklist

For routine re-runs after a change. Tick all; if any fails, drop to the relevant full section.

- [ ] `node virtualization-engine.test.mjs` → all pass, exit 0
- [ ] `virtualization-engine.js` imports in Node with no DOM error
- [ ] Demo loads (served over HTTP), grid populates, no console errors, no blank flash
- [ ] `measureRow()` at 90% & 110% (and fractional dpr if available) → `overlaps 0`, `rightEdge === clientWidth`
- [ ] Slider drag → continuous stretch, columns step only at breakpoints, no right-edge gutter
- [ ] Scroll to bottom of 10k → DOM count bounded, doesn't grow with scroll
- [ ] Anchoring: slider scrub / resize / strategy switch → item pinned, drift ≤ 1 row
- [ ] All three strategies switch cleanly; monitor reflects each (no special-casing)
- [ ] `scrollToIndex(N)` lands top-aligned
- [ ] `destroy()` → callbacks frozen, native scroll still works
- [ ] Edge cases touched by the change (at minimum 1, 5, 9 if layout math changed)
- [ ] Tailwind demo behaves identically; `virtualization-engine.js` untouched
- [ ] Any new strategy: `VirtualizationEngine` unmodified; invariant tests added
