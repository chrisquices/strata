# sortable-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an
option, touching the drop-index math, the reorder/cross-list splice, the drag lifecycle,
keyboard reordering, auto-scroll, the pointer binding, or the order/drag-state emission.
It is the definition of "still working."

It mirrors the other engines' suites (`drag-n-drop-engine`, `toast-engine`,
`image-cropper-engine`, `media-engine`): layered gates, run in order. A failure at an earlier
gate makes the later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The pure
  logic — the drop-index computation (both orientations + grid, all boundaries,
  own-slot), the reorder splice, cross-list movement (incl. empty target + mid-drag
  switching + registration transfer), keyboard reordering, the "changed" payload, the
  order state model, revert, `setItems` sync — is driven through the same input-agnostic
  drag controller (`beginDrag` / `moveDragTo` / `moveDragBy` / `drop` / `cancel`) that
  the pointer and keyboard bindings funnel through, with rects supplied as plain data. No
  DOM, no flakiness. Run on every change; if red, stop and fix first.
- **Gate 2 — Browser verification protocol.** The DOM behaviors `node` can't reach: the
  pointer-drag wiring through `shared/gestures.js` (panstart/pan/panend), the lifted clone
  following the pointer, the gap/placeholder, kanban cross-list drag, drag handles,
  keyboard focus + reordering, auto-scroll near an edge, and the drag-vs-click threshold.
  Run after meaningful changes.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no item DOM and no CSS,
  that the demo's lists/cards/lifted-item/gap are entirely consumer-rendered, that the
  engine reorders no DOM and applies no transforms itself (it emits order + optional
  offsets), and that swapping the rendering needs no engine change.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs` from the
repository root, then open `http://localhost:8788/demo/sortable-engine.html`. ES-module
imports are blocked over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Reorder by pointer-drag, not file drop.** Sortable's input is pointer drags on
   on-page elements (reused from `shared/gestures.js`), reordering items within a list or
   moving them between connected lists. It is NOT OS file drag-and-drop — that is the
   separate `drag-n-drop-engine`. Different input, different engine.
2. **Order out, paint in.** The source of truth during a drag is the **provisional
   order** — the engine emits each list's current key order (provisional while dragging,
   committed on drop) and the consumer re-renders from it. On drop a `changed` event
   carries `{ key, fromList, fromIndex, toList, toIndex }` so the consumer can sync its
   data. The engine never reorders the consumer's DOM and never applies a transform.
3. **Headless.** The engine creates no item DOM and ships no CSS. It manages the list
   order(s) + drag-state and emits them via `getState()` + `subscribe()`/`onChange`. The
   consumer renders the items, the lifted/dragged item, the gap/placeholder, and all
   styling/animation. There is no built-in sortable component, no default look.
4. **Element by reference; items by stable key.** The consumer hands the engine the
   container element(s) and each item element paired with its stable key. No selector
   strings. The emitted order is key-based (`['a','c','b']`), meaningful regardless of
   DOM; the engine reads geometry (rects) to compute the drop position but identifies
   items by key.
5. **The drop-index math is correct and separable.** Given item rects (as plain data) +
   a pointer + orientation, the provisional insertion index is correct for vertical and
   horizontal lists (and grid, optionally) at every boundary — before-first, between,
   after-last, both sides of a midpoint — and the dragged item's own slot is never
   double-counted (dropping where it started is a no-op).
6. **Cross-list movement is conserved.** Moving a key from A into B updates both
   provisionals (A loses it, B gains it); an empty connected list is a valid target
   (index 0); switching target lists mid-drag never duplicates or loses an item; and a
   committed cross-list move carries the item's element registration to its new list so
   it is immediately re-draggable from there.
7. **Keyboard parity.** A keyboard drag (Space grab, arrows move, Space drop, Esc cancel)
   produces the same provisional order, the same `changed` payload shape, and the same
   revert as the equivalent pointer drag, and emits an aria-live announcement as data.
8. **Pure, DOM-optional core.** Constructing an instance, registering lists with
   rects-as-data, and running the drop-index + reorder + keyboard logic must not throw
   with no `document`. Every browser API — pointer events, `getBoundingClientRect`,
   element scroll, `requestAnimationFrame` — is touched only inside method bodies behind
   capability checks, never at module scope.
9. **Reuses `shared/gestures.js`; dependency-free otherwise.** Pointer-drag activation
   (a press becomes a drag only past the move threshold — what separates a drag from a
   click) comes from the shared gesture recognizer in pan mode. Zero runtime dependencies
   beyond the in-repo `shared/` helpers (`Emitter`, `createGestureRecognizer`, `clamp`).

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/sortable-engine/sortable-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **37**).

