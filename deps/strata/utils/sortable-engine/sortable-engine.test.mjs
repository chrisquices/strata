// sortable-engine.test.mjs
// Pure unit tests for the drag-to-reorder engine. No DOM, no browser, no framework:
//   node sortable-engine/sortable-engine.test.mjs
//
// Importing sortable-engine.js here doubles as the headless-core design check: if the
// module touched document/window/requestAnimationFrame/getBoundingClientRect at top
// level, this import would throw in Node. It does not — that access lives inside methods
// behind capability guards. So everything below — the drop-index math, the reorder
// splice, cross-list movement, keyboard reordering, the "changed" payload, the order
// state model, revert — is reachable and deterministic with no `document`.
//
// The pointer-drag DOM wiring (pointer events through the gesture recognizer, long-press,
// handles, auto-scroll) is the browser gate (Gate 2). Here we drive the same
// input-agnostic drag controller (beginDrag / moveDragTo / moveDragBy / drop / cancel)
// that every input path funnels through, with rects supplied as plain data — exactly the
// shape the engine reads via getBoundingClientRect.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, testAsync, assert, isMain, report } from './harness.mjs';
import { createSortable, computeDropIndex, reorderWithin, Orientation } from './sortable-engine.js';

// ---- rects-as-data helpers (a "fake element": only getBoundingClientRect, no DOM) ----

/** A stand-in element that reports a fixed rect and has NO addEventListener (headless). */
const el = (left, top, width, height) => ({
  getBoundingClientRect: () => ({ left, top, right: left + width, bottom: top + height, width, height }),
});

const RH = 100; // row height used by the vertical fixtures

/**
 * Register a vertical list of stacked rows. Each item is RH tall and `w` wide at column
 * x. The container spans all rows. Returns nothing — call before a drag.
 */
function vlist(s, id, keys, { group = null, x = 0, w = 200 } = {}) {
  const items = keys.map((key, i) => ({ key, el: el(x, i * RH, w, RH) }));
  s.registerList(el(x, 0, w, Math.max(1, keys.length) * RH), { id, items, group, orientation: 'vertical' });
}

/** Register a horizontal list of side-by-side cells, each `cw` wide and `h` tall at row y. */
function hlist(s, id, keys, { group = null, y = 0, cw = 100, h = 100 } = {}) {
  const items = keys.map((key, i) => ({ key, el: el(i * cw, y, cw, h) }));
  s.registerList(el(0, y, Math.max(1, keys.length) * cw, h), { id, items, group, orientation: 'horizontal' });
}

const orderOf = (s, id) => s.getState().lists.find((l) => l.id === id).items;
const dragOf = (s) => s.getState().drag;
const flush = () => new Promise((r) => queueMicrotask(r));

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and constructs headless (no DOM)', () => {
  assert.equal(typeof document, 'undefined', 'no document in this runtime');
  const s = createSortable();
  assert.equal(typeof s.registerList, 'function');
  vlist(s, 'L', ['a', 'b', 'c']);
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c']);
  s.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./sortable-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const sp of specifiers) assert.ok(sp.startsWith('../shared/'), `import "${sp}" must come from ../shared/`);
});

test('every module-scope DOM reference is typeof-guarded (no bare global access at load)', () => {
  const src = readFileSync(fileURLToPath(new URL('./sortable-engine.js', import.meta.url)), 'utf8');
  const moduleScope = src.slice(0, src.indexOf('export function createSortable'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const domGlobal = /\b(document|window|requestAnimationFrame|cancelAnimationFrame|navigator)\b/;
  for (const line of moduleScope.split('\n')) {
    if (domGlobal.test(line)) assert.ok(/typeof/.test(line), `module-scope DOM reference must be typeof-guarded: ${line.trim()}`);
  }
});

test('getState() returns a valid empty state immediately after creation', () => {
  const s = createSortable({ orientation: 'horizontal', group: 'g' });
  const st = s.getState();
  assert.deepEqual(st.lists, []);
  assert.equal(st.drag.active, false);
  assert.equal(st.drag.key, null);
  assert.equal(st.config.orientation, 'horizontal');
  assert.equal(st.config.group, 'g');
  assert.equal(st.config.keyboard, true);
  s.destroy();
});

// ============================================================================
// Drop-index computation (pure computeDropIndex)
// ============================================================================

const rect = (left, top, w, h) => ({ left, top, right: left + w, bottom: top + h, width: w, height: h });

test('vertical drop index: before-first, between, after-last', () => {
  const rects = [rect(0, 0, 100, 100), rect(0, 100, 100, 100), rect(0, 200, 100, 100)]; // mids 50,150,250
  assert.equal(computeDropIndex(rects, { x: 50, y: 10 }, Orientation.VERTICAL), 0, 'above first mid → 0');
  assert.equal(computeDropIndex(rects, { x: 50, y: 120 }, Orientation.VERTICAL), 1, 'between mid0 and mid1 → 1');
  assert.equal(computeDropIndex(rects, { x: 50, y: 220 }, Orientation.VERTICAL), 2, 'between mid1 and mid2 → 2');
  assert.equal(computeDropIndex(rects, { x: 50, y: 290 }, Orientation.VERTICAL), 3, 'below last mid → length');
});

test('vertical drop index: both sides of an item midpoint', () => {
  const rects = [rect(0, 0, 100, 100), rect(0, 100, 100, 100)]; // mids 50, 150
  assert.equal(computeDropIndex(rects, { x: 50, y: 49 }, Orientation.VERTICAL), 0, 'just above mid0 → before it');
  assert.equal(computeDropIndex(rects, { x: 50, y: 50 }, Orientation.VERTICAL), 1, 'exactly at mid0 → after it (tie rule)');
  assert.equal(computeDropIndex(rects, { x: 50, y: 51 }, Orientation.VERTICAL), 1, 'just below mid0 → after it');
});

test('horizontal drop index mirrors vertical on the X axis', () => {
  const rects = [rect(0, 0, 100, 100), rect(100, 0, 100, 100), rect(200, 0, 100, 100)]; // mids 50,150,250
  assert.equal(computeDropIndex(rects, { x: 10, y: 50 }, Orientation.HORIZONTAL), 0);
  assert.equal(computeDropIndex(rects, { x: 120, y: 50 }, Orientation.HORIZONTAL), 1);
  assert.equal(computeDropIndex(rects, { x: 290, y: 50 }, Orientation.HORIZONTAL), 3);
});

test('empty candidate list yields index 0 (empty list / empty column)', () => {
  assert.equal(computeDropIndex([], { x: 5, y: 5 }, Orientation.VERTICAL), 0);
  assert.equal(computeDropIndex([], { x: 5, y: 5 }, Orientation.HORIZONTAL), 0);
});

test('grid drop index: row-major reading order (optional mode)', () => {
  // 2x2 grid: 0,1 on row0 (y 0..100); 2,3 on row1 (y 100..200); cols x 0..100, 100..200.
  const rects = [rect(0, 0, 100, 100), rect(100, 0, 100, 100), rect(0, 100, 100, 100), rect(100, 100, 100, 100)];
  assert.equal(computeDropIndex(rects, { x: 10, y: 10 }, Orientation.GRID), 0, 'top-left → before all');
  assert.equal(computeDropIndex(rects, { x: 120, y: 10 }, Orientation.GRID), 1, 'right of cell0, row0 → 1');
  assert.equal(computeDropIndex(rects, { x: 10, y: 110 }, Orientation.GRID), 2, 'left of cell2, row1 → 2');
  assert.equal(computeDropIndex(rects, { x: 190, y: 190 }, Orientation.GRID), 4, 'bottom-right → after all');
});

// ============================================================================
// Reorder splice (pure reorderWithin)
// ============================================================================

test('reorderWithin: forward, backward, no-op, clamped', () => {
  assert.deepEqual(reorderWithin(['a', 'b', 'c', 'd'], 0, 2), ['b', 'c', 'a', 'd'], 'forward');
  assert.deepEqual(reorderWithin(['a', 'b', 'c', 'd'], 3, 1), ['a', 'd', 'b', 'c'], 'backward');
  assert.deepEqual(reorderWithin(['a', 'b', 'c', 'd'], 2, 2), ['a', 'b', 'c', 'd'], 'same index → unchanged');
  assert.deepEqual(reorderWithin(['a', 'b', 'c'], 0, 99), ['b', 'c', 'a'], 'to-index clamped to end');
  assert.deepEqual(reorderWithin([], 0, 1), [], 'empty stays empty');
});

// ============================================================================
// Reorder within a list (drive the controller with rects-as-data)
// ============================================================================

test('drag within a list: pointer past an item commits the new order', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  assert.equal(s.beginDrag('b'), true);
  s.moveDragTo({ x: 100, y: 250 }); // midpoint region of c (200..300)
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c', 'b', 'd'], 'provisional: b moved past c');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c', 'b', 'd'], 'committed on drop');
  assert.equal(dragOf(s).active, false);
  s.destroy();
});

test("dragged item's own slot is not double-counted (drop at origin = no change)", () => {
  const s = createSortable();
  let changed = 0;
  s.on('changed', () => changed++);
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 150 }); // b's ORIGINAL slot (100..200)
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'provisional equals original');
  assert.equal(dragOf(s).index, 1, 'index back at origin');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd']);
  assert.equal(changed, 0, 'dropping where it started emits no "changed"');
  s.destroy();
});

test('drag to the very top and very bottom of a list', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('c');
  s.moveDragTo({ x: 100, y: 10 }); // above a's midpoint
  assert.deepEqual(orderOf(s, 'L'), ['c', 'a', 'b', 'd'], 'to the front');
  s.moveDragTo({ x: 100, y: 390 }); // below d's midpoint
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'd', 'c'], 'to the end');
  s.cancel();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'cancel reverts');
  s.destroy();
});

// ============================================================================
// Cross-list movement (connected lists)
// ============================================================================

test('move a key from list A into list B at the right index', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y', 'z'], { group: 'board', x: 300 });
  let payload = null;
  s.on('changed', (p) => (payload = p));
  s.beginDrag('b');
  s.moveDragTo({ x: 400, y: 150 }); // over B, y in y's slot (100..200) → before z (index 2)
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c'], 'A loses b (provisional)');
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'b', 'z'], 'B gains b at index 2 (provisional)');
  s.drop();
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c']);
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'b', 'z']);
  assert.deepEqual(payload, { key: 'b', fromList: 'A', fromIndex: 1, toList: 'B', toIndex: 2 });
  s.destroy();
});

