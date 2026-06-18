// selection-engine.test.mjs
// Pure unit tests for the multi-selection engine. No DOM, no browser, no framework:
//   node selection-engine/selection-engine.test.mjs
//
// Importing selection-engine.js here doubles as the headless-core design check: if the
// module touched document/window/requestAnimationFrame/getBoundingClientRect at top level,
// this import would throw in Node. It does not — that access lives inside methods behind
// capability guards. So everything below — the click/shift-range/ctrl-toggle logic, the
// box-vs-rect hit-testing (both rules, all directions), the marquee deltas, the spatial
// index, setItems consistency, single-select degrade, the state/delta emission — is
// reachable and deterministic with no `document`.
//
// The live pointer wiring and auto-scroll DRIVING are the browser gate (Gate 2). Here we
// drive the same input-agnostic methods the consumer calls (selectAt / startMarquee /
// updateMarquee / endMarquee / cancelMarquee) with geometry supplied as plain data — exactly
// the shape a consumer or a virtualizer feeds via setItems().

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, testAsync, assert, isMain, report } from './harness.mjs';
import {
  createSelection, boxHitTest, normalizeBox, rangeBetween, createSpatialIndex, IntersectMode,
} from './selection-engine.js';

// ---- fixtures (geometry as data) -------------------------------------------

/** A vertical list of N stacked rows, each `w`×`h`, gap-less, at column x. Keys 'i0','i1',… */
function rows(n, { w = 100, h = 100, x = 0 } = {}) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ key: `i${i}`, x, y: i * h, w, h });
  return out;
}
/** An R×C grid of `s`×`s` cells with `gap`. Keys 'r-c'. */
function grid(R, C, { s = 90, gap = 10 } = {}) {
  const out = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) out.push({ key: `${r}-${c}`, x: c * (s + gap), y: r * (s + gap), w: s, h: s });
  return out;
}
const sel = (s) => [...s.getState().selected].sort();
const flush = () => new Promise((r) => queueMicrotask(r));

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and runs headless (no DOM)', () => {
  assert.equal(typeof document, 'undefined', 'no document in this runtime');
  const s = createSelection();
  assert.equal(typeof s.setItems, 'function');
  s.setItems(rows(3));
  s.selectAt('i1', {});
  assert.deepEqual(sel(s), ['i1']);
  s.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./selection-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const sp of specifiers) assert.ok(sp.startsWith('../shared/'), `import "${sp}" must come from ../shared/`);
});

test('the engine CODE never calls getBoundingClientRect (geometry is supplied as data)', () => {
  const src = readFileSync(fileURLToPath(new URL('./selection-engine.js', import.meta.url)), 'utf8');
  // Strip comments first: the header prose intentionally discusses gBCR; what must not exist
  // is an actual reference in the code — the whole performance contract is no live DOM reads.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.ok(!/getBoundingClientRect/.test(code), 'the engine must never read live DOM geometry');
});

test('every module-scope DOM reference is typeof-guarded (no bare global access at load)', () => {
  const src = readFileSync(fileURLToPath(new URL('./selection-engine.js', import.meta.url)), 'utf8');
  const moduleScope = src.slice(0, src.indexOf('export function createSelection'))
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  const domGlobal = /\b(document|window|requestAnimationFrame|cancelAnimationFrame|navigator)\b/;
  for (const line of moduleScope.split('\n')) {
    if (domGlobal.test(line)) assert.ok(/typeof/.test(line), `module-scope DOM reference must be typeof-guarded: ${line.trim()}`);
  }
});

test('getState() returns a valid empty state immediately after creation', () => {
  const s = createSelection({ intersect: 'contain', multiple: false });
  const st = s.getState();
  assert.equal(st.selected.size, 0);
  assert.equal(st.count, 0);
  assert.equal(st.anchor, null);
  assert.deepEqual(st.delta, { entered: [], left: [] });
  assert.equal(st.marquee.active, false);
  assert.equal(st.marquee.rect, null);
  assert.equal(st.config.intersect, 'contain');
  assert.equal(st.config.multiple, false);
  s.destroy();
});

// ============================================================================
// Pure geometry — normalizeBox + boxHitTest (intersect & contain, all directions)
// ============================================================================

test('normalizeBox makes a positive-size box in any drag direction', () => {
  const a = normalizeBox(10, 20, 40, 60); // down-right
  const b = normalizeBox(40, 60, 10, 20); // up-left
  const c = normalizeBox(40, 20, 10, 60); // down-left
  const d = normalizeBox(10, 60, 40, 20); // up-right
  for (const box of [a, b, c, d]) {
    assert.deepEqual([box.left, box.top, box.right, box.bottom], [10, 20, 40, 60], 'edges normalized');
    assert.deepEqual([box.x, box.y, box.width, box.height], [10, 20, 30, 40], 'x/y/w/h normalized');
  }
});

test('boxHitTest intersect rule — overlap selects, touching counts, outside does not', () => {
  const items = [
    { key: 'a', left: 0, top: 0, right: 100, bottom: 100 },
    { key: 'b', left: 200, top: 0, right: 300, bottom: 100 },
  ];
  assert.deepEqual([...boxHitTest(items, normalizeBox(50, 50, 60, 60), 'intersect')], ['a'], 'box inside a → a');
  assert.deepEqual([...boxHitTest(items, normalizeBox(90, 10, 210, 20), 'intersect')].sort(), ['a', 'b'], 'spanning box → both');
  // Touching exactly at a's right edge (x=100) counts under intersect.
  assert.deepEqual([...boxHitTest(items, normalizeBox(100, 50, 110, 60), 'intersect')], ['a'], 'edge-touch selects a');
  assert.deepEqual([...boxHitTest(items, normalizeBox(120, 50, 180, 60), 'intersect')], [], 'gap → nothing');
});

test('boxHitTest contain rule — only fully enclosed rects select', () => {
  const items = [{ key: 'a', left: 0, top: 0, right: 100, bottom: 100 }];
  assert.deepEqual([...boxHitTest(items, normalizeBox(-5, -5, 105, 105), 'contain')], ['a'], 'fully enclosing → a');
  assert.deepEqual([...boxHitTest(items, normalizeBox(50, 50, 200, 200), 'contain')], [], 'partial overlap → not contained');
  // Exact coincidence counts as contained (inclusive edges).
  assert.deepEqual([...boxHitTest(items, normalizeBox(0, 0, 100, 100), 'contain')], ['a'], 'exact box contains');
});

test('empty (zero-size) box selects nothing under either rule', () => {
  const items = [{ key: 'a', left: 0, top: 0, right: 100, bottom: 100 }];
  // A degenerate box still on the item intersects (a point inside touches); off the item, nothing.
  assert.deepEqual([...boxHitTest(items, normalizeBox(500, 500, 500, 500), 'intersect')], [], 'point off item → none');
  assert.deepEqual([...boxHitTest(items, normalizeBox(500, 500, 500, 500), 'contain')], [], 'point off item → none (contain)');
});

// ============================================================================
// Click selection
// ============================================================================

test('plain click selects one, clears the rest, sets the anchor', () => {
  const s = createSelection();
  s.setItems(rows(5));
  s.selectAt('i1', {});
  assert.deepEqual(sel(s), ['i1']);
  assert.equal(s.getAnchor(), 'i1');
  s.selectAt('i3', {});
  assert.deepEqual(sel(s), ['i3'], 'second click clears the first');
  assert.equal(s.getAnchor(), 'i3');
  s.destroy();
});

// ============================================================================
// Shift-range (the fiddly part: re-extension from a FIXED anchor)
// ============================================================================

