# selection-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an option,
touching the box-vs-rect hit-testing, the click/shift-range/ctrl-toggle logic, the marquee
lifecycle, the delta accounting, the spatial index, auto-scroll, or the selection-state
emission. It is the definition of "still working."

It mirrors the other engines' suites (`sortable-engine`, `drag-n-drop-engine`, `toast-engine`,
`image-cropper-engine`, `media-engine`): layered gates, run in order. A failure at an earlier gate
makes the later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The pure logic
  — the box-vs-rect hit-testing (both rules, all directions, boundaries), `normalizeBox`, the
  click/shift-range/ctrl-toggle/additive logic, the marquee delta sequence, additive vs replace,
  disabled items, `setItems` consistency, single-select degrade, the spatial-index-equals-brute
  -force property, and the state/delta emission — is driven through the same input-agnostic
  methods the consumer calls (`selectAt` / `startMarquee` / `updateMarquee` / `endMarquee` /
  `cancelMarquee`), with geometry supplied as plain data. No DOM, no flakiness. Run on every
  change; if red, stop and fix first.
- **Gate 2 — Browser verification protocol.** The DOM behaviors `node` can't reach: the live
  pointer wiring (empty-space drag → marquee vs press-on-tile → click), the rAF-throttled
  hit-test rendering smoothly, the consumer-drawn box, auto-scroll near an edge driving the
  scroll and selecting off-screen items, and the large-list performance case. Run after
  meaningful changes.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no item DOM and no CSS, that
  the demo's tiles / selected-state / marquee-box are entirely consumer-rendered, that the
  engine reads no live DOM during a drag (it hit-tests supplied geometry — there is no
  `getBoundingClientRect` in the engine at all) and renders nothing, and that swapping the
  rendering needs no engine change.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs` from the
repository root, then open `http://localhost:8788/demo/selection-engine.html`. ES-module
imports are blocked over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably testing an
implementation detail, not a guarantee.

1. **Selection out, paint in.** The engine owns the selection set + the drag-box hit-testing and
   emits state — the selected key `Set`, a per-change `delta` (`entered`/`left`), the `count`,
   the `anchor`, and the marquee `rect` while a box-drag is active. The consumer renders the
   items, the selected state, and the box. The engine styles nothing and draws no box.
2. **Headless.** The engine creates no item DOM and ships no CSS. There is no built-in
   selectable-list component, no default look. It manages selection + marquee state and emits
   them via `getState()` + `subscribe()`/`onChange`.
3. **Items by stable key; geometry as DATA.** The engine works in terms of stable keys and item
   rects supplied as data (`setItems`), in one consistent content space. It reads no DOM
   geometry — **there is no `getBoundingClientRect` in the engine**. For a virtualized list the
   geometry is the virtualizer's computed positions, so the marquee can select items that are
   not even rendered (off-screen).
4. **The performance contract.** Marquee hit-testing runs against **cached/supplied rects in
   pure JS**, never the live DOM per move; it is **throttled to `requestAnimationFrame**`
   (coalescing raw pointer moves); the engine emits **deltas** so the consumer toggles only the
   few changed items, never re-rendering all N; and an **optional spatial index** tests only
   items near the box for very large N. This is the whole point — violating it defeats the
   engine.
5. **Click semantics are exact.** Plain click selects one + clears + sets the anchor; shift-click
   selects the contiguous range from the **held** anchor (re-extending from the *same* anchor on
   repeated shift-clicks — the classic correctness bug); ctrl/⌘-click toggles one without
   clearing and moves the anchor to it; shift+ctrl adds a range additively.
6. **The marquee is correct in every direction and both rules.** Dragging up-left and down-right
   both work (the box is normalized to positive size); an item is "in" the box when it
   **intersects** it (touching counts — the default) or, under `contain`, when the box fully
   encloses it; items select live as the box touches them and de-select as it shrinks back out;
   an additive marquee adds to the existing selection rather than replacing it; cancel reverts.
7. **Disabled items are inert.** Items flagged unselectable are skipped by clicks, ranges,
   marquee, and select-all.