The suite (`tests/sortable-engine/sortable-engine.test.mjs`, harness in
`tests/sortable-engine/harness.mjs`) builds "fake elements" — plain objects exposing only
`getBoundingClientRect` (and **no** `addEventListener`, so no DOM is touched) — and drives
the same controller the real bindings use. Coverage maps directly to the invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createSortable()` + `registerList` with rects-as-data run with no `document`; `getState()` is valid synchronously. |
| Import boundary | The engine imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| DOM-guard discipline | Every module-scope reference to a DOM global (`document`/`window`/`requestAnimationFrame`/`cancelAnimationFrame`) is `typeof`-guarded — no bare access that would throw at load. |
| Drop-index (vertical) | before-first, between, after-last, and both sides of an item midpoint (the tie rule: exactly at a midpoint inserts after). |
| Drop-index (horizontal) | mirrors vertical on the X axis. |
| Drop-index (grid) | row-major reading-order insertion for unambiguous placements (optional mode). |
| Empty list | empty candidate set → index 0. |
| Reorder splice | `reorderWithin` forward, backward, no-op (same index), and index clamping. |
| Reorder within a list | dragging to a pointer past an item commits the right order; to the top and bottom; cancel reverts. |
| Own slot | the dragged item's slot is removed from the candidates, so dropping at origin is a no-op and emits no `changed`. |
| Cross-list move | A→B at the right index; **empty** connected list → index 0; mid-drag A→B→A keeps both provisionals correct with no dup/loss; a committed cross-list move transfers the item's registration so it is re-draggable from B. |
| Drop outside | over no connected list the provisional returns home, `dropValid:false`, and a drop commits nothing. |
| Keyboard parity | grab → arrow → drop equals the pointer reorder (same order + identical `changed` payload); move up; **Esc reverts**; aria-live announcement on grab; cross-list ←/→ (kanban). |
| Disabled / locked | a disabled item (per-item flag or the `disabled` predicate) refuses the grab; leading/trailing **locked** (non-displaceable) items stay pinned. |
| `changed` payload | correct `{key,fromList,fromIndex,toList,toIndex}` for same-list and cross-list, via both a drag and the programmatic `move()`. |
| State emission | deferred initial emit reaches a synchronous subscriber; `subscribe` fires on change and `unsubscribe` stops it; the provisional order is visible in `getState()` mid-drag; cancel reverts it; `dragstart`/`dragend` fire around a drag. |
| `setItems` / sync | an external order change is reflected and emits; `setItems` during an active drag (or re-registering the list) cancels it cleanly with no corruption. |
| Config / lifecycle | `setOptions`/`setOrientation` update the snapshot; a horizontal list reorders end-to-end; FLIP offset hints are emitted for displaced items; `destroy()` is inert + idempotent; `getItems` reflects the live order. |

**Also confirm nothing else regressed** (each prints its own pass line):
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

Serve and open `http://localhost:8788/demo/sortable-engine.html`. The demo
(`demo/sortable-engine.js`) is a reference **consumer**: it renders four sortable UIs —
a vertical list, a kanban board, a handle list, and a tall auto-scroll list — entirely
from the engine's emitted order + drag-state, and owns all markup, CSS and DOM events.

Each check below was confirmed in a real browser session against this build by
dispatching genuine `PointerEvent`/`KeyboardEvent` sequences and asserting the resulting
DOM order, drag-state classes, scroll position, and emitted `changed` payloads.

1. **Drag to reorder a vertical list.** Pointer-down on a row, a move past the ~5px
   threshold lifts it: a `position:fixed` **clone** follows the pointer, the in-flow row
   becomes the **gap** (a dashed placeholder), and the other rows **slide** (consumer
   FLIP). Dragging "Intro" down ~3 rows produced the provisional order
   `[p2,p3,p4,p5,p1,p6]`, and pointer-up **committed** it and emitted
   `{key:'p1', fromList:'playlist', fromIndex:0, toList:'playlist', toIndex:4}`.
2. **Drag-vs-click threshold.** A 2px pointer move-and-release on a row left the order
   **unchanged** — a click is never hijacked. (The recognizer's pan threshold is the
   discriminator.) A real drag's trailing synthetic click is suppressed by a one-shot
   capture guard.
3. **Kanban cross-list drag, including an empty column.** Dragging "Spec the API" from
   *To do* over the **empty** *Done* column made *Done* the drop target (`is-target`) and
   the provisional showed it removed from *To do* and inserted into *Done* at index 0;
   the drop committed both lists and emitted `… todo[0] → done[0]`. **Re-dragging** that
   same card from *Done* into *In progress* then worked — proving the item's registration
   transferred with it (no dup, no loss; total cards conserved throughout).