test('shift-click selects the contiguous range from the anchor — forward and backward', () => {
  const s = createSelection();
  s.setItems(rows(6));
  s.selectAt('i1', {});               // anchor i1
  s.selectAt('i4', { shift: true });  // forward range i1..i4
  assert.deepEqual(sel(s), ['i1', 'i2', 'i3', 'i4']);
  assert.equal(s.getAnchor(), 'i1', 'anchor stays at i1');
  // New anchor, then a backward shift.
  s.selectAt('i4', {});               // anchor i4
  s.selectAt('i1', { shift: true });  // backward range i4..i1
  assert.deepEqual(sel(s), ['i1', 'i2', 'i3', 'i4']);
  s.destroy();
});

test('repeated shift-clicks RE-EXTEND from the same anchor (not the last shift target)', () => {
  const s = createSelection();
  s.setItems(rows(8));
  s.selectAt('i2', {});               // anchor i2
  s.selectAt('i5', { shift: true });
  assert.deepEqual(sel(s), ['i2', 'i3', 'i4', 'i5'], 'first extension');
  s.selectAt('i6', { shift: true });
  assert.deepEqual(sel(s), ['i2', 'i3', 'i4', 'i5', 'i6'], 're-extend grows from i2');
  s.selectAt('i3', { shift: true });
  assert.deepEqual(sel(s), ['i2', 'i3'], 're-extend SHRINKS from i2 — not from the previous i6');
  s.selectAt('i0', { shift: true });
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2'], 're-extend flips direction, still anchored at i2');
  assert.equal(s.getAnchor(), 'i2', 'anchor never moved');
  s.destroy();
});

test('shift-click with no anchor degrades to a plain click', () => {
  const s = createSelection();
  s.setItems(rows(4));
  s.selectAt('i2', { shift: true }); // no prior anchor
  assert.deepEqual(sel(s), ['i2']);
  assert.equal(s.getAnchor(), 'i2');
  s.destroy();
});

test('setAnchor() String()-coerces a numeric key so the next shift-range is contiguous', () => {
  // Items registered with numeric keys → keys normalize to strings ('1','2','3').
  const s = createSelection();
  s.setItems([
    { key: 1, x: 0, y: 0, w: 10, h: 10 },
    { key: 2, x: 0, y: 10, w: 10, h: 10 },
    { key: 3, x: 0, y: 20, w: 10, h: 10 },
  ]);
  s.setAnchor(1);                          // numeric arg — must coerce to '1'
  assert.equal(s.getAnchor(), '1', 'anchor stored as the normalized string key');
  s.selectAt(3, { shift: true });          // range '1'..'3'
  assert.deepEqual(sel(s), ['1', '2', '3'], 'contiguous range, not degraded to just the target');
  s.destroy();
});

test('setAnchor() rejects an unselectable key (null), is destroyed-guarded, and notifies', () => {
  const s = createSelection();
  s.setItems(rows(4));
  let n = 0; s.subscribe(() => n++);
  s.setAnchor('i9');                       // not a registered key
  assert.equal(s.getAnchor(), null, 'unknown key clears the anchor instead of storing junk');
  const afterValid = n;
  s.setAnchor('i1');                       // valid → emits
  assert.equal(s.getAnchor(), 'i1');
  assert.ok(n > afterValid, 'public setAnchor notifies like the other mutators');
  s.destroy();
  const before = n;
  assert.equal(s.setAnchor('i2'), s, 'returns the instance after destroy');
  assert.equal(s.getAnchor(), 'i1', 'anchor unchanged after destroy');
  assert.equal(n, before, 'no emission after destroy');
});

// ============================================================================
// Ctrl/Cmd-toggle (scattered selections; anchor follows the toggle)
// ============================================================================

test('ctrl-click toggles in/out without clearing; builds a scattered set; moves the anchor', () => {
  const s = createSelection();
  s.setItems(rows(6));
  s.selectAt('i0', {});               // i0
  s.selectAt('i2', { ctrl: true });   // + i2
  s.selectAt('i4', { meta: true });   // + i4  (meta == cmd)
  assert.deepEqual(sel(s), ['i0', 'i2', 'i4'], 'scattered, nothing cleared');
  assert.equal(s.getAnchor(), 'i4', 'anchor is the last toggled');
  s.selectAt('i2', { ctrl: true });   // toggle i2 back OUT
  assert.deepEqual(sel(s), ['i0', 'i4']);
  assert.equal(s.getAnchor(), 'i2', 'anchor follows even a toggle-off');
  s.destroy();
});

test('a shift-click after a ctrl-toggle ranges from the toggled item', () => {
  const s = createSelection();
  s.setItems(rows(7));
  s.selectAt('i0', {});
  s.selectAt('i5', { ctrl: true });   // anchor now i5
  s.selectAt('i3', { shift: true });  // range i3..i5 (replaces)
  assert.deepEqual(sel(s), ['i3', 'i4', 'i5'], 'ranges from the ctrl-toggled anchor');
  s.destroy();
});

test('shift+ctrl-click adds a range additively (without clearing the existing selection)', () => {
  const s = createSelection();
  s.setItems(rows(9));
  s.selectAt('i0', {});
  s.selectAt('i1', { ctrl: true });   // scattered base {i0,i1}, anchor i1
  s.selectAt('i4', { shift: true, ctrl: true }); // additive range i1..i4 onto the base
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2', 'i3', 'i4']);
  // Re-extend the additive range to a CLOSER target: the range portion replaces, the base stays.
  s.selectAt('i2', { shift: true, ctrl: true });
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2'], 'additive re-extension does not leave a trail');
  s.destroy();
});

// ============================================================================
// Bulk / programmatic
// ============================================================================

test('selectAll / clear / toggle / select / deselect / setSelection', () => {
  const s = createSelection();
  s.setItems(rows(4));
  s.selectAll();
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2', 'i3']);
  assert.equal(s.getState().count, 4);
  s.clear();
  assert.deepEqual(sel(s), []);
  assert.equal(s.getAnchor(), null);
  s.toggle('i1'); s.toggle('i3'); s.toggle('i1'); // on, on, off
  assert.deepEqual(sel(s), ['i3']);
  s.select(['i0', 'i2']);                          // union-add
  assert.deepEqual(sel(s), ['i0', 'i2', 'i3']);
  s.deselect(['i3']);
  assert.deepEqual(sel(s), ['i0', 'i2']);
  s.setSelection(['i1', 'i2']);                    // replace exactly
  assert.deepEqual(sel(s), ['i1', 'i2']);
  assert.equal(s.isSelected('i1'), true);
  assert.equal(s.isSelected('i0'), false);
  s.destroy();
});

test('regression: setSelection() preserves a still-selectable anchor whose key left the selection', () => {
  // setSelection() used to clear the anchor on a MEMBERSHIP test (!selected.has(anchor)),
  // unlike every sibling path (setItems/setAnchor/pruneUnselectable/deselect) which keys off
  // SELECTABILITY. So replacing the selection away from the anchor's item silently broke the
  // next shift-range, while the identical operation via deselect() left it working.
  const s = createSelection();          // multi-select
  s.setItems(rows(5));
  s.selectAt('i1', {});                 // anchor i1
  assert.equal(s.getAnchor(), 'i1');
  s.setSelection(['i3']);               // i1 leaves the selection but is still a selectable item
  assert.equal(s.getAnchor(), 'i1', 'anchor survives: i1 is still selectable, just not selected');
  s.selectAt('i3', { shift: true });    // shift-range must extend i1..i3, not degrade to a click
  assert.deepEqual(sel(s), ['i1', 'i2', 'i3'], 'shift-range extends from the preserved anchor');
  // Parity check: the same behavior via deselect() (which never touched the anchor).
  const t = createSelection();
  t.setItems(rows(5));
  t.selectAt('i1', {});
  t.deselect(['i1']);
  assert.equal(t.getAnchor(), 'i1', 'deselect() also keeps the still-selectable anchor');
  s.destroy();
  t.destroy();
});

// ============================================================================
// Marquee — live selection + deltas (driven synchronously via the rAF fallback)
// ============================================================================