8. **State stays consistent across geometry changes.** `setItems` (a relayout or a virtualizer
   recompute) keeps still-present keys selected, drops vanished keys (reported in the delta),
   clears the anchor if it vanished, and re-tests an active marquee against the new geometry.
9. **Pure, DOM-optional core.** Constructing an instance, `setItems` with rects-as-data, and all
   the selection + hit-test logic must not throw with no `document`. Every browser API — `rAF`,
   and a scroll container's `scrollTop`/`clientHeight` for auto-scroll — is touched only inside
   method bodies behind capability checks, never at module scope. Zero runtime dependencies
   beyond the in-repo `shared/` helpers (`Emitter`, `clamp`).

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/selection-engine/selection-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **43**).

The suite (`tests/selection-engine/selection-engine.test.mjs`, harness in
`tests/selection-engine/harness.mjs`) supplies geometry as plain data (`{ key, x, y, w, h }`) —
no DOM is touched — and drives the same methods the real pointer wiring calls. The marquee path
is exercised through the engine's synchronous rAF fallback (no `requestAnimationFrame` in Node),
so a sequence of `updateMarquee` calls is immediately observable. Coverage maps directly to the
invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createSelection()` + `setItems` with rects-as-data run with no `document`; `getState()` is valid synchronously. |
| Import boundary | The engine imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| No live-DOM reads | The engine **code** (comments stripped) contains no `getBoundingClientRect` — geometry is always supplied. |
| DOM-guard discipline | Every module-scope reference to a DOM global (`document`/`window`/`requestAnimationFrame`/`cancelAnimationFrame`/`navigator`) is `typeof`-guarded — no bare access at load. |
| `normalizeBox` | A positive-size box from a drag in any of the four directions (down-right, up-left, down-left, up-right). |
| `boxHitTest` intersect | overlap selects; edge-touch counts; a gap selects nothing; a spanning box selects both. |
| `boxHitTest` contain | only fully-enclosed rects select; partial overlap does not; exact coincidence counts. |
| Empty box | a degenerate box off any item selects nothing under either rule. |
| Plain click | selects one, clears the rest, sets the anchor; a second click clears the first. |
| Shift-range | forward and backward range from the anchor; **repeated shift-clicks re-extend (grow, shrink, flip direction) from the SAME anchor**; no-anchor shift degrades to a plain click. |
| Ctrl-toggle | toggles in/out without clearing; builds a scattered set; the anchor follows even a toggle-off; a later shift-click ranges from the toggled item. |
| Additive range | shift+ctrl adds the anchor→target range onto the pre-range base; re-extension replaces the range portion without leaving a trail. |
| Bulk / programmatic | `selectAll` / `clear` / `toggle` / `select` (union) / `deselect` / `setSelection` (replace) / `isSelected` — correct sets + counts. |
| Marquee live + deltas | the box selects live and de-selects as it shrinks back out; the per-step `entered`/`left` deltas are exactly correct; any drag direction works; the box rect is exposed in state while active and null when idle. |
| Marquee rules | intersect (default) vs `contain` at boundary cases. |
| Additive vs replace marquee | replace clears the prior selection on start then fills from the box; additive (explicit, or derived from a `modifiers` object + `additiveModifier`) keeps it; **cancel reverts** to the exact pre-marquee selection. |
| Disabled items | skipped by clicks, ranges, marquee, and select-all; `setDisabled(predicate)` re-derives selectability and drops now-unselectable selected keys. |
| `setItems` consistency | survivors stay selected, vanished keys drop; a removed anchor is cleared; an **order change is reflected in the next shift-range**; a mid-marquee `setItems` re-tests the box against the new geometry. |
| Single-select | every interaction (click / shift / ctrl / select-all / marquee) collapses to at most one; switching to single mode collapses an existing multi-selection. |
| Spatial index | the index returns the **exact** same hits as brute force over 4,000 random items × 150 random boxes; an `index:true` engine produces the same marquee selection as a plain one; `index:'auto'` switches on only past the ~2,000-item threshold. |
| State emission | deferred initial emit reaches a synchronous subscriber; `subscribe` fires on a synchronous change and `unsubscribe` stops it; the change payload carries `selected`/`count`/`anchor`/`delta`/`marquee` + a lazy `selectedKeys`; `getState()` is a read-only snapshot that does not consume the pending delta. |
| Lifecycle | `destroy()` is inert + idempotent; `setScrollContainer`/`setAutoScroll` are headless-safe. |
| `rangeBetween` | forward / backward / single / missing-endpoint cases. |

**Also confirm nothing else regressed** (each prints its own pass line):
`node tests/sortable-engine/sortable-engine.test.mjs` (37),
`node tests/drag-n-drop-engine/drag-n-drop-engine.test.mjs` (43),
`node tests/toast-engine/toast-engine.test.mjs` (39),
`node tests/color-engine/color-engine.test.mjs` (44),
`node tests/image-cropper-engine/image-cropper-engine.test.mjs` (42),
`node tests/datetime-engine/datetime-engine.test.mjs` (60),
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21),
`node tests/media-engine/run-all.mjs` (68).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/selection-engine.html`. The demo
(`demo/selection-engine.js`) is a reference **consumer**: a static photo gallery (every tile in
the DOM) and a 10,000-item **virtualized** grid composing `virtualization-engine.js` — both
rendered entirely from the engine's emitted selected set + deltas + marquee rect, owning all
markup, CSS, and DOM events.