test('empty connected list is a valid drop target (index 0)', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b'], { group: 'board', x: 0 });
  s.registerList(el(300, 0, 200, 300), { id: 'B', items: [], group: 'board', orientation: 'vertical' });
  s.beginDrag('a');
  s.moveDragTo({ x: 400, y: 150 }); // over empty B
  assert.deepEqual(orderOf(s, 'A'), ['b']);
  assert.deepEqual(orderOf(s, 'B'), ['a'], 'dropped into empty column at index 0');
  s.drop();
  assert.deepEqual(orderOf(s, 'B'), ['a']);
  s.destroy();
});

test('switching target lists mid-drag keeps both provisionals correct — no duplication/loss', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y', 'z'], { group: 'board', x: 300 });
  s.beginDrag('b');
  s.moveDragTo({ x: 400, y: 40 });  // into B, above x's midpoint → front
  assert.deepEqual(orderOf(s, 'B'), ['b', 'x', 'y', 'z']);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c']);
  s.moveDragTo({ x: 100, y: 250 }); // back into A
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'z'], 'B no longer holds b');
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c', 'b'], 'b is back in A only');
  // total keys across lists is always exactly the original set, no dup/loss
  const all = [...orderOf(s, 'A'), ...orderOf(s, 'B')].sort();
  assert.deepEqual(all, ['a', 'b', 'c', 'x', 'y', 'z']);
  s.cancel();
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c']);
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'z']);
  s.destroy();
});

test('cross-list drop carries the item registration (re-draggable from its new list)', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y'], { group: 'board', x: 300 });
  s.beginDrag('b');
  s.moveDragTo({ x: 400, y: 40 }); // into B at the front
  s.drop();
  assert.deepEqual(orderOf(s, 'B'), ['b', 'x', 'y']);
  // b now lives in B — picking it up again must succeed (its registration moved with it)
  assert.equal(s.beginDrag('b'), true, 'b is draggable from its new list');
  assert.equal(dragOf(s).sourceList, 'B', 'the engine sees b as belonging to B now');
  s.moveDragBy(2); // shuffle within B
  s.drop();
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'b']);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c']);
  s.destroy();
});

test('dragging over an unconnected area reverts the provisional (drop outside → no change)', () => {
  const s = createSortable(); // no group → A is reorder-only
  vlist(s, 'A', ['a', 'b', 'c'], { x: 0 });
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 250 });   // valid, within A
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c', 'b']);
  s.moveDragTo({ x: 999, y: 999 });   // outside any list
  assert.equal(dragOf(s).dropValid, false, 'drop here would revert');
  assert.equal(dragOf(s).targetList, null);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c'], 'gap returns home');
  s.drop();
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c'], 'drop outside committed nothing');
  s.destroy();
});

// ============================================================================
// Keyboard reordering (index-based; no rects needed)
// ============================================================================

test('keyboard grab → arrow → drop matches the equivalent pointer reorder + changed shape', () => {
  // pointer reference: b → index 3
  const ref = createSortable();
  vlist(ref, 'L', ['a', 'b', 'c', 'd']);
  let pPayload = null; ref.on('changed', (p) => (pPayload = p));
  ref.beginDrag('b');
  ref.moveDragTo({ x: 100, y: 390 });
  ref.drop();
  assert.deepEqual(orderOf(ref, 'L'), ['a', 'c', 'd', 'b']);

  // keyboard: grab b, ArrowDown twice, drop
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  let kPayload = null; s.on('changed', (p) => (kPayload = p));
  assert.equal(s.beginDrag('b', { keyboard: true }), true);
  assert.equal(dragOf(s).keyboard, true);
  assert.equal(dragOf(s).grabbed, true);
  assert.ok(dragOf(s).announcement && dragOf(s).announcement.includes('Grabbed'), 'announces the grab for aria-live');
  s.moveDragBy(1);
  s.moveDragBy(1);
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c', 'd', 'b'], 'provisional tracks each step');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c', 'd', 'b'], 'same final order as the pointer drag');
  assert.deepEqual(kPayload, pPayload, 'identical "changed" payload shape');
  assert.deepEqual(kPayload, { key: 'b', fromList: 'L', fromIndex: 1, toList: 'L', toIndex: 3 });
  ref.destroy(); s.destroy();
});

test('keyboard move up, and Esc reverts to the pre-grab order', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('c', { keyboard: true });
  s.moveDragBy(-1);
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c', 'b', 'd']);
  s.moveDragBy(-1);
  assert.deepEqual(orderOf(s, 'L'), ['c', 'a', 'b', 'd']);
  s.cancel(); // Esc
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'reverts');
  assert.equal(dragOf(s).active, false);
  s.destroy();
});

test('keyboard cross-list move (kanban) shifts the item to the adjacent connected list', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y', 'z'], { group: 'board', x: 300 });
  let payload = null; s.on('changed', (p) => (payload = p));
  s.beginDrag('b', { keyboard: true }); // index 1 in A
  s.moveDragToList(1);                   // → list B near index 1
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c']);
  assert.deepEqual(orderOf(s, 'B'), ['x', 'b', 'y', 'z']);
  s.drop();
  assert.deepEqual(payload, { key: 'b', fromList: 'A', fromIndex: 1, toList: 'B', toIndex: 1 });
  s.destroy();
});

// ============================================================================
// Disabled + locked items
// ============================================================================

test('disabled items cannot be picked up', () => {
  const s = createSortable();
  s.registerList(el(0, 0, 200, 300), {
    id: 'L', orientation: 'vertical',
    items: [{ key: 'a', el: el(0, 0, 200, 100) }, { key: 'b', el: el(0, 100, 200, 100), disabled: true }, { key: 'c', el: el(0, 200, 200, 100) }],
  });
  assert.equal(s.beginDrag('b'), false, 'disabled item refuses the grab');
  assert.equal(dragOf(s).active, false);
  assert.equal(s.beginDrag('a'), true, 'a normal item still drags');
  s.cancel();
  s.destroy();
});

test('disabled predicate (option) blocks the grab too', () => {
  const s = createSortable({ disabled: (key) => key === 'locked-one' });
  vlist(s, 'L', ['locked-one', 'b', 'c']);
  assert.equal(s.beginDrag('locked-one'), false);
  assert.equal(s.beginDrag('b'), true);
  s.cancel();
  s.destroy();
});

test('locked (non-displaceable) leading/trailing items stay pinned', () => {
  const s = createSortable();
  s.registerList(el(0, 0, 200, 400), {
    id: 'L', orientation: 'vertical',
    items: [
      { key: 'pinTop', el: el(0, 0, 200, 100), locked: true },
      { key: 'b', el: el(0, 100, 200, 100) },
      { key: 'c', el: el(0, 200, 200, 100) },
      { key: 'pinBot', el: el(0, 300, 200, 100), locked: true },
    ],
  });
  s.beginDrag('c');
  s.moveDragTo({ x: 100, y: 10 });   // would be index 0, but pinTop is locked
  assert.deepEqual(orderOf(s, 'L'), ['pinTop', 'c', 'b', 'pinBot'], 'cannot pass the pinned-top item');
  s.moveDragTo({ x: 100, y: 390 });  // would be the end, but pinBot is locked
  assert.deepEqual(orderOf(s, 'L'), ['pinTop', 'b', 'c', 'pinBot'], 'cannot pass the pinned-bottom item');
  s.cancel();
  s.destroy();
});

// ============================================================================
// "changed" payload via the programmatic move()
// ============================================================================

test('move(): same-list programmatic reorder emits the right changed payload', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  let payload = null; s.on('changed', (p) => (payload = p));
  s.move('a', 'L', 2);
  assert.deepEqual(orderOf(s, 'L'), ['b', 'c', 'a', 'd']);
  assert.deepEqual(payload, { key: 'a', fromList: 'L', fromIndex: 0, toList: 'L', toIndex: 2 });
  s.destroy();
});

test('move(): cross-list programmatic move emits the right changed payload', () => {
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y'], { group: 'board', x: 300 });
  let payload = null; s.on('changed', (p) => (payload = p));
  s.move('a', 'B', 1);
  assert.deepEqual(orderOf(s, 'A'), ['b', 'c']);
  assert.deepEqual(orderOf(s, 'B'), ['x', 'a', 'y']);
  assert.deepEqual(payload, { key: 'a', fromList: 'A', fromIndex: 0, toList: 'B', toIndex: 1 });
  s.destroy();
});

test('regression: move() during an active drag cancels it (drop does not override the move)', () => {
  // move() mutated the keys under an active drag WITHOUT cancelling, leaving drag.preDrag
  // holding the pre-drag snapshot. drop() then rebuilt from that snapshot and silently
  // reverted the move() the consumer had already been told about via 'changed'.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 250 }); // provisional shifts under the active drag
  assert.equal(dragOf(s).active, true);
  s.move('a', 'L', 3); // programmatic reorder of a non-dragged key mid-drag
  assert.equal(dragOf(s).active, false, 'move() cancels the stale drag');
  assert.deepEqual(orderOf(s, 'L'), ['b', 'c', 'd', 'a'], 'the move is applied');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['b', 'c', 'd', 'a'], 'drop does NOT override the move with a stale snapshot');
  s.destroy();
});

test('regression: move() of the dragged key cross-list cancels the drag (no key duplication)', () => {
  // move()ing the DRAGGED key into another group list while the drag held A's stale snapshot
  // used to resurrect the key from A on drop() — leaving the key duplicated across two lists.
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y'], { group: 'board', x: 300 });
  s.beginDrag('b'); // grab b in A
  assert.equal(dragOf(s).active, true);
  s.move('b', 'B', 0); // move the dragged key into B
  assert.equal(dragOf(s).active, false, 'moving the dragged key cancels the drag');
  s.drop(); // must be a no-op against the cancelled drag
  assert.deepEqual(orderOf(s, 'A'), ['a', 'c'], 'b is gone from A (no resurrection)');
  assert.deepEqual(orderOf(s, 'B'), ['b', 'x', 'y'], 'b lives only in B');
  s.destroy();
});

test('regression: registerItem() during an active drag cancels it (new key not discarded on drop)', () => {
  // registerItem() spliced a new key into the list under an active drag WITHOUT cancelling.
  // drop() rebuilt the committed order from the pre-drag snapshot, silently discarding the
  // freshly registered key the consumer's data already expected.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 250 });
  assert.equal(dragOf(s).active, true);
  s.registerItem(null, 'NEW', 'L'); // consumer adds an item mid-drag
  assert.equal(dragOf(s).active, false, 'registerItem cancels the stale drag');
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'NEW'], 'the new key is present');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'NEW'], 'drop does NOT discard the newly registered key');
  s.destroy();
});

// ============================================================================
// State emission / subscription
// ============================================================================