test('marquee selects items the box touches and de-selects as it shrinks back out', () => {
  const s = createSelection();
  s.setItems(grid(3, 3)); // 90px cells, 10px gap → cell r-c at (c*100, r*100)
  s.startMarquee(-5, -5);
  s.updateMarquee(95, 95);           // covers 0-0 only
  assert.deepEqual(sel(s), ['0-0']);
  s.updateMarquee(195, 195);         // grows to the top-left 2×2
  assert.deepEqual(sel(s), ['0-0', '0-1', '1-0', '1-1']);
  s.updateMarquee(95, 95);           // shrink back — the extra three de-select live
  assert.deepEqual(sel(s), ['0-0']);
  s.endMarquee();
  assert.deepEqual(sel(s), ['0-0'], 'commit keeps what the box held');
  assert.equal(s.getState().marquee.active, false, 'marquee state cleared on release');
  s.destroy();
});

test('marquee emits correct entered/left deltas each step', () => {
  const s = createSelection();
  s.setItems(grid(2, 2));
  const steps = [];
  s.subscribe((st) => steps.push({ e: st.delta.entered.slice().sort(), l: st.delta.left.slice().sort() }));
  s.startMarquee(-5, -5);            // emit: no change
  s.updateMarquee(95, 95);           // enter 0-0
  s.updateMarquee(195, 95);          // enter 0-1
  s.updateMarquee(95, 95);           // leave 0-1
  s.endMarquee();                    // no change
  // Drop the initial deferred + the startMarquee emit; inspect the meaningful ones.
  const meaningful = steps.filter((x) => x.e.length || x.l.length);
  assert.deepEqual(meaningful, [
    { e: ['0-0'], l: [] },
    { e: ['0-1'], l: [] },
    { e: [], l: ['0-1'] },
  ]);
  s.destroy();
});

test('marquee works dragging up-left (any direction) via box normalization', () => {
  const s = createSelection();
  s.setItems(grid(3, 3));
  s.startMarquee(295, 295);          // start bottom-right
  s.updateMarquee(105, 105);         // drag up-left to cover the bottom-right 2×2
  assert.deepEqual(sel(s), ['1-1', '1-2', '2-1', '2-2']);
  s.endMarquee();
  s.destroy();
});

test('contain-mode marquee only selects fully-enclosed items', () => {
  const s = createSelection({ intersect: 'contain' });
  s.setItems(grid(2, 2));            // cells at (0,0),(100,0),(0,100),(100,100), each 90×90
  s.startMarquee(-5, -5);
  s.updateMarquee(95, 95);           // fully encloses 0-0 only (touches but not encloses others)
  assert.deepEqual(sel(s), ['0-0']);
  s.updateMarquee(150, 150);         // now partially over 0-1/1-0/1-1 but encloses only 0-0
  assert.deepEqual(sel(s), ['0-0']);
  s.endMarquee();
  s.destroy();
});

test('additive marquee adds the box hits to the existing selection; replace mode clears first', () => {
  const s = createSelection();
  s.setItems(grid(3, 3));
  s.selectAt('2-2', {});             // pre-existing pick
  // Replace marquee clears 2-2 first, then fills from the box.
  s.startMarquee(-5, -5);
  assert.deepEqual(sel(s), [], 'replace marquee cleared the prior selection on start');
  s.updateMarquee(95, 95);
  assert.deepEqual(sel(s), ['0-0']);
  s.endMarquee();
  // Additive marquee keeps the existing selection.
  s.selectAt('2-2', {});
  s.startMarquee(-5, -5, { additive: true });
  s.updateMarquee(95, 95);
  assert.deepEqual(sel(s), ['0-0', '2-2'], 'additive kept 2-2 and added 0-0');
  s.endMarquee();
  s.destroy();
});

test('switching to single-select mid additive-marquee collapses to at most one (no residual)', () => {
  // Repro: an additive marquee holds the existing pick (0-0) PLUS the box hit (2-2); a mode
  // switch to single-select mid-drag must end at one item, not two. setMultiple(false) collapses
  // selected to 0-0, then re-tests the marquee — whose box hits 2-2. The single-select branch
  // must reconcile the FULL selection toward newHits, not just add the box hit (which would
  // leave 0-0 as a residual outside keysInBox/additiveBase → two items in single-select).
  for (const switchMode of [
    (s) => s.setMultiple(false),
    (s) => s.setOptions({ multiple: false }),
  ]) {
    const s = createSelection();
    s.setItems(grid(3, 3));
    s.selectAt('0-0', {});                      // pre-existing pick (first in order)
    s.startMarquee(250, 250, { additive: true });
    s.updateMarquee(295, 295);                  // box over 2-2 → additive selected {0-0, 2-2}
    assert.deepEqual(sel(s), ['0-0', '2-2'], 'additive marquee holds both before the switch');
    switchMode(s);                              // collapse to single-select mid-drag
    assert.equal(s.getState().config.multiple, false, 'config is now single-select');
    assert.equal(s.getState().count, 1, 'single-select must hold at most one item, not two');
    assert.deepEqual(sel(s), ['2-2'], 'keeps the box hit, drops the residual');
    s.endMarquee();
    assert.equal(s.getState().count, 1, 'still at most one after endMarquee commits');
    s.destroy();
  }
});

test('additive marquee derived from a modifiers object + additiveModifier config', () => {
  const s = createSelection({ additiveModifier: 'ctrlOrMeta' });
  s.setItems(grid(2, 2));
  s.selectAt('1-1', {});
  s.startMarquee(-5, -5, { modifiers: { meta: true } }); // meta matches ctrlOrMeta → additive
  s.updateMarquee(95, 95);
  assert.deepEqual(sel(s), ['0-0', '1-1']);
  s.endMarquee();
  s.destroy();
});

test('createSelection throws TypeError on an unknown additiveModifier (no silent shift fallback)', () => {
  assert.throws(() => createSelection({ additiveModifier: 'control' }), TypeError, "'control' is a typo for 'ctrl' and must throw, not fall back to shift");
  assert.throws(() => createSelection({ additiveModifier: 'cmd' }), TypeError);
  // The closed set still constructs cleanly, and null disables the modifier.
  for (const m of ['shift', 'ctrl', 'meta', 'alt', 'ctrlOrMeta', null]) {
    const s = createSelection({ additiveModifier: m });
    assert.equal(s.getState().config.additiveModifier, m);
    s.destroy();
  }
});

test('setOptions throws TypeError on an unknown additiveModifier', () => {
  const s = createSelection();
  assert.throws(() => s.setOptions({ additiveModifier: 'cmd' }), TypeError);
  // The prior (valid) config is unchanged after the rejected patch.
  assert.equal(s.getState().config.additiveModifier, 'shift');
  s.destroy();
});

test('setIntersectMode throws TypeError on an unknown mode (no silent intersect coercion)', () => {
  const s = createSelection({ intersect: IntersectMode.CONTAIN });
  assert.throws(() => s.setIntersectMode('overlap'), TypeError);
  // The rejected call left the prior mode intact (did NOT coerce to intersect).
  assert.equal(s.getState().config.intersect, IntersectMode.CONTAIN);
  // Valid values still switch the mode.
  s.setIntersectMode(IntersectMode.INTERSECT);
  assert.equal(s.getState().config.intersect, IntersectMode.INTERSECT);
  s.destroy();
});

test('createSelection throws TypeError on an unknown intersect (no silent intersect coercion)', () => {
  // 'overlap'/'contains'/'enclose' are typos for the two real members — they must throw at
  // construction, exactly like setIntersectMode(), not silently coerce to 'intersect'.
  assert.throws(() => createSelection({ intersect: 'overlap' }), TypeError, "'overlap' must throw, not fall back to intersect");
  assert.throws(() => createSelection({ intersect: 'contains' }), TypeError);
  assert.throws(() => createSelection({ intersect: 'enclose' }), TypeError);
  // The two real members still construct cleanly; omitting the option defaults to 'intersect'.
  for (const m of [IntersectMode.INTERSECT, IntersectMode.CONTAIN]) {
    const s = createSelection({ intersect: m });
    assert.equal(s.getState().config.intersect, m);
    s.destroy();
  }
  assert.equal(createSelection().getState().config.intersect, IntersectMode.INTERSECT, 'undefined → default intersect');
});