4. **Drag handle.** In the handle list a big drag started from a row's **body** did
   **not** reorder (the body stays selectable); the same drag started from the **⠿ grip**
   reordered normally. Dragging requires the handle only when configured.
5. **Disabled + pinned (non-displaceable).** The *Pinned header* (disabled + locked) has
   no grip, can't be picked up, and stays first: dragging another row to the very top
   clamps below it (`[h0,h1,…]`, never `[h1,h0,…]`).
6. **Keyboard reordering.** Focusing a row and pressing **Space** grabbed it (the row
   highlights; the aria-live region announced *"Grabbed item p2. Position 2 of 6 …"*);
   **↓ ↓** moved it (provisional `[p1,p3,p4,p2,p5,p6]`); **Space** dropped it with the
   same `changed` payload shape as the pointer path. **Esc** reverts a grabbed drag. On
   the board, **← / →** move a grabbed card between columns.
7. **Auto-scroll.** Holding a drag at the bottom edge of the short scroll viewport
   scrolled it (`scrollTop` 0 → 364) so off-screen rows became reachable; dropping there
   landed "Row 1" at **index 10** — the drop index recomputed against the **new** scroll
   offset (the engine shifts the captured rects by the scroll delta), not a stale one.
8. **No console errors / warnings** at any point in the session.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing and reorders no DOM. These checks
confirm the boundary holds.

1. **No DOM, no CSS, no transforms in the engine.** `sortable-engine.js` contains no
   stylesheet, no markup, and no default sortable component. It creates **no element**
   and writes **no style/transform** to any consumer node. Its only DOM/geometry
   references — `addEventListener` (pointer/keydown on the handed-in item elements),
   `getBoundingClientRect`, `requestAnimationFrame`, and `scrollTop`/`scrollLeft` (the one
   exception: **driving** auto-scroll, which is behavior, not painting) — live inside
   methods behind `typeof`/capability checks; the clean Node import (Gate 1) proves none
   of it runs at module scope.
2. **The demo's UI is entirely consumer-rendered.** The lists, the cards, the lifted
   clone (a `position:fixed` element the consumer makes), the gap/placeholder, the kanban
   columns, the drag handles, the keyboard focus ring, the auto-scroll viewport, the
   "changed" log — every element, class, color, transform and FLIP animation lives in
   `demo/sortable-engine.html` / `demo/sortable-engine.js`. The engine is only handed the
   container + item elements (by reference) and read for state. Delete the demo and the
   engine is unchanged and still fully tested by Gate 1.
3. **The order is the source of truth; offsets are optional.** The demo re-renders each
   list purely from the emitted key order (`state.lists[].items`) and runs its **own**
   First-Last-Invert-Play to animate the slide — it does not even need the engine's
   offset hints. The engine applies no transform; the consumer animates if it wants.
4. **Swapping the rendering needs no engine change.** The consumer reads only emitted
   values — each list's `items` (key order), `orientation`, `group`, and the `drag` state
   (`active`, `key`, `sourceList`, `targetList`, `index`, `keyboard`, `grabbed`,
   `dropValid`, `pointer`, `position`, `announcement`, `offsets`). A completely different
   renderer (different markup, a React/Vue/Svelte binding, or none) consumes the same
   state with zero edits to the engine. The element-by-reference + key-based-order +
   state-out subscription are the only seam.

---

## 5. Known scope boundaries (by design)

- **No file drag-and-drop.** That is `drag-n-drop-engine` (OS files, native file-drop
  events). Sortable is on-page pointer-drag reorder — a different input.
- **No UI / list component / CSS.** Headless; the engine renders nothing. The polished
  sortable UI is the consumer's (or a product's) job.
- **No DOM reordering or transform application by the engine.** It emits the order (and
  optional per-item offset hints); the consumer renders. The single exception is driving
  auto-scroll on a scrollable container (behavior, not presentation).
- **No data ownership.** The engine emits key-based order changes + `changed` events; the
  consumer owns and updates its actual data model (and the key → content mapping).
- **Grid orientation is a baseline, not a full 2D engine.** Vertical and horizontal are
  the tested baseline; `grid` provides a reasonable row-major insertion for unambiguous
  placements. Dense/irregular grids (variable cell sizes, gaps) are out of scope.
- **Non-displaceable ("locked") is pinned-ends only.** Leading/trailing locked items stay
  put; a locked item in the *middle* of a list still shifts when items above it move.
  That covers pinned headers/footers; arbitrary mid-list pinning is out of scope.
- **No virtualization.** Sortable assumes items are rendered/registered; very long
  virtualized lists are a separate concern (combine with `virtualization-engine` in the
  consumer — sortable doesn't own windowing).
- **No framework or host coupling** — vanilla, element-by-reference, key-based order,
  state-out; no stores, services, routing, or design tokens.