testAsync('deferred initial emit reaches a synchronous subscriber', async () => {
  const s = createSortable();
  let got = null;
  s.subscribe((st) => (got = st));
  vlist(s, 'L', ['a', 'b']);
  assert.equal(got, null, 'no synchronous emit yet (deferred a microtask)');
  await flush();
  assert.ok(got, 'subscriber received the deferred state');
  assert.deepEqual(got.lists.find((l) => l.id === 'L').items, ['a', 'b']);
  s.destroy();
});

test('subscribe fires on a (synchronous) change; unsubscribe stops it', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  let n = 0;
  const off = s.subscribe(() => n++);
  s.move('a', 'L', 2);
  assert.equal(n, 1, 'fired on the reorder');
  off();
  s.move('a', 'L', 0);
  assert.equal(n, 1, 'no longer firing after unsubscribe');
  s.destroy();
});

test('provisional order is visible in getState() during a drag; cancel reverts it', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('a');
  s.moveDragTo({ x: 100, y: 250 });
  assert.deepEqual(s.getState().lists[0].items, ['b', 'c', 'a'], 'provisional in state');
  assert.equal(s.getState().drag.active, true);
  s.cancel();
  assert.deepEqual(s.getState().lists[0].items, ['a', 'b', 'c'], 'reverted');
  assert.equal(s.getState().drag.active, false);
  s.destroy();
});

test('dragstart and dragend events fire around a drag', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  const seen = [];
  s.on('dragstart', () => seen.push('start'));
  s.on('dragend', (e) => seen.push(`end:${e.committed}`));
  s.beginDrag('a');
  s.moveDragTo({ x: 100, y: 250 });
  s.drop();
  assert.deepEqual(seen, ['start', 'end:true']);
  s.destroy();
});

// ============================================================================
// setItems / external sync
// ============================================================================

test('setItems replaces a list order and emits', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  let n = 0; s.subscribe(() => n++);
  s.setItems('L', ['c', 'b', 'a', 'd']);
  assert.deepEqual(orderOf(s, 'L'), ['c', 'b', 'a', 'd']);
  assert.equal(n, 1);
  s.destroy();
});

test('setItems during an active drag cancels it cleanly (no corruption)', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('a');
  s.moveDragTo({ x: 100, y: 250 }); // provisional [b,c,a]
  assert.equal(dragOf(s).active, true);
  s.setItems('L', ['x', 'y', 'z']); // external data change mid-drag
  assert.equal(dragOf(s).active, false, 'drag was cancelled cleanly');
  assert.deepEqual(orderOf(s, 'L'), ['x', 'y', 'z'], 'new order applied, not corrupted by the aborted drag');
  s.destroy();
});

test('re-registering a list replaces it without leaking an active drag', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('a');
  assert.equal(dragOf(s).active, true);
  vlist(s, 'L', ['p', 'q']); // re-register same id mid-drag
  assert.equal(dragOf(s).active, false, 'active drag on the replaced list was cancelled');
  assert.deepEqual(orderOf(s, 'L'), ['p', 'q']);
  s.destroy();
});

test('regression: unregisterItem of the dragged key cancels the drag (no resurrection on drop)', () => {
  // unregisterItem used to mutate the list under an active drag WITHOUT cancelling, leaving
  // drag.preDrag holding the pre-drag snapshot that still contained the removed key. drop()
  // then rebuilt from that snapshot and resurrected the deleted key in the committed order.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 250 }); // move it (provisional shifts)
  assert.equal(dragOf(s).active, true);
  s.unregisterItem('b', 'L'); // consumer deletes the dragged item from its data
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c'], "b removed from the list's order");
  assert.equal(dragOf(s).active, false, 'removing the dragged key cancels the drag');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'c'], 'drop does NOT resurrect the deleted key');
  s.destroy();
});

test('regression: unregisterItem of a non-dragged key in the source list also cancels the stale drag', () => {
  // Any mutation of a list under an active drag invalidates the captured snapshot, not just
  // removing the dragged key — mirror setItems/unregisterList and cancel for the whole list.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.beginDrag('b');
  s.moveDragTo({ x: 100, y: 250 });
  assert.equal(dragOf(s).active, true);
  s.unregisterItem('a', 'L'); // a different key removed while b is mid-drag
  assert.equal(dragOf(s).active, false, 'mutating the source list mid-drag cancels the drag');
  assert.deepEqual(orderOf(s, 'L'), ['b', 'c'], 'order reflects the removal, uncorrupted');
  s.destroy();
});

test('regression: beginDrag finite-guards a non-finite pointer (no NaN poisoning of grabOffset/position)', () => {
  // grabOffset is captured ONCE at grab and never recomputed; a non-finite pointer would
  // poison grabOffset and every later position permanently. beginDrag must reject the grab.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);

  // NaN x: the grab is refused and no drag state lingers.
  assert.equal(s.beginDrag('c', { pointer: { x: NaN, y: 50 } }), false, 'non-finite pointer.x refuses the grab');
  assert.equal(dragOf(s).active, false, 'no active drag left behind by the refused grab');

  // Infinity y is non-finite too → also refused.
  assert.equal(s.beginDrag('c', { pointer: { x: 0, y: Infinity } }), false, 'non-finite pointer.y refuses the grab');
  assert.equal(dragOf(s).active, false);

  // A clean pointer still grabs, and a subsequent move yields a finite position.
  assert.equal(s.beginDrag('c', { pointer: { x: 0, y: 200 } }), true, 'finite pointer still grabs');
  s.moveDragTo({ x: 100, y: 250 });
  const pos = dragOf(s).position;
  assert.equal(Number.isFinite(pos.x) && Number.isFinite(pos.y), true, 'position stays finite after a clean grab+move');
  s.cancel();
  s.destroy();
});

test('regression: moveDragTo finite-guards a non-finite pointer (keeps last good pointer/position through refresh)', () => {
  // moveDragTo feeds the same fields beginDrag guards (drag.pointer, drag.position). A
  // non-finite move must be ignored so the last good pointer/position is retained — and
  // because refresh() re-invokes moveDragTo(drag.pointer), a poisoned pointer would survive
  // the whole drag.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);

  s.beginDrag('a', { pointer: { x: 0, y: 0 } });
  s.moveDragTo({ x: 100, y: 250 }); // a clean move sets a finite pointer/position
  const good = dragOf(s).position;
  assert.equal(Number.isFinite(good.x) && Number.isFinite(good.y), true, 'clean move yields finite position');

  // NaN pointer: ignored, the last good pointer/position is unchanged.
  s.moveDragTo({ x: NaN, y: 250 });
  let now = dragOf(s);
  assert.deepEqual(now.pointer, { x: 100, y: 250 }, 'NaN.x move is ignored, pointer retained');
  assert.deepEqual(now.position, good, 'NaN.x move is ignored, position retained');

  // Infinity pointer: also ignored.
  s.moveDragTo({ x: 100, y: Infinity });
  now = dragOf(s);
  assert.deepEqual(now.pointer, { x: 100, y: 250 }, 'Infinity.y move is ignored, pointer retained');
  assert.equal(Number.isFinite(now.position.x) && Number.isFinite(now.position.y), true, 'position stays finite');

  // refresh() re-feeds drag.pointer through moveDragTo — it must stay finite, not re-poison.
  s.refresh();
  now = dragOf(s);
  assert.equal(Number.isFinite(now.position.x) && Number.isFinite(now.position.y), true, 'position stays finite after refresh');

  s.cancel();
  s.destroy();
});

// ============================================================================
// Config + lifecycle
// ============================================================================

test('setOptions / setOrientation update the config snapshot', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b']);
  s.setOptions({ threshold: 12, longPressDelay: 200 });
  assert.equal(s.getState().config.threshold, 12);
  assert.equal(s.getState().config.longPressDelay, 200);
  s.setOrientation('L', 'horizontal');
  assert.equal(s.getState().lists[0].orientation, 'horizontal');
  s.destroy();
});

test('regression: setOrientation throws TypeError on an unknown orientation (no silent no-op)', () => {
  // An unknown enum is a programming error: throw rather than silently keep the prior axis,
  // matching the repo's throw-on-unknown-enum convention (setIntersectMode, validateFitMode).
  const s = createSortable();
  vlist(s, 'L', ['a', 'b']);
  s.setOrientation('L', 'horizontal'); // a valid per-list set still works
  assert.equal(s.getState().lists[0].orientation, 'horizontal');

  // Global form: a typo'd axis throws and does NOT mutate config.orientation.
  const before = s.getState().config.orientation;
  assert.throws(() => s.setOrientation('horizonal'), TypeError, 'unknown global orientation throws TypeError');
  assert.equal(s.getState().config.orientation, before, 'config orientation unchanged after the throw');

  // Per-list form: a typo'd axis throws and does NOT mutate the list orientation.
  assert.throws(() => s.setOrientation('L', 'badAxis'), TypeError, 'unknown per-list orientation throws TypeError');
  assert.equal(s.getState().lists[0].orientation, 'horizontal', 'list orientation unchanged after the throw');

  // A valid global set still applies normally.
  s.setOrientation('grid');
  assert.equal(s.getState().config.orientation, 'grid');
  s.destroy();
});

test('regression: buildConfig/registerList throw TypeError on an explicit unknown orientation (no silent reset to vertical)', () => {
  // The sibling entry points that read the orientation enum (constructor → buildConfig,
  // setOptions → buildConfig, registerList) used to silently fall back to vertical on a
  // typo, contradicting setOrientation (which throws). The most damaging path is setOptions:
  // a typo'd axis must NOT silently discard a previously-set 'horizontal'/'grid'.

  // Constructor: an explicit typo throws rather than silently constructing a vertical list.
  assert.throws(() => createSortable({ orientation: 'horizonal' }), TypeError, 'createSortable(typo) throws TypeError');

  // setOptions: a typo throws and leaves the prior valid axis intact (no silent reset).
  const s = createSortable({ orientation: 'horizontal' });
  vlist(s, 'L', ['a', 'b']);
  assert.equal(s.getState().config.orientation, 'horizontal');
  assert.throws(() => s.setOptions({ orientation: 'horizonal' }), TypeError, 'setOptions(typo) throws TypeError');
  assert.equal(s.getState().config.orientation, 'horizontal', 'config.orientation unchanged after the throw (not reset to vertical)');

  // setOptions with a valid axis still applies; an omitted orientation keeps the current one.
  s.setOptions({ orientation: 'grid' });
  assert.equal(s.getState().config.orientation, 'grid');
  s.setOptions({ threshold: 9 });
  assert.equal(s.getState().config.orientation, 'grid', 'omitted orientation in a patch keeps the current axis');

  // registerList: an explicit per-list typo throws; an omitted override inherits config.
  assert.throws(
    () => s.registerList(el(0, 0, 200, 200), { id: 'BAD', orientation: 'badAxis' }),
    TypeError,
    'registerList(typo) throws TypeError',
  );
  s.registerList(el(0, 0, 200, 200), { id: 'INH', items: [] });
  assert.equal(s.getState().lists.find((l) => l.id === 'INH').orientation, 'grid', 'omitted per-list orientation inherits config.orientation');
  s.destroy();
});