test('setOptions throws TypeError on an unknown intersect (matches setIntersectMode)', () => {
  const s = createSelection({ intersect: IntersectMode.CONTAIN });
  assert.throws(() => s.setOptions({ intersect: 'overlap' }), TypeError);
  // The rejected patch left the prior mode intact (did NOT coerce to intersect).
  assert.equal(s.getState().config.intersect, IntersectMode.CONTAIN);
  // An unrelated setOptions still round-trips the resolved 'contain' through buildConfig cleanly.
  s.setOptions({ multiple: false });
  assert.equal(s.getState().config.intersect, IntersectMode.CONTAIN);
  s.destroy();
});

test('cancelMarquee reverts the provisional changes to the pre-marquee selection', () => {
  const s = createSelection();
  s.setItems(grid(3, 3));
  s.selectAt('2-2', {});
  s.startMarquee(-5, -5);            // replace → clears 2-2
  s.updateMarquee(195, 195);         // selects the top-left 2×2
  assert.deepEqual(sel(s), ['0-0', '0-1', '1-0', '1-1']);
  s.cancelMarquee();
  assert.deepEqual(sel(s), ['2-2'], 'revert restores exactly the pre-marquee selection');
  assert.equal(s.getState().marquee.active, false);
  s.destroy();
});

test('marquee rect is exposed in state while active and null when idle', () => {
  const s = createSelection();
  s.setItems(rows(3));
  assert.equal(s.getState().marquee.rect, null);
  s.startMarquee(10, 20);
  s.updateMarquee(40, 60);
  const r = s.getState().marquee.rect;
  assert.deepEqual([r.x, r.y, r.width, r.height], [10, 20, 30, 40]);
  s.endMarquee();
  assert.equal(s.getState().marquee.rect, null);
  s.destroy();
});

// ============================================================================
// Disabled items — skipped by clicks, ranges, marquee, select-all
// ============================================================================

test('disabled items are skipped by clicks, ranges, marquee, and select-all', () => {
  const s = createSelection();
  s.setItems([
    { key: 'a', x: 0, y: 0, w: 100, h: 100 },
    { key: 'b', x: 0, y: 100, w: 100, h: 100, disabled: true },
    { key: 'c', x: 0, y: 200, w: 100, h: 100, selectable: false },
    { key: 'd', x: 0, y: 300, w: 100, h: 100 },
  ]);
  s.selectAt('b', {});                    // disabled → ignored
  assert.deepEqual(sel(s), []);
  s.selectAt('a', {});
  s.selectAt('d', { shift: true });       // range a..d skips disabled b and c
  assert.deepEqual(sel(s), ['a', 'd']);
  s.clear();
  s.startMarquee(-5, -5);
  s.updateMarquee(105, 405);              // box over all four rows
  assert.deepEqual(sel(s), ['a', 'd'], 'marquee skips disabled');
  s.endMarquee();
  s.selectAll();
  assert.deepEqual(sel(s), ['a', 'd'], 'select-all skips disabled');
  s.destroy();
});

test('setDisabled(predicate) re-derives selectability and drops now-unselectable selected keys', () => {
  const s = createSelection();
  s.setItems(rows(4));
  s.selectAll();
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2', 'i3']);
  s.setDisabled((k) => k === 'i1' || k === 'i2');
  assert.deepEqual(sel(s), ['i0', 'i3'], 'i1/i2 dropped from the selection when disabled');
  assert.equal(s.isSelectable('i1'), false);
  s.setDisabled(null);                    // re-enable
  assert.equal(s.isSelectable('i1'), true);
  s.selectAll();
  assert.deepEqual(sel(s), ['i0', 'i1', 'i2', 'i3']);
  s.destroy();
});

// ============================================================================
// setItems consistency (geometry changes / virtualizer recompute)
// ============================================================================

test('setItems keeps still-present keys selected and drops vanished ones', () => {
  const s = createSelection();
  s.setItems(rows(5));
  s.select(['i1', 'i3', 'i4']);
  s.setItems([rows(5)[0], rows(5)[1], rows(5)[2]]); // i3, i4 vanish
  assert.deepEqual(sel(s), ['i1'], 'survivors stay, vanished drop');
  assert.equal(s.getItemCount(), 3);
  s.destroy();
});

test('setItems that removes the anchor clears the anchor', () => {
  const s = createSelection();
  s.setItems(rows(4));
  s.selectAt('i3', {});
  assert.equal(s.getAnchor(), 'i3');
  s.setItems(rows(2)); // i3 gone
  assert.equal(s.getAnchor(), null, 'anchor cleared when its key vanished');
  s.destroy();
});

test('an order change via setItems is reflected in the next shift-range', () => {
  const s = createSelection();
  s.setItems(rows(4)); // i0,i1,i2,i3
  // Reorder: put i3 first. New selectable order: i3,i0,i1,i2
  s.setItems([
    { key: 'i3', x: 0, y: 0, w: 100, h: 100 },
    { key: 'i0', x: 0, y: 100, w: 100, h: 100 },
    { key: 'i1', x: 0, y: 200, w: 100, h: 100 },
    { key: 'i2', x: 0, y: 300, w: 100, h: 100 },
  ]);
  s.selectAt('i3', {});                 // anchor at the new first
  s.selectAt('i1', { shift: true });    // range over the NEW order i3..i1
  assert.deepEqual(sel(s), ['i0', 'i1', 'i3'], 'range follows the new order');
  s.destroy();
});

test('setItems mid-marquee re-tests the box against the new geometry', () => {
  const s = createSelection();
  s.setItems(grid(3, 3));
  s.startMarquee(-5, -5);
  s.updateMarquee(195, 95);             // top row 0-0,0-1
  assert.deepEqual(sel(s), ['0-0', '0-1']);
  // The virtualizer recomputes: shift everything right by 100 → only 0-0 stays in the box.
  s.setItems(grid(3, 3).map((it) => ({ ...it, x: it.x + 100 })));
  assert.deepEqual(sel(s), ['0-0'], 'box re-tested against the moved rects');
  s.endMarquee();
  s.destroy();
});

// ============================================================================
// Single-select mode (multiple:false) — interactions degrade sensibly
// ============================================================================

test('single-select: every interaction collapses to at most one item', () => {
  const s = createSelection({ multiple: false });
  s.setItems(rows(5));
  s.selectAt('i1', {});
  assert.deepEqual(sel(s), ['i1']);
  s.selectAt('i3', { shift: true });    // shift degrades to plain select
  assert.deepEqual(sel(s), ['i3']);
  s.selectAt('i3', { ctrl: true });     // ctrl toggles the one off
  assert.deepEqual(sel(s), []);
  s.selectAt('i2', { ctrl: true });     // ctrl selects just i2
  assert.deepEqual(sel(s), ['i2']);
  s.selectAll();                        // no-op in single mode
  assert.deepEqual(sel(s), ['i2']);
  s.destroy();
});

test('single-select marquee selects the first touched item only', () => {
  const s = createSelection({ multiple: false });
  s.setItems(grid(3, 3));
  s.startMarquee(-5, -5);
  s.updateMarquee(195, 195);            // box over 4 cells; single mode keeps the first in order
  assert.deepEqual(sel(s), ['0-0']);
  s.endMarquee();
  s.destroy();
});