Each check below was confirmed in a real browser session against this build by dispatching
genuine `PointerEvent` sequences (with real animation frames between moves, so the rAF-throttled
hit-test actually renders) and asserting the resulting selected tiles, count, box geometry,
scroll position, and `getBoundingClientRect` call count.

1. **Click / shift-range / ctrl-toggle (gallery).** Clicking `g3` selected just it (count 1);
   shift-clicking `g6` selected the range `{g3,g4,g5,g6}` (count 4); shift-clicking `g1` then
   re-extended **from the same anchor `g3`** to `{g1,g2,g3}` (count 3) — **not** from the
   previous `g6`; ctrl-clicking `g10` added it scattered (`{g1,g2,g3,g10}`); clicking the
   disabled `g7` did nothing.
2. **Marquee drag, any direction, live select + de-select (gallery).** A press on empty space
   then a drag opened a consumer-drawn box; growing it to a 2×2 region selected `{g0,g1,g8,g9}`
   live, dragging back out de-selected down to `{g0}`, and release committed it. The box element
   tracked the emitted rect (e.g. 242×242 → 117×117). A mid-drag capture showed the box over a
   4×3 region with exactly **12** tiles lit and "12 selected".
3. **Additive marquee (gallery).** Holding **Shift** while starting a second drag elsewhere
   **added** its hits (`g24,g25`) to the existing `{g0}` rather than replacing — `{g0,g24,g25}`.
4. **Intersect vs contain (gallery).** Under `contain`, a box that only partially overlapped
   tiles selected **none**; enclosing whole tiles selected exactly those (2). Switching back to
   `intersect` restored touch-selects.
5. **Single-select mode (gallery).** With `single`, a click selected exactly one (`g5`) and a
   marquee over many tiles kept exactly one (`g0`).
6. **Large-list performance + off-screen selection (virtualized grid).** With **10,000** items
   only **88–132** tiles were ever in the DOM (virtualized). A marquee selected smoothly;
   dragging to the bottom edge **auto-scrolled** the container (`scrollTop` 0 → 1100) and the
   selection grew from 20 → **85** as items that were **never rendered** entered the box. After
   release the engine held **85** selected while only **45** selected tiles existed in the DOM —
   the other 40 are off-screen yet selected, and stay selected after scrolling past them.
   `Select all 10k` set the count to **10,000** with still only 132 tiles in the DOM (delta
   rendering — no 10k re-render).