test('horizontal list reorders on the X axis end-to-end', () => {
  const s = createSortable({ orientation: 'horizontal' });
  hlist(s, 'H', ['a', 'b', 'c', 'd']);
  s.beginDrag('a');
  s.moveDragTo({ x: 250, y: 50 }); // past c's midpoint (200..300 → mid 250) — tie → after c
  assert.deepEqual(orderOf(s, 'H'), ['b', 'c', 'a', 'd']);
  s.drop();
  assert.deepEqual(orderOf(s, 'H'), ['b', 'c', 'a', 'd']);
  s.destroy();
});

test('FLIP offset hints are emitted for displaced items (optional convenience)', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('a');
  s.moveDragTo({ x: 100, y: 250 }); // a → after c; b and c slide up one row
  const offs = dragOf(s).offsets.L;
  assert.ok(offs, 'offsets present for the list');
  assert.equal(offs.b.y, -RH, 'b slides up one row');
  assert.equal(offs.c.y, -RH, 'c slides up one row');
  assert.equal(offs.d && offs.d.y || 0, 0, 'd does not move');
  s.cancel();
  s.destroy();
});

test('destroy() makes the instance inert and is safe to call twice', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b']);
  let n = 0; s.subscribe(() => n++);
  s.destroy();
  s.destroy(); // idempotent
  const before = n;
  s.move('a', 'L', 1); // post-destroy is a no-op
  assert.equal(n, before, 'no emissions after destroy');
  s.destroy();
});

test('getItems reflects the live order', () => {
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  assert.deepEqual(s.getItems('L'), ['a', 'b', 'c']);
  s.move('c', 'L', 0);
  assert.deepEqual(s.getItems('L'), ['c', 'a', 'b']);
  assert.deepEqual(s.getItems('nope'), []);
  s.destroy();
});

// ----------------------------------------------------------------------------
// ---- regressions from the audit/refactor pass ------------------------------

test('regression: a cross-list drop rebinds the moved item to the destination list', () => {
  // The carried registration used to keep listeners whose closures pointed at the
  // SOURCE list record; a later drag of the moved item consulted stale state.
  const listeners = [];
  const fakeElement = (left, top) => ({
    addEventListener: (type, handler) => listeners.push({ type, handler }),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 20, width: 100, height: 20 }),
  });
  const s = createSortable({ group: 'g' });
  const elA = fakeElement(0, 0);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) }, { id: 'A', items: [{ key: 'x', el: elA }] });
  s.registerList({ getBoundingClientRect: () => ({ left: 200, top: 0, right: 300, bottom: 100, width: 100, height: 100 }) }, { id: 'B', items: [] });
  const boundBefore = listeners.length;
  s.beginDrag('x', { pointer: { x: 10, y: 10 } });
  s.moveDragTo({ x: 250, y: 10 }); // over list B
  s.drop();
  assert.deepEqual(s.getItems('B'), ['x'], 'moved to B');
  assert.ok(listeners.length > boundBefore, 'item listeners were re-bound after the cross-list move');
  s.destroy();
});

test('regression: programmatic cross-list move() re-binds the moved item to the destination', () => {
  // The drag drop() path was fixed to re-bind, but move() carried the source record
  // into dst without re-binding, so the item kept SOURCE-bound listeners whose closures
  // consulted stale registration state (handle / (key,listId) predicate against the wrong list).
  const listeners = [];
  const fakeElement = (left, top) => ({
    addEventListener: (type, handler) => listeners.push({ type, handler }),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 20, width: 100, height: 20 }),
  });
  // Predicate disables x ONLY in A; once moved to B it should be draggable.
  const s = createSortable({ group: 'g', disabled: (key, listId) => key === 'x' && listId === 'A' });
  const elX = fakeElement(0, 0);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) }, { id: 'A', items: [{ key: 'x', el: elX }] });
  s.registerList({ getBoundingClientRect: () => ({ left: 200, top: 0, right: 300, bottom: 100, width: 100, height: 100 }) }, { id: 'B', items: [] });
  const boundBefore = listeners.length;
  s.move('x', 'B', 0);
  assert.deepEqual(s.getItems('B'), ['x'], 'moved to B');
  assert.ok(listeners.length > boundBefore, 'item listeners were re-bound after the programmatic cross-list move');

  // The keydown handler bound for B must consult canDrag('x','B') (not the stale 'A'),
  // so a Space grab succeeds (the predicate only blocks x in A).
  const keydown = listeners[listeners.length - 1];
  assert.equal(keydown.type, 'keydown', 'the last re-bound listener is the keydown handler');
  let dragstarted = false; s.on('dragstart', () => (dragstarted = true));
  keydown.handler({ key: ' ', preventDefault() {} });
  assert.ok(dragstarted, 'keyboard grab from B succeeds (no stale source-list disabled predicate)');
  assert.equal(dragOf(s).active, true, 'a drag is active after the keyboard grab');
  s.destroy();
});

test('regression: autoScroll.speed/edge reject NaN (finite-and-positive guard, not bare typeof)', () => {
  // A bare `typeof x === 'number'` check passes NaN; NaN speed would write NaN into the
  // consumer container's scrollTop. The guard must fall back to the defaults (12 / 60).
  const s = createSortable({ autoScroll: { speed: NaN, edge: NaN } });
  const snap = s.getState().config.autoScroll;
  assert.equal(snap.speed, 12, 'NaN speed falls back to the default');
  assert.equal(snap.edge, 60, 'NaN edge falls back to the default');

  // End-to-end: with a NaN-guarded config, one auto-scroll tick must NOT write NaN.
  const realRaf = globalThis.requestAnimationFrame;
  const realCaf = globalThis.cancelAnimationFrame;
  let queuedTick = null;
  globalThis.requestAnimationFrame = (fn) => { queuedTick = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { queuedTick = null; };
  try {
    const s2 = createSortable({ autoScroll: { speed: NaN, edge: 60 } });
    // Fake scroll container that reports a rect and tracks scrollTop.
    const scrollEl = {
      scrollTop: 0, scrollLeft: 0,
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 }),
    };
    const items = [{ key: 'a', el: el(0, 0, 200, 100) }, { key: 'b', el: el(0, 100, 200, 100) }];
    s2.registerList(el(0, 0, 200, 200), { id: 'L', items, orientation: 'vertical', scrollEl });
    s2.beginDrag('a');
    s2.moveDragTo({ x: 100, y: 195 }); // inside the bottom edge band -> arms auto-scroll
    assert.equal(typeof queuedTick, 'function', 'auto-scroll loop armed');
    queuedTick(); // run one frame
    assert.ok(Number.isFinite(scrollEl.scrollTop), `scrollTop stays finite, got ${scrollEl.scrollTop}`);
    s2.destroy();
  } finally {
    globalThis.requestAnimationFrame = realRaf;
    globalThis.cancelAnimationFrame = realCaf;
  }
});

test('regression: auto-scroll tick finite-guards scrollTop — a NaN scrollTop never poisons captured rects', () => {
  // scrollEl is consumer-supplied; its scrollTop getter is consumer/DOM-controlled. A
  // misbehaving container that reports a non-finite scrollTop used to flow unguarded into
  // beforeTop/deltaY, so the no-progress short-circuit (deltaX===0 && deltaY===0) failed
  // (NaN !== 0) and `rect.top -= deltaY` poisoned every captured rect to NaN permanently,
  // degrading computeDropIndex to insert-at-end for the rest of the drag. scrollLeft was
  // already guarded via `|| 0`; scrollTop must use the same finite-coercing fallback.
  const realRaf = globalThis.requestAnimationFrame;
  const realCaf = globalThis.cancelAnimationFrame;
  let queuedTick = null;
  globalThis.requestAnimationFrame = (fn) => { queuedTick = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { queuedTick = null; };
  try {
    const s = createSortable({ autoScroll: { speed: 12, edge: 60 } });
    // Scroll container whose scrollTop getter returns NaN (e.g. an odd/stub container).
    const scrollEl = {
      scrollLeft: 0,
      get scrollTop() { return NaN; },
      set scrollTop(_v) { /* swallow the write; the getter still reports NaN */ },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 }),
    };
    const items = [{ key: 'a', el: el(0, 0, 200, 100) }, { key: 'b', el: el(0, 100, 200, 100) }];
    s.registerList(el(0, 0, 200, 200), { id: 'L', items, orientation: 'vertical', scrollEl });
    s.beginDrag('a');
    s.moveDragTo({ x: 100, y: 195 }); // inside the bottom edge band -> arms auto-scroll
    assert.equal(typeof queuedTick, 'function', 'auto-scroll loop armed');
    queuedTick(); // run one frame: with the guard, deltaY is 0 (no progress), so no rect shift

    // The captured rects must remain finite. The dragged key 'a' is excluded from the
    // candidate rects, so assert on 'b' (a stationary captured rect).
    const idx = computeDropIndex(
      [{ key: 'b', top: 100, bottom: 200, left: 0, right: 200 }],
      { x: 100, y: 150 }, Orientation.VERTICAL,
    );
    assert.ok(Number.isFinite(idx), 'computeDropIndex still returns a finite index');

    // End-to-end: dropping at the top must land 'a' AFTER 'b' is still resolvable — i.e. the
    // drop index is not stuck at insert-at-end from poisoned NaN midpoints. Drop near 'b'.
    s.moveDragTo({ x: 100, y: 50 }); // back near the top, over 'a'/'b' boundary region
    s.drop();
    assert.deepEqual(orderOf(s, 'L'), ['a', 'b'], 'order resolves normally; rects were never poisoned to NaN');
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = realRaf;
    globalThis.cancelAnimationFrame = realCaf;
  }
});