test('regression: single-select collapse of select() matches setSelection() (item order, not arg order)', () => {
  // Two sibling reconcilers used to disagree: select() kept valid[0] (first ARG), while
  // setSelection() → reduceToFirst kept the first key in ITEM order. With items [a,b], a
  // reversed key list must collapse to the same survivor through both paths.
  const a = createSelection({ multiple: false });
  a.setItems([{ key: 'a', x: 0, y: 0, w: 10, h: 10 }, { key: 'b', x: 20, y: 0, w: 10, h: 10 }]);
  a.select(['b', 'a']);
  const b = createSelection({ multiple: false });
  b.setItems([{ key: 'a', x: 0, y: 0, w: 10, h: 10 }, { key: 'b', x: 20, y: 0, w: 10, h: 10 }]);
  b.setSelection(['b', 'a']);
  assert.deepEqual(sel(a), ['a'], 'select() keeps the first item in item order');
  assert.deepEqual(sel(a), sel(b), 'select() and setSelection() agree on the single survivor');
  a.destroy(); b.destroy();
});

test('switching to single mode collapses an existing multi-selection', () => {
  const s = createSelection();
  s.setItems(rows(5));
  s.select(['i1', 'i2', 'i3']);
  s.setMultiple(false);
  assert.equal(s.getState().count, 1, 'reduced to one');
  assert.deepEqual(sel(s), ['i1'], 'kept the first in order');
  s.destroy();
});

// ============================================================================
// Spatial index — equals brute force, and the engine uses it transparently
// ============================================================================