7. **No per-move `getBoundingClientRect`.** `Element.prototype.getBoundingClientRect` was
   instrumented and reset to zero immediately after the marquee's `pointerdown`; across **all**
   the subsequent pointer-moves **and 28 auto-scroll frames** it was called **0** times. The
   hit-test runs against the cached/supplied geometry — the core performance contract, observed
   directly. (The consumer reads the container's rect once per gesture at press time, never
   per-move and never per-item.)
8. **No console errors / warnings** at any point in the session.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing and reads no live DOM. These checks confirm
the boundary holds.

1. **No DOM, no CSS, no geometry reads in the engine.** `selection-engine.js` contains no
   stylesheet, no markup, and no default selectable component. It creates **no element**, writes
   **no style** to any node, and calls **no `getBoundingClientRect`** (asserted by Gate 1). Its
   only browser-API references — `requestAnimationFrame`/`cancelAnimationFrame` (throttling the
   hit-test) and a scroll container's `scrollTop`/`clientHeight`/`scrollHeight` (the one
   exception: **driving** auto-scroll, which is behavior, not painting) — live inside methods
   behind `typeof`/capability checks; the clean Node import (Gate 1) proves none of it runs at
   module scope.
2. **The demo's UI is entirely consumer-rendered.** The tiles (photo `<img>` tiles and the
   color-by-index virtualized tiles), the selected highlight + check overlay, the marquee box (a
   plain `<div>` the consumer positions from `state.marquee.rect`), the count, the toolbar, the
   live-state log — every element, class, and color lives in `demo/selection-engine.html` /
   `demo/selection-engine.js`. The engine is handed only keyed geometry (`setItems`) and
   pointer-driven `selectAt`/`startMarquee`/`updateMarquee`/`endMarquee` calls. Delete the demo
   and the engine is unchanged and still fully tested by Gate 1.
3. **Geometry is data; the virtualizer is just a source of it.** The big grid feeds the engine
   the **full** position list from `virtualization-engine`'s layout (all 10,000 rects), so the
   marquee selects across off-screen items — the engine never needs them in the DOM. The
   consumer renders only the visible window and paints selected state from the emitted set +
   delta. Swapping the virtualizer for any other position source needs no engine change.
4. **Swapping the rendering needs no engine change.** The consumer reads only emitted values —
   `selected` (a `Set`, O(1) membership), `count`, `anchor`, `delta.{entered,left}` (the
   efficient render path), `marquee.{active,rect}`, and the lazy `selectedKeys`. A completely
   different renderer (different markup, a React/Vue/Svelte binding, or none) consumes the same
   state with zero edits to the engine. Keyed geometry in, selection state + deltas out — that
   subscription is the only seam.

---

## 5. Known scope boundaries (by design)

- **No UI / selectable-list component / CSS.** Headless; the engine renders nothing — not the
  items, not the selected state, not the marquee box. The polished selection UI is the
  consumer's (or a product's) job.
- **No DOM hit-testing during a drag.** The engine hit-tests **supplied/cached geometry**, never
  `getBoundingClientRect` per move. This is the core performance contract; the engine contains
  no `getBoundingClientRect` at all.
- **No virtualization.** The engine consumes geometry data; it does not window/virtualize the
  list itself. It **composes** with `virtualization-engine` (which owns that) — the demo's large
  grid feeds the virtualizer's positions in — but selection does not reimplement windowing.
- **No data ownership.** The engine emits the selected key `Set` (+ deltas); the consumer owns
  the actual items/data and renders from the keys.
- **No bulk-action UI.** The engine provides the selection + count; action bars / toolbars are
  the consumer's.
- **Single coordinate space.** Item rects and marquee points share one "content space"; the
  consumer maps its pointer into it (for a virtualized list, add the scroll offset — exactly as
  it computes the virtualizer's positions). The engine does not mix viewport and content
  coordinates.
- **Additive marquee semantics are the simple model.** A shift/modifier-held marquee unions its
  box hits onto the pre-marquee selection (and reverts on cancel). The richer file-manager
  behavior of a marquee that can also *subtract* on a second pass is out of scope; additive here
  means add.
- **No framework or host coupling** — vanilla, keys + geometry in, selection state + deltas out;
  no stores, services, routing, or design tokens.