test('regression: move() finite-guards toIndex — NaN is a no-op, not a splice to the front', () => {
  // toIndex is consumer-supplied; it used to flow unguarded into clamp() (which does not
  // reject NaN) and then splice (which coerces a NaN start to 0), silently moving the item
  // to the front and emitting a falsified toIndex:0. A non-finite index must be ignored.
  const s = createSortable({ group: 'board' });
  vlist(s, 'A', ['a', 'b', 'c'], { group: 'board', x: 0 });
  vlist(s, 'B', ['x', 'y', 'z'], { group: 'board', x: 300 });
  let changed = 0; let payload = null;
  s.on('changed', (p) => { changed++; payload = p; });

  // Same-list NaN: must NOT relocate 'c' to index 0.
  s.move('c', 'A', NaN);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c'], 'same-list NaN toIndex is a no-op (not spliced to front)');

  // Cross-list NaN: must NOT move 'a' into B at the front.
  s.move('a', 'B', NaN);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c'], 'A unchanged by cross-list NaN move');
  assert.deepEqual(orderOf(s, 'B'), ['x', 'y', 'z'], 'B unchanged by cross-list NaN move');

  // Infinity is non-finite too → ignored.
  s.move('c', 'A', Infinity);
  assert.deepEqual(orderOf(s, 'A'), ['a', 'b', 'c'], 'Infinity toIndex is a no-op');

  assert.equal(changed, 0, 'no "changed" emitted for non-finite indices');
  assert.equal(payload, null);

  // A finite index still works (the guard does not block valid moves).
  s.move('a', 'A', 2);
  assert.deepEqual(orderOf(s, 'A'), ['b', 'c', 'a'], 'finite index still reorders');
  s.destroy();
});

test('regression: setOptions({keyboard:true}) binds keydown on already-registered items (off→on)', () => {
  // bindItem attached the keydown listener only when keyboard was true AT BIND TIME, and
  // never ran from setOptions. An instance created with keyboard:false never bound keydown,
  // so a later setOptions({keyboard:true}) reported enabled but Space/Enter did nothing.
  const listeners = [];
  const fakeElement = (left, top) => ({
    addEventListener: (type, handler) => listeners.push({ type, handler }),
    removeEventListener: (type, handler) => {
      const i = listeners.findIndex((l) => l.type === type && l.handler === handler);
      if (i >= 0) listeners.splice(i, 1);
    },
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 20, width: 100, height: 20 }),
  });
  const s = createSortable({ keyboard: false });
  const elA = fakeElement(0, 0);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 }) }, { id: 'A', items: [{ key: 'a', el: elA }] });
  assert.equal(listeners.some((l) => l.type === 'keydown'), false, 'no keydown bound while keyboard is off');

  s.setOptions({ keyboard: true });
  const keydown = listeners.find((l) => l.type === 'keydown');
  assert.ok(keydown, 'enabling keyboard at runtime binds keydown on the existing item');

  // And the bound handler actually grabs on Space.
  let dragstarted = false; s.on('dragstart', () => (dragstarted = true));
  keydown.handler({ key: ' ', preventDefault() {} });
  assert.ok(dragstarted, 'Space on a re-bound item starts a keyboard grab');
  assert.equal(dragOf(s).active, true);
  s.cancel();

  // The reverse (on→off) still detaches so the runtime guard is not the only defense.
  s.setOptions({ keyboard: false });
  assert.equal(listeners.some((l) => l.type === 'keydown'), false, 'disabling keyboard at runtime detaches the keydown listener');
  s.destroy();
});

test('regression: setOptions({threshold}) reconfigures the gesture recognizer (desktop drag activation)', () => {
  // The recognizer captures moveThreshold once at construction and exposes no setter; the
  // snapshot used to report the new threshold while a real mouse drag still escalated at the
  // old one. setOptions must rebuild the recognizer so behavior matches the snapshot.
  const fakeWindow = () => {
    const wl = [];
    return {
      _listeners: wl,
      addEventListener: (type, handler) => wl.push({ type, handler }),
      removeEventListener: (type, handler) => { const i = wl.findIndex((l) => l.type === type && l.handler === handler); if (i >= 0) wl.splice(i, 1); },
      setTimeout: () => 0, clearTimeout: () => {},
      dispatch: (type, ev) => { for (const l of [...wl]) if (l.type === type) l.handler(ev); },
    };
  };
  const win = fakeWindow();
  const itemListeners = [];
  const itemEl = (left, top) => ({
    ownerDocument: { defaultView: win },
    addEventListener: (type, handler) => itemListeners.push({ type, handler }),
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 }),
  });

  const s = createSortable({ threshold: 6 }); // default desktop threshold
  const containerRect = { left: 0, top: 0, right: 200, bottom: 300, width: 200, height: 300 };
  const a = itemEl(0, 0); const b = itemEl(0, 100);
  s.registerList({ getBoundingClientRect: () => containerRect }, {
    id: 'L', orientation: 'vertical',
    items: [{ key: 'a', el: a }, { key: 'b', el: b }],
  });

  const downHandler = itemListeners.find((l) => l.type === 'pointerdown');
  assert.ok(downHandler, 'item pointerdown bound');

  // Raise the threshold to 20 px AFTER construction.
  s.setOptions({ threshold: 20 });
  assert.equal(s.getState().config.threshold, 20, 'snapshot reports the new threshold');

  // Press on item a, then move 10 px — below the new 20 px threshold, above the old 6 px.
  // If the recognizer kept the old threshold this would already have escalated to a drag.
  downHandler.handler({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, timeStamp: 0, target: a });
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 10, timeStamp: 16, preventDefault() {} });
  assert.equal(dragOf(s).active, false, 'a 10px move does NOT activate a drag at the new 20px threshold');

  // Move past 20 px — now it must escalate to a drag.
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 25, timeStamp: 32, preventDefault() {} });
  assert.equal(dragOf(s).active, true, 'crossing the new 20px threshold activates the drag');
  assert.equal(dragOf(s).key, 'a');
  s.cancel();
  s.destroy();
});

test('regression: moveDragBy(NaN) is a no-op (no splice-to-front, no NaN poisoning of drag.index)', () => {
  // moveDragBy(delta) feeds delta through clamp() (which does NOT reject NaN) into
  // clampForLocked then buildProvisional → Array.splice (which coerces a NaN start to 0).
  // Before the finite-guard, moveDragBy(NaN) on ['a','b','c','d'] with b grabbed spliced b
  // to the FRONT, set drag.index=NaN, and announced 'position NaN of 4'; a later drop()
  // committed the corrupt order. Now it must leave the provisional and drag.index untouched.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c', 'd']);
  s.beginDrag('b', { keyboard: true });           // index 1
  const before = dragOf(s).index;
  s.moveDragBy(NaN);
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'NaN delta does not reorder');
  assert.equal(dragOf(s).index, before, 'drag.index is not poisoned to NaN');
  assert.ok(Number.isFinite(dragOf(s).index), 'drag.index stays finite');
  assert.ok(!String(dragOf(s).announcement).includes('NaN'), 'announcement never reads position NaN');
  s.moveDragBy(Infinity);
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'Infinity delta is also a no-op');
  s.drop();
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'drop commits the unchanged order');
  s.destroy();
});

test('regression: registerItem({index: NaN}) appends at the end (not the front)', () => {
  // `typeof NaN === 'number'` is true, so a NaN index used to take the clamp branch,
  // where clamp(NaN,...) returns NaN and splice coerces it to 0 (insert at FRONT). The
  // documented default for a missing/non-finite index is to append at the end.
  const s = createSortable();
  vlist(s, 'L', ['a', 'b', 'c']);
  s.registerItem(null, 'NEW', 'L', { index: NaN });
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'NEW'], 'NaN index appends at the end');
  s.registerItem(null, 'INF', 'L', { index: Infinity });
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'NEW', 'INF'], 'Infinity index also appends');
  // A finite index still inserts at that position.
  s.registerItem(null, 'MID', 'L', { index: 1 });
  assert.deepEqual(orderOf(s, 'L'), ['a', 'MID', 'b', 'c', 'NEW', 'INF'], 'finite index inserts in place');
  s.destroy();
});

test('regression: buildConfig rejects a non-finite threshold / longPressDelay (no Infinity poisoning)', () => {
  // `Infinity >= 0` and `Infinity > 0` are both true, so a bare typeof+comparison guard
  // used to admit Infinity into the persisted config. threshold:Infinity would make the
  // gesture recognizer's `Math.hypot(...) < moveThreshold` always true (no desktop drag can
  // ever escalate), and longPressDelay:Infinity is coerced to 0 by setTimeout (fires
  // immediately) — while getState().config still advertised Infinity. Non-finite must fall
  // back to the defaults (threshold 6, longPressDelay 0), matching the autoScroll siblings.
  const sInf = createSortable({ threshold: Infinity, longPressDelay: Infinity });
  assert.equal(sInf.getState().config.threshold, 6, 'threshold:Infinity falls back to 6');
  assert.equal(sInf.getState().config.longPressDelay, 0, 'longPressDelay:Infinity falls back to 0');
  sInf.destroy();

  const sNan = createSortable({ threshold: NaN, longPressDelay: NaN });
  assert.equal(sNan.getState().config.threshold, 6, 'threshold:NaN falls back to 6');
  assert.equal(sNan.getState().config.longPressDelay, 0, 'longPressDelay:NaN falls back to 0');
  sNan.destroy();

  // setOptions must reject non-finite values the same way (rebuilds config via buildConfig).
  const s = createSortable({ threshold: 6, longPressDelay: 200 });
  s.setOptions({ threshold: Infinity, longPressDelay: -Infinity });
  assert.equal(s.getState().config.threshold, 6, 'setOptions threshold:Infinity falls back to 6');
  assert.equal(s.getState().config.longPressDelay, 0, 'setOptions longPressDelay:-Infinity falls back to 0');
  // A finite value still applies.
  s.setOptions({ threshold: 20, longPressDelay: 150 });
  assert.equal(s.getState().config.threshold, 20, 'finite threshold still applies');
  assert.equal(s.getState().config.longPressDelay, 150, 'finite longPressDelay still applies');
  s.destroy();
});

test('regression: setOrientation / setGroup / setDisabled are inert after destroy()', () => {
  // Every public mutator honors the documented inert-after-destroy contract. These three
  // config setters used to lack the `if (destroyed) return instance;` guard that move() /
  // setOptions() carry, so they silently mutated a torn-down instance's persistent config.
  const s = createSortable({ orientation: 'vertical' });
  vlist(s, 'L', ['a', 'b']);
  s.registerList(el(0, 0, 200, 200), { id: 'M', items: [{ key: 'x', el: el(0, 0, 200, 100) }], group: 'g0' });
  const beforeOrientation = s.getState().config.orientation;

  let n = 0; s.subscribe(() => n++);
  s.destroy();
  const emitsAfterDestroy = n;

  // All three return the instance (chainable) and emit nothing.
  assert.equal(s.setOrientation('grid'), s, 'setOrientation returns instance after destroy');
  assert.equal(s.setGroup('M', 'g9'), s, 'setGroup returns instance after destroy');
  assert.equal(s.setDisabled(() => true), s, 'setDisabled returns instance after destroy');
  assert.equal(n, emitsAfterDestroy, 'no emissions from setters after destroy');

  // The persistent config is unchanged: setOrientation('grid') did not overwrite orientation.
  assert.equal(s.getState().config.orientation, beforeOrientation, 'config.orientation unchanged after destroy');
  assert.equal(s.getState().config.hasDisabled, false, 'config.disabled not set after destroy');
  s.destroy();
});