test('spatial index returns the exact same hits as brute force over random data', () => {
  // Deterministic LCG so the test is reproducible.
  let x = 12345;
  const rand = () => (x = (x * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const items = [];
  for (let i = 0; i < 4000; i++) {
    const left = Math.floor(rand() * 3000), top = Math.floor(rand() * 3000);
    items.push({ key: 'k' + i, left, top, right: left + Math.floor(rand() * 40 + 5), bottom: top + Math.floor(rand() * 40 + 5) });
  }
  const idx = createSpatialIndex(items);
  for (let t = 0; t < 150; t++) {
    const box = normalizeBox(rand() * 3000, rand() * 3000, rand() * 3000, rand() * 3000);
    const brute = boxHitTest(items, box, 'intersect');
    const viaIdx = new Set();
    for (const it of idx.query(box)) if (box.left <= it.right && box.right >= it.left && box.top <= it.bottom && box.bottom >= it.top) viaIdx.add(it.key);
    assert.equal(viaIdx.size, brute.size, `box ${t}: size matches`);
    for (const k of brute) assert.ok(viaIdx.has(k), `box ${t}: ${k} present in index result`);
  }
});

test('regression: spatial index keys cells collision-free at large coordinates (no dropped hits)', () => {
  // Two cells that an integer pack `(cellX+BIAS)*(1<<16)+(cellY+BIAS)` (BIAS=1<<15) collides:
  // (0,40000) and (1,-25536) both packed to the same id, so B got mis-filed into A's bucket and
  // the cell-iteration query branch (filtering by the bucket's stored cellX/cellY) silently
  // dropped it. The index must remain a SUPERSET of the brute-force hits everywhere.
  const items = [
    { key: 'A', left: 0, top: 40000, right: 0, bottom: 40000 },
    { key: 'B', left: 1, top: -25536, right: 1, bottom: -25536 },
  ];
  const idx = createSpatialIndex(items, 1); // cellSize 1 → cell coord == coord
  const box = normalizeBox(0.5, -25536.5, 1.5, -25535.5); // tightly around B
  const brute = boxHitTest(items, box, 'intersect');
  const viaIdx = new Set();
  for (const it of idx.query(box)) if (box.left <= it.right && box.right >= it.left && box.top <= it.bottom && box.bottom >= it.top) viaIdx.add(it.key);
  assert.ok(brute.has('B'), 'brute force selects B');
  for (const k of brute) assert.ok(viaIdx.has(k), `index must include ${k} (superset of brute)`);
  assert.equal(viaIdx.size, brute.size, 'index returns exactly the brute set');
});

test("engine with index:'on' produces the same marquee selection as without", () => {
  const items = grid(10, 10); // 100 items
  const plain = createSelection();
  const indexed = createSelection({ index: true });
  plain.setItems(items); indexed.setItems(items);
  assert.equal(indexed.getState().config.index.on, true, 'index reported on');
  assert.equal(plain.getState().config.index.on, false);
  for (const s of [plain, indexed]) { s.startMarquee(-5, -5); s.updateMarquee(350, 250); }
  assert.deepEqual(sel(plain), sel(indexed), 'indexed hit-test equals brute-force engine');
  plain.endMarquee(); indexed.endMarquee();
  plain.destroy(); indexed.destroy();
});

test("index:'auto' turns on only past the threshold", () => {
  const small = createSelection({ index: 'auto' });
  small.setItems(rows(100));
  assert.equal(small.getState().config.index.on, false, 'auto off for small N');
  const big = createSelection({ index: 'auto' });
  big.setItems(rows(2500));
  assert.equal(big.getState().config.index.on, true, 'auto on past ~2000');
  small.destroy(); big.destroy();
});

// ============================================================================
// State emission / subscription
// ============================================================================

testAsync('deferred initial emit reaches a synchronous subscriber', async () => {
  const s = createSelection();
  let got = null;
  s.subscribe((st) => (got = st));
  s.setItems(rows(3));
  assert.equal(got, null, 'no synchronous emit yet (deferred a microtask)');
  await flush();
  assert.ok(got, 'subscriber received the deferred initial state');
  assert.equal(got.count, 0);
  s.destroy();
});

test('subscribe fires on a synchronous change; unsubscribe stops it', () => {
  const s = createSelection();
  s.setItems(rows(3));
  let n = 0;
  const off = s.subscribe(() => n++);
  s.selectAt('i0', {});
  assert.equal(n, 1, 'fired on the click');
  off();
  s.selectAt('i1', {});
  assert.equal(n, 1, 'no longer firing after unsubscribe');
  s.destroy();
});

test('the change payload carries selected/count/anchor/delta/marquee + a lazy selectedKeys', () => {
  const s = createSelection();
  s.setItems(rows(4));
  let last = null;
  s.subscribe((st) => (last = st));
  s.selectAt('i1', {});
  assert.ok(last.selected instanceof Set);
  assert.equal(last.count, 1);
  assert.equal(last.anchor, 'i1');
  assert.deepEqual(last.delta, { entered: ['i1'], left: [] });
  assert.deepEqual(last.selectedKeys, ['i1'], 'lazy ordered array');
  s.selectAt('i3', { ctrl: true });
  assert.deepEqual(last.delta, { entered: ['i3'], left: [] });
  assert.deepEqual(last.selectedKeys, ['i1', 'i3'], 'selectedKeys in item order');
  s.destroy();
});

test('getState() is a read-only snapshot — it does not consume the pending delta', () => {
  const s = createSelection();
  s.setItems(rows(3));
  s.selectAt('i0', {});                 // emits, draining the delta
  const a = s.getState();
  assert.deepEqual(a.delta, { entered: [], left: [] }, 'a pull carries an empty delta');
  s.destroy();
});

// ============================================================================
// Lifecycle
// ============================================================================

test('destroy() makes the instance inert and is safe to call twice', () => {
  const s = createSelection();
  s.setItems(rows(3));
  let n = 0; s.subscribe(() => n++);
  s.destroy();
  s.destroy();                          // idempotent
  const before = n;
  s.selectAt('i0', {});                 // post-destroy is a no-op
  assert.equal(n, before, 'no emissions after destroy');
  assert.equal(s.getState().count, 0);
  s.destroy();
});

test('config setters are inert (no-ops) after destroy — matching setOptions', () => {
  const s = createSelection({ multiple: true });
  s.setItems(rows(4));
  s.destroy();
  const cfgBefore = s.getState().config;
  // setIntersectMode used to THROW on an unknown mode even after destroy — must now be a silent no-op.
  assert.doesNotThrow(() => s.setIntersectMode('overlap'), 'no validation/throw after destroy');
  s.setMultiple(false);
  s.setDisabled(() => true);
  s.setAutoScroll({ speed: 99 });
  s.setScrollContainer({});
  const cfgAfter = s.getState().config;
  assert.equal(cfgAfter.multiple, cfgBefore.multiple, 'multiple unchanged after destroy');
  assert.equal(cfgAfter.intersect, cfgBefore.intersect, 'intersect unchanged after destroy');
  assert.equal(cfgAfter.hasDisabled, cfgBefore.hasDisabled, 'disabled predicate not applied after destroy');
  // Each setter still returns the instance for chaining symmetry.
  assert.equal(s.setMultiple(true), s);
});

test('setScrollContainer / setAutoScroll are headless-safe (no rAF, no element needed)', () => {
  const s = createSelection({ autoScroll: true });
  s.setItems(rows(50));
  s.setScrollContainer(null);
  s.setAutoScroll({ speed: 20, edge: 40 });
  // A marquee with auto-scroll configured but no real scroll element / rAF must still run.
  s.startMarquee(-5, -5);
  s.updateMarquee(50, 5000);
  assert.ok(s.getState().count > 0, 'hit-test still works without a scroll element');
  s.endMarquee();
  assert.equal(s.getState().config.autoScroll.speed, 20);
  s.destroy();
});

test('regression: NaN autoScroll.speed never poisons the container scrollTop to NaN', () => {
  // A NaN speed survives clamp() (NaN<min and NaN>max are both false), so it used to be
  // written verbatim into the real DOM element's scrollTop, permanently breaking scrolling.
  // Drive ONE auto-scroll tick via a one-shot rAF stub and assert scrollTop stays finite.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  // Queue stub: a marquee move schedules a marquee frame, which arms the auto-scroll tick,
  // which re-arms itself — so we drain a BOUNDED number of frames manually (a synchronous
  // auto-invoke would recurse forever).
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drain = (maxFrames) => {
    for (let i = 0; i < maxFrames && queued.size; i++) {
      const [id, cb] = queued.entries().next().value;
      queued.delete(id);
      cb();
    }
  };
  try {
    const makeEl = () => ({
      scrollTop: 50, scrollLeft: 0, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 100,
    });
    const driveOneTick = (speed) => {
      const el = makeEl();
      const s = createSelection({ autoScroll: { speed, edge: 56 } });
      s.setItems(rows(20));
      s.setScrollContainer(el);
      s.startMarquee(10, 50);
      queued.clear();
      s.updateMarquee(10, 195); // point past the bottom edge → arms the marquee + auto-scroll loop
      drain(2);                  // frame 1: marquee (arms tick); frame 2: exactly one auto-scroll step
      s.cancelMarquee();
      s.destroy();
      return el.scrollTop;
    };
    const poisoned = driveOneTick(NaN);
    assert.ok(Number.isFinite(poisoned), `scrollTop must stay finite after a NaN-speed tick (got ${poisoned})`);
    assert.ok(poisoned > 50, 'NaN speed falls back to the default (14), so it still scrolls down');
    const valid = driveOneTick(14);
    assert.equal(valid, 64, 'a finite speed scrolls by exactly that many px');
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: auto-scroll RE-ARMS each frame and keeps scrolling while the pointer is held at the edge', () => {
  // autoScrollTick must zero autoScrollFrameId at entry (like scheduleMarqueeFrame's callback);
  // otherwise the stale non-zero id makes the inner maybeAutoScroll() and the re-arm guard both
  // no-op, so the container nudges ONCE (e.g. 50→64) then freezes for the rest of the marquee.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drainOne = () => {
    if (!queued.size) return false;
    const [id, cb] = queued.entries().next().value;
    queued.delete(id);
    cb();
    return true;
  };
  try {
    const el = {
      scrollTop: 50, scrollLeft: 0, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 100,
    };
    const s = createSelection({ autoScroll: { speed: 14, edge: 56 } });
    s.setItems(rows(20));
    s.setScrollContainer(el);
    s.startMarquee(10, 50);
    queued.clear();
    s.updateMarquee(10, 195); // hold the pointer past the bottom edge → arms marquee + auto-scroll
    drainOne();               // frame 1: marquee frame arms the auto-scroll tick
    drainOne();               // frame 2: first auto-scroll step (50 → 64) and must re-arm
    assert.equal(el.scrollTop, 64, 'first step scrolled by exactly one speed unit');
    assert.equal(queued.size, 1, 'tick re-armed a follow-up frame instead of dying after one step');
    drainOne();               // frame 3: second step continues (64 → 78)
    assert.equal(el.scrollTop, 78, 'auto-scroll keeps advancing each frame, not frozen after one step');
    assert.ok(queued.size >= 1, 'still re-arming for the next frame');
    // Drain several more and confirm it marches all the way to the bottom (does not freeze).
    for (let i = 0; i < 100 && queued.size; i++) drainOne();
    assert.equal(el.scrollTop, 900, 'scrolls continuously to the bottom (scrollHeight - clientHeight)');
    s.cancelMarquee();
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: a NaN scrollTop read from the container never poisons marquee.currentPoint', () => {
  // The container metrics are read straight off the consumer element. A stub/detached element
  // can return NaN for scrollTop while a HORIZONTAL edge fires (stepX != 0 skips the off-edge
  // early-return). clamp(NaN, …) used to write scrollTop = NaN and then bleed NaN into
  // marquee.currentPoint.y via the y-delta, silently breaking every later hit-test.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drain = (maxFrames) => {
    for (let i = 0; i < maxFrames && queued.size; i++) {
      const [id, cb] = queued.entries().next().value;
      queued.delete(id);
      cb();
    }
  };
  try {
    // scrollTop is NaN (passes the `typeof … === 'number'` capability guard); horizontal axis is
    // scrollable and the pointer sits near the right edge so stepX != 0.
    const el = {
      scrollTop: NaN, scrollLeft: 0, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 1000,
    };
    const s = createSelection({ autoScroll: { speed: 14, edge: 56 } });
    s.setItems(rows(20));
    s.setScrollContainer(el);
    s.startMarquee(10, 50);
    queued.clear();
    s.updateMarquee(95, 50); // near the right edge → arms marquee + auto-scroll loop
    drain(2);                // frame 1: marquee (arms tick); frame 2: one auto-scroll step
    assert.ok(Number.isFinite(el.scrollTop), `scrollTop must stay finite (got ${el.scrollTop})`);
    const pt = s.getState().marquee.rect;
    assert.ok(pt && Number.isFinite(pt.x) && Number.isFinite(pt.y),
      `marquee rect must stay finite (got ${JSON.stringify(pt)})`);
    s.cancelMarquee();
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: auto-scroll does not re-arm its rAF after onChange tears the marquee down', () => {
  // recomputeMarquee() inside the tick calls onChange synchronously; if that handler cancels or
  // destroys the marquee, stopAutoScroll() zeroes autoScrollFrameId — the tick must NOT then
  // unconditionally schedule another frame, resurrecting a dead loop after teardown.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drain = (maxFrames) => {
    for (let i = 0; i < maxFrames && queued.size; i++) {
      const [id, cb] = queued.entries().next().value;
      queued.delete(id);
      cb();
    }
  };
  try {
    const el = {
      scrollTop: 50, scrollLeft: 0, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 100,
    };
    const s = createSelection({ autoScroll: { speed: 14, edge: 56 } });
    s.setItems(rows(20));
    s.setScrollContainer(el);
    // onChange ends the marquee the first time the auto-scroll step moves the point.
    let cancelled = false;
    s.subscribe(() => {
      if (s.getState().marquee.active && el.scrollTop > 50 && !cancelled) {
        cancelled = true;
        s.cancelMarquee(); // calls stopAutoScroll() → autoScrollFrameId = 0
      }
    });
    s.startMarquee(10, 50);
    queued.clear();
    s.updateMarquee(10, 195); // past the bottom edge → arms marquee + auto-scroll loop
    drain(2);                 // frame 1: marquee (arms tick); frame 2: auto-scroll step → onChange cancels
    assert.equal(cancelled, true, 'onChange handler ran during the auto-scroll step');
    assert.equal(s.getState().marquee.active, false, 'marquee was cancelled from onChange');
    assert.equal(queued.size, 0, 'no stray rAF re-armed after teardown from onChange');
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: setAutoScroll({ speed: NaN }) falls back to a finite default', () => {
  const s = createSelection({ autoScroll: true });
  s.setAutoScroll({ speed: NaN, edge: NaN });
  assert.equal(s.getState().config.autoScroll.speed, 14, 'NaN speed → default 14');
  assert.equal(s.getState().config.autoScroll.edge, 56, 'NaN edge → default 56');
  s.destroy();
});

test('regression: enabling setAutoScroll() mid-drag arms the auto-scroll loop immediately (no extra updateMarquee)', () => {
  // setAutoScroll() was the only marquee-affecting setter that ended with an unconditional
  // notify() instead of `if (marquee.active) recomputeMarquee(); else notify()`. recomputeMarquee()
  // is the only path that calls maybeAutoScroll() to arm the rAF loop, so turning auto-scroll ON
  // while a marquee is already held past a scroll edge used to do NOTHING until the consumer's
  // next updateMarquee(). It must now arm the loop on the spot — drive frames and assert scrollTop
  // moves with NO further updateMarquee() call.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drain = (maxFrames) => {
    for (let i = 0; i < maxFrames && queued.size; i++) {
      const [id, cb] = queued.entries().next().value;
      queued.delete(id);
      cb();
    }
  };
  try {
    const el = {
      scrollTop: 50, scrollLeft: 0, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 100,
    };
    // Auto-scroll DISABLED at construction.
    const s = createSelection();
    s.setItems(rows(20));
    s.setScrollContainer(el);
    s.startMarquee(10, 50);
    s.updateMarquee(10, 195); // hold the pointer past the bottom edge — but auto-scroll is OFF
    queued.clear();
    drain(8);                 // no auto-scroll frames are armed yet
    assert.equal(el.scrollTop, 50, 'no scrolling while auto-scroll is disabled');
    assert.equal(queued.size, 0, 'no rAF armed while auto-scroll is disabled');

    // Enable auto-scroll MID-DRAG. With the fix this re-runs recomputeMarquee()->maybeAutoScroll()
    // and arms the loop right away — without any further updateMarquee().
    s.setAutoScroll({ speed: 14, edge: 56 });
    assert.equal(queued.size, 1, 'setAutoScroll() armed an auto-scroll frame on the active marquee');
    drain(1);                 // first auto-scroll step
    assert.equal(el.scrollTop, 64, 'auto-scroll advances immediately after enabling, no updateMarquee needed');
    assert.ok(queued.size >= 1, 'loop keeps re-arming while the pointer is held at the edge');

    s.cancelMarquee();
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: an Infinity scrollLeft read from the container never poisons marquee.currentPoint.x', () => {
  // The horizontal axis used `|| 0`, which rejects NaN but passes Infinity straight through:
  // clamp() returned a finite scrollLeft, but `scrollLeft_after - leftBefore(=Infinity)` was
  // -Infinity, bleeding into marquee.currentPoint.x and making every later rect.x non-finite.
  const prevRaf = globalThis.requestAnimationFrame;
  const prevCancel = globalThis.cancelAnimationFrame;
  let nextId = 1;
  const queued = new Map();
  globalThis.requestAnimationFrame = (cb) => { const id = nextId++; queued.set(id, cb); return id; };
  globalThis.cancelAnimationFrame = (id) => { queued.delete(id); };
  const drain = (maxFrames) => {
    for (let i = 0; i < maxFrames && queued.size; i++) {
      const [id, cb] = queued.entries().next().value;
      queued.delete(id);
      cb();
    }
  };
  try {
    // scrollLeft is Infinity (passes the typeof === 'number' capability guard); horizontal axis
    // is scrollable (scrollWidth > clientWidth) so stepX fires and the off-edge early-return is skipped.
    const el = {
      scrollTop: 50, scrollLeft: Infinity, clientHeight: 100, clientWidth: 100,
      scrollHeight: 1000, scrollWidth: 1000,
    };
    const s = createSelection({ autoScroll: { speed: 14, edge: 56 } });
    s.setItems(rows(20));
    s.setScrollContainer(el);
    s.startMarquee(10, 50);
    queued.clear();
    s.updateMarquee(10, 50); // near the left edge horizontally → arms marquee + auto-scroll loop
    drain(2);                // frame 1: marquee (arms tick); frame 2: one auto-scroll step
    const rect = s.getState().marquee.rect;
    assert.ok(rect && Number.isFinite(rect.x) && Number.isFinite(rect.width),
      `marquee rect.x/width must stay finite (got ${JSON.stringify(rect)})`);
    assert.ok(Number.isFinite(rect.y), 'rect.y stays finite too');
    s.cancelMarquee();
    s.destroy();
  } finally {
    globalThis.requestAnimationFrame = prevRaf;
    globalThis.cancelAnimationFrame = prevCancel;
  }
});

test('regression: startMarquee does not resurrect a destroyed instance when a re-entrant cancel destroys it', () => {
  // startMarquee() runs cancelMarquee() when a marquee is already active. cancelMarquee()
  // notifies synchronously; if that onChange destroys the engine (legitimate unmount-on-change),
  // startMarquee must NOT continue and rebuild a LIVE marquee on the freed instance.
  const s = createSelection();
  s.setItems(grid(3, 3));
  let destroyOnNextCancel = false;
  s.subscribe(() => {
    // Destroy precisely when the in-call cancelMarquee() reverts the active marquee.
    if (destroyOnNextCancel && !s.getState().marquee.active) {
      destroyOnNextCancel = false;
      s.destroy();
    }
  });
  s.startMarquee(-5, -5);              // marquee #1 active
  s.updateMarquee(95, 95);             // select something so cancel has a change to emit
  destroyOnNextCancel = true;
  s.startMarquee(-5, -5);              // triggers cancelMarquee() → onChange → destroy()
  const st = s.getState();
  assert.equal(st.marquee.active, false, 'no live marquee left on the destroyed instance');
  assert.equal(st.marquee.rect, null, 'no stale marquee rect on the destroyed instance');
  assert.equal(st.count, 0, 'selection cleared by destroy, not rebuilt by startMarquee');
  s.destroy();                         // idempotent
});

test('regression: setMultiple/setDisabled/setOptions re-test an in-progress marquee (parity with setIntersectMode)', () => {
  // recomputeMarquee() reads config.intersect/multiple + the selectable set each frame. The
  // sibling setters used to only notify(), leaving the live selection on the OLD mode until the
  // next updateMarquee — while setIntersectMode() re-tested immediately. All must now agree.

  // setOptions({ intersect }) re-tests live.
  const a = createSelection();
  a.setItems(grid(2, 2));              // 90×90 cells at (0,0),(100,0),(0,100),(100,100)
  a.startMarquee(-5, -5);
  a.updateMarquee(95, 95);             // intersect mode: encloses only 0-0 here anyway
  a.updateMarquee(150, 150);           // intersect: touches all four (box right/bottom past 100)
  assert.deepEqual(sel(a), ['0-0', '0-1', '1-0', '1-1'], 'intersect selects all four mid-drag');
  a.setOptions({ intersect: 'contain' });
  assert.deepEqual(sel(a), ['0-0'], 'setOptions({intersect}) re-tested the live box → only 0-0 contained');
  a.endMarquee();
  a.destroy();

  // setMultiple(false) collapses the live marquee to the first hit.
  const b = createSelection();
  b.setItems(grid(2, 2));
  b.startMarquee(-5, -5);
  b.updateMarquee(150, 150);           // multi: all four
  assert.equal(b.getState().count, 4);
  b.setMultiple(false);
  assert.deepEqual(sel(b), ['0-0'], 'setMultiple(false) re-tested the live box → single first hit');
  b.endMarquee();
  b.destroy();

  // setDisabled(predicate) drops a now-unselectable key from the live marquee immediately.
  const c = createSelection();
  c.setItems(grid(2, 2));
  c.startMarquee(-5, -5);
  c.updateMarquee(150, 150);           // all four
  assert.equal(c.getState().count, 4);
  c.setDisabled((k) => k === '0-1');
  assert.deepEqual(sel(c), ['0-0', '1-0', '1-1'], 'setDisabled re-tested the live box → 0-1 dropped');
  c.endMarquee();
  c.destroy();
});

test('regression: endMarquee does not clobber a fresh marquee started by a re-entrant onChange', () => {
  // endMarquee() runs recomputeMarquee()→notify() BEFORE it resets marquee to idle. If that
  // onChange chains a new gesture (legitimate: startMarquee on a selection change), endMarquee
  // used to read the NEW marquee's box and overwrite it with idleMarquee() — silently destroying
  // the just-started marquee with no cancel/cleanup. It must leave the re-entrant gesture intact,
  // mirroring autoScrollTick's / startMarquee's post-notify liveness re-checks.
  const s = createSelection();
  s.setItems(grid(3, 3));
  let ending = false;
  let restarted = false;
  s.on('change', () => {
    if (ending && !restarted) {
      restarted = true;
      s.startMarquee(50, 50);           // consumer chains a new marquee during the change
    }
  });
  s.startMarquee(-5, -5);               // marquee #1
  s.updateMarquee(95, 95);
  ending = true;
  s.endMarquee();                       // recompute→onChange starts marquee #2; must survive
  ending = false;

  const st = s.getState();
  assert.equal(st.marquee.active, true, 'the re-entrant marquee is still live, not clobbered');
  assert.equal(st.marquee.rect.left, 50, 'state reflects marquee #2, not the dead #1');
  // And it must still be drivable — updateMarquee/endMarquee are not no-ops on a live gesture.
  s.updateMarquee(150, 150);
  assert.ok(s.getState().count > 0, 'updateMarquee on the re-entrant marquee selects items');
  s.endMarquee();
  assert.equal(s.getState().marquee.active, false, 'marquee #2 ends cleanly');
  s.destroy();
});

// ============================================================================
// rangeBetween (pure)
// ============================================================================

test('rangeBetween: forward, backward, single, missing endpoints', () => {
  const keys = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(rangeBetween(keys, 'b', 'd'), ['b', 'c', 'd'], 'forward');
  assert.deepEqual(rangeBetween(keys, 'd', 'b'), ['b', 'c', 'd'], 'backward → same slice');
  assert.deepEqual(rangeBetween(keys, 'c', 'c'), ['c'], 'single');
  assert.deepEqual(rangeBetween(keys, null, 'c'), ['c'], 'no anchor → just target');
  assert.deepEqual(rangeBetween(keys, 'b', 'zz'), [], 'missing target → empty');
  assert.deepEqual(rangeBetween(keys, 'zz', 'c'), ['c'], 'missing anchor → just target');
});

// ---- regressions from the audit/refactor pass ------------------------------

test('regression: setOptions({}) preserves a previously-enabled spatial index', () => {
  // buildConfig used to map index:true -> 'on' but not accept 'on' back, so any
  // unrelated setOptions() round-trip silently disabled the index.
  const sel = createSelection({ index: true });
  sel.setItems([{ key: 'a', x: 0, y: 0, w: 10, h: 10 }]);
  assert.equal(sel.getState().config.index.on, true, 'index on after creation');
  sel.setOptions({ multiple: true }); // unrelated patch
  assert.equal(sel.getState().config.index.on, true, 'index still on after setOptions');
});

test('regression: Infinity/huge rects cannot hang the spatial index', () => {
  // An Infinity-sized rect used to make the bucketing loop run forever; finite but
  // enormous rects exploded the bucket count. Both now go to the oversized list
  // (or are normalized to zero size) and results stay exact.
  const sel = createSelection({ index: true });
  sel.setItems([
    { key: 'inf', x: 0, y: 0, w: Infinity, h: 10 },     // normalized to zero width
    { key: 'huge', x: -1e9, y: 5, w: 2e9, h: 10 },      // finite, spans everything
    { key: 'normal', x: 100, y: 0, w: 10, h: 10 },
  ]);
  sel.startMarquee(95, 0);
  sel.updateMarquee(120, 20); // box covers 'normal' and intersects 'huge'
  sel.endMarquee();
  const picked = sel.getSelectedKeys().sort();
  assert.deepEqual(picked, ['huge', 'normal'], `index query stays exact (${picked})`);
});

test('regression: a sparse-but-wide index query does not hang on empty cells (DoS)', () => {
  // The index clamps a query into the populated ENVELOPE rectangle, but the envelope is a
  // bounding box, not the populated-cell count. Two tiny items far apart make the envelope span
  // an enormous mostly-empty grid; query() used to walk every empty cell (≈2.5e11 Map lookups
  // here) and hang the main thread. It must now cost O(populated cells) and return instantly.
  const idx = createSpatialIndex([
    { key: 'a', left: 0, top: 0, right: 10, bottom: 10 },
    { key: 'b', left: 5_000_000, top: 5_000_000, right: 5_000_010, bottom: 5_000_010 },
  ]);
  // A box spanning both clusters → envelope ≈ 500001×500001 cells, but only 2 are populated.
  const t0 = Date.now();
  const hits = idx.query({ left: 0, top: 0, right: 5_000_010, bottom: 5_000_010 })
    .map((it) => it.key).sort();
  const ms = Date.now() - t0;
  assert.deepEqual(hits, ['a', 'b'], 'query still returns the exact candidates');
  assert.ok(ms < 500, `query over a sparse-wide envelope returns promptly (took ${ms}ms)`);

  // Exactness is preserved for partial boxes too: hitting only the far cluster returns just 'b'.
  const far = idx.query({ left: 4_999_995, top: 4_999_995, right: 5_000_015, bottom: 5_000_015 })
    .map((it) => it.key).sort();
  assert.deepEqual(far, ['b'], 'a box over only the far cluster returns only its item');
  // And a box that misses every populated cell returns nothing (empty-envelope branch).
  const none = idx.query({ left: 2_000_000, top: 2_000_000, right: 2_000_100, bottom: 2_000_100 });
  assert.deepEqual(none, [], 'a box over only empty space returns nothing');
});

test('regression: vanished keys are not resurrected by marquee cancel or shift+ctrl range', () => {
  const sel = createSelection();
  sel.setItems([
    { key: 'a', x: 0, y: 0, w: 10, h: 10 },
    { key: 'b', x: 20, y: 0, w: 10, h: 10 },
    { key: 'c', x: 40, y: 0, w: 10, h: 10 },
  ]);
  sel.selectAt('a', {});             // selected {a}
  sel.selectAt('c', { ctrl: true }); // toggle adds c; anchor 'c', rangeBase {a, c}
  sel.setItems([                     // 'a' vanishes; anchor 'c' survives
    { key: 'b', x: 20, y: 0, w: 10, h: 10 },
    { key: 'c', x: 40, y: 0, w: 10, h: 10 },
  ]);
  sel.selectAt('b', { shift: true, ctrl: true }); // unions stale rangeBase {a, c}
  assert.deepEqual(sel.getSelectedKeys().sort(), ['b', 'c'], 'ghost key "a" must not reappear');
});

test('regression: non-finite marquee coordinates are ignored', () => {
  const sel = createSelection();
  sel.setItems([{ key: 'a', x: 0, y: 0, w: 10, h: 10 }]);
  sel.startMarquee(NaN, 0); // ignored — no marquee
  assert.equal(sel.getState().marquee.active, false, 'NaN start ignored');
  sel.startMarquee(0, 0);
  sel.updateMarquee(NaN, Infinity); // ignored — box keeps its last finite point
  sel.updateMarquee(15, 15);
  sel.endMarquee();
  assert.deepEqual(sel.getSelectedKeys(), ['a']);
});

// ----------------------------------------------------------------------------
if (isMain(import.meta.url)) report({ exit: true });