test('regression: destroy() removes an armed post-drag click guard (no leaked global listener / timer)', () => {
  // A pointer drag that ends via onSessionUp -> drop() calls armClickGuard(), which registers
  // a capturing 'click' listener on the GLOBAL window and a 350ms self-clear timer. Both used
  // to live only in local closures, so destroy() within 350ms left the listener armed: a
  // torn-down instance kept calling stopPropagation()/preventDefault() on the next page click,
  // and the timer stayed scheduled. destroy() must now dispose both.
  const clickListeners = [];
  const timers = new Map();
  let nextTimer = 1;
  const fakeGlobal = {
    addEventListener: (type, handler, capture) => { if (type === 'click') clickListeners.push({ handler, capture }); },
    removeEventListener: (type, handler, capture) => {
      if (type !== 'click') return;
      const i = clickListeners.findIndex((l) => l.handler === handler && l.capture === capture);
      if (i >= 0) clickListeners.splice(i, 1);
    },
    setTimeout: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
  };
  const savedWindow = globalThis.window;
  globalThis.window = fakeGlobal;
  try {
    const s = createSortable();
    vlist(s, 'L', ['a', 'b', 'c']);
    s.beginDrag('b');
    s.moveDragTo({ x: 100, y: 250 }); // move b past c
    s.drop();                          // arms the click guard on the global window
    assert.equal(clickListeners.length, 1, 'drop() armed exactly one capturing click guard');
    assert.equal(clickListeners[0].capture, true, 'guard is a capture-phase listener');
    assert.equal(timers.size, 1, 'drop() scheduled the 350ms self-clear timer');

    s.destroy();
    assert.equal(clickListeners.length, 0, 'destroy() removed the armed global click listener');
    assert.equal(timers.size, 0, 'destroy() cancelled the pending self-clear timer');
  } finally {
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
  }
});

test('regression: re-arming the click guard disposes the prior one (single live guard)', () => {
  // armClickGuard() must dispose any still-armed guard before arming a new one, so two drags
  // dropped inside the 350ms window leave exactly one live listener/timer, not two.
  const clickListeners = [];
  const timers = new Map();
  let nextTimer = 1;
  const fakeGlobal = {
    addEventListener: (type, handler, capture) => { if (type === 'click') clickListeners.push({ handler, capture }); },
    removeEventListener: (type, handler, capture) => {
      if (type !== 'click') return;
      const i = clickListeners.findIndex((l) => l.handler === handler && l.capture === capture);
      if (i >= 0) clickListeners.splice(i, 1);
    },
    setTimeout: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
  };
  const savedWindow = globalThis.window;
  globalThis.window = fakeGlobal;
  try {
    const s = createSortable();
    vlist(s, 'L', ['a', 'b', 'c']);
    s.beginDrag('b'); s.moveDragTo({ x: 100, y: 250 }); s.drop(); // first guard
    s.beginDrag('b'); s.moveDragTo({ x: 100, y: 50 }); s.drop();  // second drop re-arms
    assert.equal(clickListeners.length, 1, 're-arm disposed the prior guard (only one live)');
    assert.equal(timers.size, 1, 're-arm cancelled the prior self-clear timer');
    s.destroy();
    assert.equal(clickListeners.length, 0, 'destroy() removed the surviving guard');
    assert.equal(timers.size, 0, 'destroy() cancelled the surviving timer');
  } finally {
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
  }
});

test('regression: destroy() inside a drop callback does not leave an armed click guard (re-entrant teardown)', () => {
  // drop() fires consumer callbacks ('changed'/onChanged, 'dragend', 'change') BEFORE arming
  // the post-drag click guard. If one of those callbacks calls destroy(), destroy() disposes
  // any existing guard and sets destroyed=true — then control returns to drop() and reaches
  // armClickGuard(). Without a liveness re-check, armClickGuard() would re-add a global
  // capture-phase 'click' listener + a 350ms timer that destroy() (idempotent) never cleans
  // up. drop() must re-check `destroyed` before arming.
  const clickListeners = [];
  const timers = new Map();
  let nextTimer = 1;
  const fakeGlobal = {
    addEventListener: (type, handler, capture) => { if (type === 'click') clickListeners.push({ handler, capture }); },
    removeEventListener: (type, handler, capture) => {
      if (type !== 'click') return;
      const i = clickListeners.findIndex((l) => l.handler === handler && l.capture === capture);
      if (i >= 0) clickListeners.splice(i, 1);
    },
    setTimeout: (fn) => { const id = nextTimer++; timers.set(id, fn); return id; },
    clearTimeout: (id) => { timers.delete(id); },
  };
  const savedWindow = globalThis.window;
  globalThis.window = fakeGlobal;
  try {
    const s = createSortable();
    vlist(s, 'L', ['a', 'b', 'c']);
    // A consumer tears the instance down from within the synchronous 'dragend' emission.
    s.on('dragend', () => { s.destroy(); });
    s.beginDrag('b');
    s.moveDragTo({ x: 100, y: 250 }); // move b past c so the drop is a real reorder
    s.drop();                          // fires 'dragend' -> destroy(), THEN reaches armClickGuard()
    assert.equal(clickListeners.length, 0, 'no click guard armed after destroy() ran inside the drop callback');
    assert.equal(timers.size, 0, 'no self-clear timer scheduled after teardown');
  } finally {
    if (savedWindow === undefined) delete globalThis.window; else globalThis.window = savedWindow;
  }
});

test('regression: in-flight pointer session carries no dead listId field', () => {
  // onItemPointerDown stored session.listId, which no consumer ever read (beginDrag re-derives
  // the list from the key via findList(key)). Dead state was removed; assert the source no
  // longer writes it onto the session literal (same source-scan style as the import test).
  const src = readFileSync(fileURLToPath(new URL('./sortable-engine.js', import.meta.url)), 'utf8');
  assert.ok(!/listId:\s*listRecord\.id/.test(src), 'the dead `listId: listRecord.id` session field is gone');
  assert.ok(!/session\.listId\b/.test(src), 'no code reads session.listId');
});

test('regression: in-flight pointer session carries no dead isTouch field', () => {
  // onItemPointerDown stored session.isTouch, which no consumer ever read — usingRecognizer
  // (the only consumer of the touch determination) reads the LOCAL `isTouch` const computed
  // one line earlier, not the session field. Dead state was removed; assert the source no
  // longer writes `isTouch` onto the session literal nor reads it back off the session.
  const src = readFileSync(fileURLToPath(new URL('./sortable-engine.js', import.meta.url)), 'utf8');
  // The local `const isTouch = e.pointerType === 'touch'` must stay (usingRecognizer needs it).
  assert.ok(/const isTouch = /.test(src), 'the local isTouch const is kept');
  // But it must not be stored on the session literal, nor read back via session.isTouch.
  assert.ok(!/\bisTouch,/.test(src), 'the dead `isTouch,` session field is gone');
  assert.ok(!/session\.isTouch\b/.test(src), 'no code reads session.isTouch');
});

test('regression: candidateRects returns no dead keys field', () => {
  // candidateRects accumulated a parallel `keys` array alongside `rects` and returned both
  // as `{ rects, keys }`, but every call site destructures only `{ rects }` (moveDragTo and
  // the auto-scroll tick) — the `keys` half was written and returned, never read. Dead state
  // was removed; assert the source no longer declares/pushes/returns it (same source-scan
  // style as the listId/isTouch dead-state tests above).
  const src = readFileSync(fileURLToPath(new URL('./sortable-engine.js', import.meta.url)), 'utf8');
  // Isolate the candidateRects function body so we don't false-match `keys` elsewhere (list.keys, etc.).
  const start = src.indexOf('function candidateRects');
  assert.ok(start >= 0, 'candidateRects still exists');
  const body = src.slice(start, src.indexOf('function clampForLocked', start));
  assert.ok(!/const keys = \[\]/.test(body), 'the dead `const keys = []` accumulator is gone');
  assert.ok(!/keys\.push\(/.test(body), 'nothing pushes onto a dead keys array');
  assert.ok(!/return \{ rects, keys \}/.test(body), 'candidateRects no longer returns the dead keys field');
  // And no caller destructures `keys` off candidateRects.
  assert.ok(!/\{[^}]*\bkeys\b[^}]*\}\s*=\s*candidateRects/.test(src),
    'no call site destructures a keys field off candidateRects');
});

test('regression: mutating an item out from under a pending pointer session tears the session down', () => {
  // A touch pointerdown with longPressDelay > 0 opens a `session`: it arms a longPressTimer
  // and attaches window pointermove/pointerup/pointercancel listeners, WITHOUT a drag having
  // activated yet (drag.active === false). If the consumer then removes the very item the
  // press started on, the mutators used to only call cancel() — and cancel() early-returned
  // because no drag was active — so the armed timer + window listeners leaked, closing over
  // the freed item until a later window pointerup (which never arrives if the element was torn
  // out of the DOM mid-press). The pending-session teardown destroy() performs must now also
  // run on the mutator/cancel path. We exercise unregisterItem, unregisterList, setItems,
  // move(), and a bare cancel() — each from a freshly armed session.
  const buildEnv = () => {
    const winListeners = [];
    const liveTimers = new Map();
    let nextTimer = 1;
    const win = {
      _listeners: winListeners,
      _timers: liveTimers,
      addEventListener: (type, handler) => winListeners.push({ type, handler }),
      removeEventListener: (type, handler) => {
        const i = winListeners.findIndex((l) => l.type === type && l.handler === handler);
        if (i >= 0) winListeners.splice(i, 1);
      },
      setTimeout: (fn) => { const id = nextTimer++; liveTimers.set(id, fn); return id; },
      clearTimeout: (id) => { liveTimers.delete(id); },
      dispatch: (type, ev) => { for (const l of [...winListeners]) if (l.type === type) l.handler(ev); },
    };
    const itemEl = (left, top) => ({
      ownerDocument: { defaultView: win },
      addEventListener() {}, removeEventListener() {},
      getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 }),
    });
    return { win, itemEl };
  };

  // longPressDelay > 0 + a touch pointer ⇒ the session arms a longPressTimer and the
  // recognizer is NOT used, so the press sits in the pre-activation window (drag inactive).
  const armSession = (s, downHandler, target) => {
    downHandler({ pointerId: 1, pointerType: 'touch', button: 0, clientX: 0, clientY: 0, timeStamp: 0, target });
  };

  const sessionPointerListeners = (win) =>
    win._listeners.filter((l) => l.type === 'pointermove' || l.type === 'pointerup' || l.type === 'pointercancel');

  // Build a sortable with one item `a` armed into a pending session, returning everything
  // the assertions need. `bindThird` registers a second item so single-item-removal cases
  // still leave the engine in a sane shape.
  const setup = () => {
    const { win, itemEl } = buildEnv();
    const s = createSortable({ longPressDelay: 200 }); // touch long-press path
    const a = itemEl(0, 0); const b = itemEl(0, 100);
    let downHandler = null;
    const aWithCapture = {
      ...a,
      addEventListener: (type, handler) => { if (type === 'pointerdown') downHandler = handler; },
      removeEventListener() {},
    };
    s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200 }) }, {
      id: 'L', orientation: 'vertical',
      items: [{ key: 'a', el: aWithCapture }, { key: 'b', el: b }],
    });
    assert.ok(downHandler, 'item a pointerdown bound');
    armSession(s, downHandler, aWithCapture);
    // Session is armed: a long-press timer scheduled and the three window listeners attached.
    assert.equal(win._timers.size, 1, 'pending session armed the long-press timer');
    assert.equal(sessionPointerListeners(win).length, 3, 'pending session attached the 3 window listeners');
    assert.equal(dragOf(s).active, false, 'no drag has activated yet (pre-activation window)');
    return { s, win };
  };

  const assertTorn = (win, label) => {
    assert.equal(win._timers.size, 0, `${label}: long-press timer was cleared`);
    assert.equal(sessionPointerListeners(win).length, 0, `${label}: window pointer listeners were removed`);
  };

  // unregisterItem on the pressed key tears the session down.
  {
    const { s, win } = setup();
    s.unregisterItem('a', 'L');
    assertTorn(win, 'unregisterItem');
    s.destroy();
  }
  // unregisterList containing the pressed key tears the session down.
  {
    const { s, win } = setup();
    s.unregisterList('L');
    assertTorn(win, 'unregisterList');
    s.destroy();
  }
  // setItems dropping the pressed key tears the session down.
  {
    const { s, win } = setup();
    s.setItems('L', ['b']); // 'a' is gone from the new order
    assertTorn(win, 'setItems');
    s.destroy();
  }
  // move() of the pressed key (re-binds its element) tears the session down.
  {
    const { s, win } = setup();
    s.move('a', 'L', 1);
    assertTorn(win, 'move');
    s.destroy();
  }
  // A bare cancel() also releases a pending session (the symmetry destroy() already had).
  {
    const { s, win } = setup();
    s.cancel();
    assertTorn(win, 'cancel');
    s.destroy();
  }
});

test('regression: a mutator that does NOT touch the pressed item leaves the pending session intact', () => {
  // The teardown must be scoped to the affected key: unregistering a DIFFERENT item, or a
  // setItems that keeps the pressed key, must not release a session still legitimately armed
  // on another item. (Guards against an over-broad fix that nukes every pending press.)
  const winListeners = [];
  const liveTimers = new Map();
  let nextTimer = 1;
  const win = {
    addEventListener: (type, handler) => winListeners.push({ type, handler }),
    removeEventListener: (type, handler) => {
      const i = winListeners.findIndex((l) => l.type === type && l.handler === handler);
      if (i >= 0) winListeners.splice(i, 1);
    },
    setTimeout: () => { const id = nextTimer++; liveTimers.set(id, true); return id; },
    clearTimeout: (id) => { liveTimers.delete(id); },
  };
  const itemEl = (left, top, onDown) => ({
    ownerDocument: { defaultView: win },
    addEventListener: (type, handler) => { if (type === 'pointerdown' && onDown) onDown(handler); },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 }),
  });
  const s = createSortable({ longPressDelay: 200 });
  let downA = null;
  const a = itemEl(0, 0, (h) => (downA = h));
  const b = itemEl(0, 100);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200 }) }, {
    id: 'L', orientation: 'vertical', items: [{ key: 'a', el: a }, { key: 'b', el: b }],
  });
  downA({ pointerId: 1, pointerType: 'touch', button: 0, clientX: 0, clientY: 0, timeStamp: 0, target: a });
  const sessionListeners = () => winListeners.filter((l) => l.type === 'pointermove' || l.type === 'pointerup' || l.type === 'pointercancel');
  assert.equal(liveTimers.size, 1, 'session armed on a');
  assert.equal(sessionListeners().length, 3, 'session listeners attached for a');

  s.unregisterItem('b', 'L'); // a DIFFERENT item
  assert.equal(liveTimers.size, 1, 'unregistering b leaves a\'s session timer intact');
  assert.equal(sessionListeners().length, 3, 'unregistering b leaves a\'s session listeners intact');

  s.setItems('L', ['a']); // keeps the pressed key 'a'
  assert.equal(liveTimers.size, 1, 'setItems keeping a leaves its session intact');
  assert.equal(sessionListeners().length, 3, 'setItems keeping a leaves its listeners intact');

  s.destroy(); // destroy still tears it down
  assert.equal(liveTimers.size, 0, 'destroy() cleared the surviving session timer');
  assert.equal(sessionListeners().length, 0, 'destroy() removed the surviving session listeners');
});

// ============================================================================
// Regression: deep logic defects from the manual audit (round 15)
// ============================================================================

test('regression: a non-finite rect field at grab does not poison grabOffset/position', () => {
  // getRect read left/top straight from getBoundingClientRect. A misbehaving/stub container
  // reporting a non-finite left/top made grabOffset = pointer - rect.left = NaN — and grabOffset
  // is captured ONCE at grab and never recomputed, so every later moveDragTo emits a NaN
  // position for the whole drag (the consumer renders the lifted clone at NaN forever). getRect
  // must finite-guard every field (coerce non-finite to 0), as the auto-scroll scrollTop guard does.
  const badEl = { getBoundingClientRect: () => ({ left: NaN, top: Infinity, right: 100, bottom: 100, width: 100, height: 100 }) };
  const goodEl = el(0, 100, 100, 100);
  const s = createSortable();
  s.registerList(el(0, 0, 200, 300), { id: 'L', orientation: 'vertical', items: [{ key: 'a', el: badEl }, { key: 'b', el: goodEl }] });
  assert.equal(s.beginDrag('a', { pointer: { x: 10, y: 20 } }), true, 'grab on a finite pointer still begins');
  const d0 = dragOf(s);
  assert.ok(Number.isFinite(d0.grabOffset.x) && Number.isFinite(d0.grabOffset.y), 'grabOffset stays finite (rect.left/top coerced to 0)');
  assert.ok(Number.isFinite(d0.position.x) && Number.isFinite(d0.position.y), 'position stays finite');
  s.moveDragTo({ x: 30, y: 40 });
  const d1 = dragOf(s);
  assert.ok(Number.isFinite(d1.position.x) && Number.isFinite(d1.position.y), 'position remains finite after a move (no carried NaN)');
  s.destroy();
});

test('regression: clampForLocked does not invert its range for an all-locked drop target', () => {
  // lead (front-locked count) and trail (back-locked count) are counted independently, so an
  // all-locked target makes lead+trail > order.length and clamp(index, lead, length-trail) gets
  // min > max. clamp() then returns min below min and max above max — inconsistent, pin-violating
  // (top of the list inserted AFTER the locks, bottom inserted BEFORE them). With trail capped,
  // a fully-locked target collapses to a single valid insertion point (after the locks) at BOTH ends.
  const mk = (left, top) => el(left, top, 100, 100);
  const cont = (l, t, r, b) => ({ getBoundingClientRect: () => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t }) });
  const s = createSortable({ group: 'g' });
  s.registerList(cont(0, 0, 100, 200), { id: 'SRC', orientation: 'vertical', group: 'g', items: [{ key: 'x', el: mk(0, 0) }] });
  s.registerList(cont(200, 0, 300, 200), {
    id: 'DST', orientation: 'vertical', group: 'g',
    items: [{ key: 'L1', el: mk(200, 0), locked: true }, { key: 'L2', el: mk(200, 100), locked: true }],
  });
  s.beginDrag('x', { pointer: { x: 10, y: 10 } });
  s.moveDragTo({ x: 250, y: 10 }); // pointer near the TOP of the all-locked target
  assert.equal(dragOf(s).index, 2, 'top-of-list drop into an all-locked target lands after both locks');
  assert.deepEqual(orderOf(s, 'DST'), ['L1', 'L2', 'x'], 'top: locks stay pinned, x appended');
  s.moveDragTo({ x: 250, y: 190 }); // pointer near the BOTTOM (pre-fix this returned index 0, before the locks)
  assert.equal(dragOf(s).index, 2, 'bottom-of-list drop also lands after both locks (consistent, no inverted range)');
  assert.deepEqual(orderOf(s, 'DST'), ['L1', 'L2', 'x'], 'bottom: still after the locks (no pin violation)');
  s.destroy();
});

test('regression: drop index is remapped to full-order space when some keys lack rects', () => {
  // candidateRects skips keys with no captured rect, so computeDropIndex returns an index into the
  // RECT-HAVING SUBSET, but buildProvisional/insertAt splice into the FULL order (which still
  // contains the unmeasured keys). Every unmeasured key before the visual drop point shifts the
  // real insertion off by one. Here 'b' has no rect; dropping 'c' between a and d must land c
  // between b and d (full order), not before b.
  const mk = (left, top) => el(left, top, 100, 100);
  const cont = (l, t, r, b) => ({ getBoundingClientRect: () => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t }) });
  const s = createSortable();
  s.registerList(cont(0, 0, 100, 400), {
    id: 'L', orientation: 'vertical',
    items: [{ key: 'a', el: mk(0, 0) }, 'b' /* no rect */, { key: 'c', el: mk(0, 200) }, { key: 'd', el: mk(0, 300) }],
  });
  s.beginDrag('c', { pointer: { x: 10, y: 210 } });
  // Candidate order is ['a','b','d']; measured rects are a(mid 50) and d(mid 350). Pointer y=120
  // sits below a's mid and above d's mid → subset index 1 (before d). Remapped to full index 2.
  s.moveDragTo({ x: 10, y: 120 });
  assert.deepEqual(orderOf(s, 'L'), ['a', 'b', 'c', 'd'], 'c lands between b and d, not before the unmeasured b');
  s.destroy();
});

test('regression: a keyboard drop does not arm the global click-swallowing guard', () => {
  // drop() is shared by pointer and keyboard drags. A pointer release fires a synthetic click the
  // guard must swallow; a KEYBOARD drop fires no click, so arming the global capture-phase click
  // guard there would instead eat the user's next genuine click within 350ms. drop() must skip the
  // guard when the ended drag was keyboard-driven (and still arm it for a pointer drag).
  const clickListeners = [];
  const fakeWindow = {
    addEventListener: (t, h) => clickListeners.push({ t, h }),
    removeEventListener: (t, h) => { const i = clickListeners.findIndex((l) => l.t === t && l.h === h); if (i >= 0) clickListeners.splice(i, 1); },
    setTimeout: () => 1, clearTimeout: () => {},
  };
  const hadWindow = 'window' in globalThis;
  const priorWindow = globalThis.window;
  globalThis.window = fakeWindow;
  try {
    const mk = (left, top) => el(left, top, 100, 100);
    const cont = (l, t, r, b) => ({ getBoundingClientRect: () => ({ left: l, top: t, right: r, bottom: b, width: r - l, height: b - t }) });
    const s = createSortable();
    s.registerList(cont(0, 0, 100, 200), { id: 'L', orientation: 'vertical', items: [{ key: 'a', el: mk(0, 0) }, { key: 'b', el: mk(0, 100) }] });
    s.beginDrag('a', { keyboard: true });
    s.moveDragBy(1);
    s.drop();
    assert.equal(clickListeners.filter((l) => l.t === 'click').length, 0, 'keyboard drop arms no click guard');
    s.beginDrag('a', { pointer: { x: 10, y: 10 } }); // a pointer drag SHOULD still arm it
    s.drop();
    assert.equal(clickListeners.filter((l) => l.t === 'click').length, 1, 'pointer drop still arms the click guard');
    s.destroy();
  } finally {
    if (hadWindow) globalThis.window = priorWindow; else delete globalThis.window;
  }
});

test('regression: programmatic cancel() of an active pointer drag does not let a stray move resurrect it', () => {
  // A pointer drag is live (a recognizer session exists, escalated to mode 'pan'). A consumer
  // mutator (here setItems) cancels mid-drag. cancel() reverted the order and set drag idle, but
  // the old guard (`if (session && !drag.active) endSession(true)`) skipped session teardown
  // because the drag WAS active — leaving the window listeners attached and the recognizer stuck
  // in 'pan'. The next pointermove then hit onSessionMove's belt-and-suspenders branch and
  // RE-STARTED the drag the consumer explicitly cancelled. cancel() must release the live session
  // and reset the recognizer too.
  const winListeners = [];
  const win = {
    addEventListener: (t, h) => winListeners.push({ t, h }),
    removeEventListener: (t, h) => { const i = winListeners.findIndex((l) => l.t === t && l.h === h); if (i >= 0) winListeners.splice(i, 1); },
    setTimeout: () => 0, clearTimeout: () => {},
    dispatch: (t, ev) => { for (const l of [...winListeners]) if (l.t === t) l.h(ev); },
  };
  const itemEl = (left, top, capture) => ({
    ownerDocument: { defaultView: win },
    addEventListener: (type, handler) => { if (type === 'pointerdown' && capture) capture(handler); },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 }),
  });
  const s = createSortable();
  let downA = null;
  const a = itemEl(0, 0, (h) => (downA = h));
  const b = itemEl(0, 100);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200 }) }, {
    id: 'L', orientation: 'vertical', items: [{ key: 'a', el: a }, { key: 'b', el: b }],
  });
  // Mouse pointerdown → the recognizer drives activation.
  downA({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, timeStamp: 0, target: a });
  // Move past the threshold → recognizer escalates to 'pan' → beginDrag.
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 40, timeStamp: 16, preventDefault() {} });
  assert.equal(dragOf(s).active, true, 'pointer drag is active after escalation');
  const sessionCount = () => winListeners.filter((l) => l.t === 'pointermove' || l.t === 'pointerup' || l.t === 'pointercancel').length;
  assert.equal(sessionCount(), 3, 'a live pointer session is attached');

  s.setItems('L', ['a', 'b']); // arrives mid-drag → cancel()
  assert.equal(dragOf(s).active, false, 'cancel() ended the drag');
  assert.equal(sessionCount(), 0, 'cancel() released the live pointer session listeners');

  // The very next pointer move must NOT resurrect the cancelled drag.
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 80, timeStamp: 32, preventDefault() {} });
  assert.equal(dragOf(s).active, false, 'a stray pointermove after cancel does not re-start the drag');
  s.destroy();
});

test('regression: programmatic drop() of an active pointer drag does not let a stray move resurrect it', () => {
  // Symmetric to the cancel() resurrection test above. A pointer drag is live (a recognizer
  // session exists, escalated to mode 'pan'). A consumer commits it by calling drop() DIRECTLY
  // (a "drop on button"/Enter UX or a programmatic commit) instead of letting onSessionUp run.
  // drop() used to never call endSession()/recognizer.reset(), so it left the window pointer
  // listeners attached and the recognizer stuck in 'pan'. The next pointermove then hit
  // onSessionMove's belt-and-suspenders branch and RE-STARTED a fresh drag of the just-dropped
  // key against the committed data. drop() must release the live session and reset the recognizer.
  const winListeners = [];
  const win = {
    addEventListener: (t, h) => winListeners.push({ t, h }),
    removeEventListener: (t, h) => { const i = winListeners.findIndex((l) => l.t === t && l.h === h); if (i >= 0) winListeners.splice(i, 1); },
    setTimeout: () => 0, clearTimeout: () => {},
    dispatch: (t, ev) => { for (const l of [...winListeners]) if (l.t === t) l.h(ev); },
  };
  const itemEl = (left, top, capture) => ({
    ownerDocument: { defaultView: win },
    addEventListener: (type, handler) => { if (type === 'pointerdown' && capture) capture(handler); },
    removeEventListener() {},
    getBoundingClientRect: () => ({ left, top, right: left + 100, bottom: top + 100, width: 100, height: 100 }),
  });
  const s = createSortable();
  let downA = null;
  const a = itemEl(0, 0, (h) => (downA = h));
  const b = itemEl(0, 100);
  s.registerList({ getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 200, width: 100, height: 200 }) }, {
    id: 'L', orientation: 'vertical', items: [{ key: 'a', el: a }, { key: 'b', el: b }],
  });
  // Mouse pointerdown → the recognizer drives activation.
  downA({ pointerId: 1, pointerType: 'mouse', button: 0, clientX: 0, clientY: 0, timeStamp: 0, target: a });
  // Move past the threshold → recognizer escalates to 'pan' → beginDrag, and over 'b' so the
  // committed order actually moves (so the drop is a real commit, not a no-op).
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 150, timeStamp: 16, preventDefault() {} });
  assert.equal(dragOf(s).active, true, 'pointer drag is active after escalation');
  const sessionCount = () => winListeners.filter((l) => l.t === 'pointermove' || l.t === 'pointerup' || l.t === 'pointercancel').length;
  assert.equal(sessionCount(), 3, 'a live pointer session is attached');

  s.drop(); // consumer commits the drag directly, bypassing onSessionUp
  assert.equal(dragOf(s).active, false, 'drop() ended the drag');
  assert.equal(sessionCount(), 0, 'drop() released the live pointer session listeners');
  const committed = orderOf(s, 'L');

  // The very next stray pointer move must NOT resurrect the dropped drag.
  win.dispatch('pointermove', { pointerId: 1, clientX: 0, clientY: 80, timeStamp: 32, preventDefault() {} });
  assert.equal(dragOf(s).active, false, 'a stray pointermove after drop does not re-start the drag');
  assert.deepEqual(orderOf(s, 'L'), committed, 'the committed order is not disturbed by the stray move');
  s.destroy();
});

test('regression: auto-scroll tick finite-guards scrollLeft — an Infinity scrollLeft never poisons captured rects', () => {
  // Sibling of the scrollTop guard test above. For a HORIZONTAL list, maybeAutoScroll sets
  // stepX = ±speed, so the tick writes/reads scrollLeft. scrollLeft used the weaker `|| 0`
  // fallback, which collapses NaN→0 but lets Infinity through: beforeLeft = Infinity, and
  // deltaX = Infinity - Infinity = NaN. The no-progress short-circuit (deltaX===0 && deltaY===0)
  // then failed (NaN !== 0) and `rect.left -= NaN` poisoned every captured rect to NaN for the
  // rest of the drag. scrollLeft must use Number.isFinite like scrollTop (which rejects Infinity).
  const realRaf = globalThis.requestAnimationFrame;
  const realCaf = globalThis.cancelAnimationFrame;
  let queuedTick = null;
  globalThis.requestAnimationFrame = (fn) => { queuedTick = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { queuedTick = null; };
  try {
    const s = createSortable({ autoScroll: { speed: 12, edge: 60 } });
    // Horizontal scroll container whose scrollLeft getter returns Infinity (an odd/stub container).
    const scrollEl = {
      scrollTop: 0,
      get scrollLeft() { return Infinity; },
      set scrollLeft(_v) { /* swallow the write; the getter still reports Infinity */ },
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200 }),
    };
    const items = [{ key: 'a', el: el(0, 0, 100, 200) }, { key: 'b', el: el(100, 0, 100, 200) }];
    s.registerList(el(0, 0, 200, 200), { id: 'L', items, orientation: 'horizontal', scrollEl });
    s.beginDrag('a');
    s.moveDragTo({ x: 195, y: 100 }); // inside the right edge band -> arms horizontal auto-scroll
    assert.equal(typeof queuedTick, 'function', 'auto-scroll loop armed');
    queuedTick(); // run one frame: with the guard, deltaX is 0 (no progress), so no rect shift

    // 'b' is a stationary captured rect (the dragged key 'a' is excluded from candidates). With
    // the bug, drag.rectByKey['b'] would have been shifted to NaN; computeDropIndex would then
    // degrade to insert-at-end. Drop back over 'b' and confirm the order is still resolvable.
    s.moveDragTo({ x: 50, y: 100 }); // back over 'a' (left of 'b' midpoint x=150) -> insert before 'b'
    s.drop();
    assert.deepEqual(orderOf(s, 'L'), ['a', 'b'], 'order resolves normally; rects were never poisoned to NaN');
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = realRaf;
    globalThis.cancelAnimationFrame = realCaf;
  }
});

if (isMain(import.meta.url)) report({ exit: true });
