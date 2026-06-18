// virtualization-engine.test.mjs
// Pure unit tests for the layout strategies. No DOM, no browser, no framework.
//   node virtualization-engine.test.mjs
//
// Importing virtualization-engine.js here doubles as a headless-core design check: if the
// module touched document/window/ResizeObserver at top level, this import would
// throw in Node. It does not — DOM access lives inside VirtualizationEngine's methods.

import assert from 'node:assert/strict';
import {
  VirtualizationEngine,
  gridLayout,
  listLayout,
} from './virtualization-engine.js';

// ---- tiny zero-dependency harness ----
let passed = 0, failed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`ok   - ${name}`); }
  catch (e) { failed++; console.error(`FAIL - ${name}\n       ${e.message.split('\n').join('\n       ')}`); }
}
// widths of the cells in row 0 (one per column), derived from getRect
const rowWidths = (L, columns) => Array.from({ length: columns }, (_, c) => L.getRect(c).width);

// ============================================================================
// gridLayout — invariants
// ============================================================================

test('flush/seam invariant: sum(colWidth) + (columns-1)*gap === W (awkward inputs)', () => {
  const cases = [
    { W: 1000, gap: 10, minItemWidth: 140 },
    { W: 777,  gap: 7,  minItemWidth: 123 },
    { W: 1280, gap: 12, minItemWidth: 200 },
    { W: 1366, gap: 16, minItemWidth: 250 },
    { W: 333,  gap: 5,  minItemWidth: 100 },
  ];
  for (const { W, gap, minItemWidth } of cases) {
    const L = gridLayout({ minItemWidth, aspectRatio: 1, gap });
    L.measure(W, 10000);
    const { columns } = L.getInfo();
    const widths = rowWidths(L, columns);
    const sum = widths.reduce((a, b) => a + b, 0);
    assert.equal(sum + (columns - 1) * gap, W,
      `W=${W} gap=${gap} minW=${minItemWidth}: sum=${sum} cols=${columns} widths=${widths}`);
  }
});

test('integer widths: every cell width in a row is an integer', () => {
  const cases = [
    { W: 1000, gap: 10, minItemWidth: 140 },
    { W: 777,  gap: 7,  minItemWidth: 123 },
    { W: 1281, gap: 13, minItemWidth: 199 },
  ];
  for (const { W, gap, minItemWidth } of cases) {
    const L = gridLayout({ minItemWidth, aspectRatio: 1, gap });
    L.measure(W, 5000);
    const { columns } = L.getInfo();
    for (const w of rowWidths(L, columns)) assert.ok(Number.isInteger(w), `width ${w} not integer (W=${W})`);
  }
});

test('widths differ by at most 1px within a row', () => {
  const cases = [
    { W: 1000, gap: 10, minItemWidth: 140 },
    { W: 777,  gap: 7,  minItemWidth: 123 },
    { W: 1280, gap: 12, minItemWidth: 200 },
    { W: 1001, gap: 9,  minItemWidth: 137 },
  ];
  for (const { W, gap, minItemWidth } of cases) {
    const L = gridLayout({ minItemWidth, aspectRatio: 1, gap });
    L.measure(W, 5000);
    const { columns } = L.getInfo();
    const widths = rowWidths(L, columns);
    assert.ok(Math.max(...widths) - Math.min(...widths) <= 1,
      `W=${W}: spread ${Math.max(...widths) - Math.min(...widths)} widths=${widths}`);
  }
});

test('continuous stretch: same column count, different W -> different cell width', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(900, 10000); const a = L.getInfo();
  L.measure(950, 10000); const b = L.getInfo();
  assert.equal(a.columns, b.columns, 'expected same column count in-band');
  assert.notEqual(a.itemWidth, b.itemWidth, 'itemWidth must stretch with W (not fixed/stepped)');
  assert.ok(b.itemWidth > a.itemWidth, 'wider container -> wider cells');
});

test('breakpoint behavior: +(minItemWidth+gap) adds exactly one column; constant within a band', () => {
  const minItemWidth = 160, gap = 8, step = minItemWidth + gap; // 168
  const L = gridLayout({ minItemWidth, aspectRatio: 1, gap });
  const colsAt = (W) => { L.measure(W, 10000); return L.getInfo().columns; };

  // (a) Adding a full step adds exactly one column, for any W (always holds).
  for (const W of [500, 700, 1000, 1500]) {
    assert.equal(colsAt(W + step), colsAt(W) + 1, `+${step}px at W=${W} should add exactly 1 column`);
  }
  // (b) Starting AT a breakpoint, columns is constant across the whole band
  //     [Wb, Wb+step) and steps up only at Wb+step — i.e. not before a whole
  //     new column fits.
  for (const Wb of [664, 832, 1000]) {
    const base = colsAt(Wb);
    assert.equal(colsAt(Wb + step - 1), base, `columns must stay ${base} across the band W=${Wb}..${Wb + step - 1}`);
    assert.equal(colsAt(Wb + step), base + 1, `column added exactly at W=${Wb + step}, not before`);
  }
});

// ============================================================================
// gridLayout — exact scalar checks (W=1000, gap=8, minItemWidth=160, ar=1)
// ============================================================================

test('exact scalars: clean config produces the documented numbers', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(1000, 10000);
  const info = L.getInfo();
  assert.equal(info.columns, 6, 'columns');
  assert.equal(info.itemWidth, 160, 'itemWidth float');
  assert.equal(info.itemHeight, 160, 'itemHeight');
  assert.equal(info.rowCount, 1667, 'rowCount = ceil(10000/6)');
  assert.equal(L.getTotalSize(), 280048, 'totalSize = 1667*168 - 8');

  assert.deepEqual(L.getRect(0), { x: 0, y: 0, width: 160, height: 160 }, 'getRect(0)');
  const r6 = L.getRect(6); // first cell of row 1
  assert.equal(r6.x, 0, 'getRect(6).x');
  assert.equal(r6.y, 168, 'getRect(6).y = rowHeight');

  // getRect(9999): index 9999 = row 1666, col 3 (9999 = 1666*6 + 3)
  assert.deepEqual(L.getRect(9999), { x: 504, y: 279888, width: 160, height: 160 }, 'getRect(9999) final row/col');
});

// ============================================================================
// gridLayout — range checks
// ============================================================================

test('getRange(0, 600, 0): exactly the rows visible at the top', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(1000, 10000); // 6 cols, rowHeight 168
  // viewport 600px -> rows 0..3 (tops 0,168,336,504; row 4 at 672 > 600) -> 4 rows * 6 = 24
  assert.deepEqual(L.getRange(0, 600, 0), [0, 24]);
});

test('getRange overscan 2 extends 2 rows each side, clamped at 0', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(1000, 10000);
  // start clamps to 0 (can't go below); end grows by 2 rows: (3+2+1)*6 = 36
  assert.deepEqual(L.getRange(0, 600, 2), [0, 36]);
});

test('getRange near the bottom clamps end to count (no out-of-range indices)', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(1000, 10000); // total 280048
  const scrollTop = 280048 - 600;
  const [start, end] = L.getRange(scrollTop, 600, 2);
  assert.equal(end, 10000, 'end clamped to count, not (lastRow+overscan+1)*cols');
  assert.ok(start >= 0 && start < end, 'start in range');
  assert.ok(end <= 10000, 'no index beyond count');
});

// ============================================================================
// Locked values the in-browser run already found (regression guards)
// ============================================================================

test('locked breakpoints at minItemWidth=160, gap=8: steps at W = 664, 832, 1000, 1168', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  const colsAt = (W) => { L.measure(W, 10000); return L.getInfo().columns; };
  const steps = [[664, 3, 4], [832, 4, 5], [1000, 5, 6], [1168, 6, 7]];
  for (const [W, below, atOrAbove] of steps) {
    assert.equal(colsAt(W - 1), below, `just below ${W} should be ${below} columns`);
    assert.equal(colsAt(W), atOrAbove, `at ${W} should be ${atOrAbove} columns`);
  }
});

test('continuity within a 5-column band: W=900 vs 901 differ by exactly 1/columns before rounding', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(900, 10000); const a = L.getInfo();
  L.measure(901, 10000); const b = L.getInfo();
  assert.equal(a.columns, 5, 'W=900 -> 5 columns');
  assert.equal(b.columns, 5, 'W=901 -> 5 columns');
  assert.ok(Math.abs((b.itemWidth - a.itemWidth) - 1 / 5) < 1e-9,
    `expected +${1 / 5}px per +1px container; got ${b.itemWidth - a.itemWidth}`);
});

test('cells never below minItemWidth across a width sweep', () => {
  const minItemWidth = 160, gap = 8;
  const L = gridLayout({ minItemWidth, aspectRatio: 1, gap });
  for (let W = 200; W <= 2000; W++) {
    L.measure(W, 1000);
    const { columns } = L.getInfo();
    for (let c = 0; c < columns; c++) {
      const w = L.getRect(c).width;
      assert.ok(w >= minItemWidth, `W=${W} col=${c}: width ${w} < minItemWidth ${minItemWidth}`);
    }
  }
});

// ============================================================================
// gridLayout — guards
// ============================================================================

test('guard: measure(W, 0) -> totalSize 0, empty range, no throw', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(1000, 0);
  assert.equal(L.getTotalSize(), 0, 'totalSize 0 for empty grid');
  assert.deepEqual(L.getRange(0, 600, 2), [0, 0], 'empty range');
});

test('guard: measure(100, count) with minItemWidth 160 -> columns clamps to 1', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  L.measure(100, 500);
  const info = L.getInfo();
  assert.equal(info.columns, 1, 'columns clamped to 1');
  assert.equal(L.getRect(0).x, 0, 'single column at x=0');
  assert.equal(L.getRect(0).width, 100, 'single full-width column');
  assert.ok(!Number.isNaN(info.itemWidth) && !Number.isNaN(info.itemHeight), 'no NaN');
});

test('aspectRatio drives height; rows do not overlap (wide ar=4 and tall ar=0.25)', () => {
  for (const ar of [4, 0.25]) {
    const L = gridLayout({ minItemWidth: 180, aspectRatio: ar, gap: 8 });
    L.measure(800, 1000);
    const info = L.getInfo();
    assert.equal(info.itemHeight, Math.round(info.itemWidth / ar), `itemHeight = round(itemWidth/${ar})`);
    const r0 = L.getRect(0);
    const r1 = L.getRect(info.columns); // first cell of next row
    assert.ok(r1.y >= r0.y + r0.height, `rows overlap at ar=${ar}: row0 bottom ${r0.y + r0.height} > row1 top ${r1.y}`);
    assert.equal(r1.y - (r0.y + r0.height), 8, 'inter-row gap equals gap');
  }
});

// ============================================================================
// listLayout
// ============================================================================

test('listLayout: full-width fixed-height rows stacked with gap', () => {
  const L = listLayout({ itemHeight: 72, gap: 8 });
  L.measure(500, 1000); // rowHeight 80
  assert.deepEqual(L.getRect(0), { x: 0, y: 0, width: 500, height: 72 }, 'getRect(0)');
  assert.deepEqual(L.getRect(5), { x: 0, y: 400, width: 500, height: 72 }, 'getRect(5): y = 5*(72+8)');
  assert.equal(L.getRect(123).y, 123 * 80, 'getRect(n).y = n*(itemHeight+gap)');
  assert.equal(L.getRect(123).x, 0, 'x always 0');
  assert.equal(L.getRect(123).width, 500, 'width = containerWidth');
});

test('listLayout: getInfo and getTotalSize', () => {
  const L = listLayout({ itemHeight: 72, gap: 8 });
  L.measure(500, 1000);
  const info = L.getInfo();
  assert.equal(info.columns, 1, 'columns === 1');
  assert.equal(info.rowCount, 1000, 'rowCount === count');
  assert.equal(info.itemHeight, 72, 'itemHeight');
  assert.equal(L.getTotalSize(), 1000 * 80 - 8, 'stacked height = count*(ih+gap) - gap');
});

test('listLayout: range math (columns = 1) and bottom clamp', () => {
  const L = listLayout({ itemHeight: 72, gap: 8 });
  L.measure(500, 1000); // rowHeight 80
  // 300px viewport at top: rows 0..3 (tops 0,80,160,240; row4 at 320>300) -> [0,4)
  assert.deepEqual(L.getRange(0, 300, 0), [0, 4]);
  // overscan clamps at 0
  assert.deepEqual(L.getRange(0, 300, 2), [0, 6]);
  // bottom clamps end to count
  const [s, e] = L.getRange(1000 * 80 - 300, 300, 2);
  assert.equal(e, 1000, 'end clamped to count');
  assert.ok(s >= 0 && s < e);
});

test('listLayout: guard measure(W, 0) -> totalSize 0, empty range', () => {
  const L = listLayout({ itemHeight: 72, gap: 8 });
  L.measure(500, 0);
  assert.equal(L.getTotalSize(), 0);
  assert.deepEqual(L.getRange(0, 300, 2), [0, 0]);
});

// ============================================================================
// Layout config finite-guards (regression): a non-finite numeric option must
// not poison totalSize / getRange loop bounds / getRect.
// ============================================================================

test('gridLayout: NaN gap does not poison totalSize/getRange/getRect (finite-guard, regression)', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: NaN });
  L.measure(1000, 10000);
  assert.ok(Number.isFinite(L.getTotalSize()), `totalSize must be finite; got ${L.getTotalSize()}`);
  assert.ok(L.getTotalSize() > 0, 'totalSize positive for non-empty grid');
  const [start, end] = L.getRange(0, 600, 2);
  assert.ok(Number.isFinite(start) && Number.isFinite(end), `range must be finite; got [${start},${end}]`);
  assert.ok(end > start, 'a non-empty window is rendered');
  const r = L.getRect(0);
  assert.ok(Number.isFinite(r.x) && Number.isFinite(r.y) && Number.isFinite(r.width) && Number.isFinite(r.height),
    `getRect must be all-finite; got ${JSON.stringify(r)}`);
});

test('gridLayout: NaN minItemWidth falls back to a finite layout (finite-guard, regression)', () => {
  const L = gridLayout({ minItemWidth: NaN, aspectRatio: 1, gap: 8 });
  L.measure(1000, 10000);
  const info = L.getInfo();
  assert.ok(Number.isFinite(info.columns) && info.columns >= 1, `columns must be a finite >=1; got ${info.columns}`);
  assert.ok(Number.isFinite(L.getTotalSize()) && L.getTotalSize() > 0, 'totalSize finite & positive');
  const [start, end] = L.getRange(0, 600, 2);
  assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start, `range finite/non-empty; got [${start},${end}]`);
});

test('listLayout: NaN itemHeight/gap stay finite (finite-guard, regression)', () => {
  for (const opts of [{ itemHeight: NaN, gap: 8 }, { itemHeight: 72, gap: NaN }]) {
    const L = listLayout(opts);
    L.measure(500, 1000);
    assert.ok(Number.isFinite(L.getTotalSize()) && L.getTotalSize() > 0,
      `totalSize finite & positive for ${JSON.stringify(opts)}; got ${L.getTotalSize()}`);
    const [start, end] = L.getRange(0, 300, 2);
    assert.ok(Number.isFinite(start) && Number.isFinite(end) && end > start,
      `range finite/non-empty for ${JSON.stringify(opts)}; got [${start},${end}]`);
    const r = L.getRect(3);
    assert.ok(Number.isFinite(r.y) && Number.isFinite(r.height), `getRect finite for ${JSON.stringify(opts)}`);
  }
});

test('layout lengths resolve px, rem, and standard Tailwind gap classes consistently', () => {
  const layouts = [
    gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 }),
    gridLayout({ minItemWidth: '160px', aspectRatio: 1, gap: '8px' }),
    gridLayout({ minItemWidth: '10rem', aspectRatio: 1, gap: '0.5rem' }),
    gridLayout({ minItemWidth: '10rem', aspectRatio: 1, gap: 'gap-2' }),
  ];
  for (const layout of layouts) layout.measure(1000, 10000);
  const expected = layouts[0].getInfo();
  for (const layout of layouts.slice(1)) {
    assert.deepEqual(layout.getInfo(), expected);
    assert.equal(layout.getTotalSize(), layouts[0].getTotalSize());
  }

  const list = listLayout({ itemHeight: '4.5rem', gap: 'gap-px' });
  list.measure(500, 10);
  assert.equal(list.getInfo().itemHeight, 72);
  assert.equal(list.getRect(1).y, 73);
});

test('unsupported layout length strings fail loudly', () => {
  assert.throws(() => gridLayout({ minItemWidth: 'wide', aspectRatio: 1, gap: 8 }), TypeError);
  assert.throws(() => gridLayout({ minItemWidth: '10rem', aspectRatio: 1, gap: 'gap-custom' }), TypeError);
});

// ============================================================================
// VirtualizationEngine — finite guards & teardown idempotency (regression)
// ============================================================================

// Minimal headless scroll-container stub. The engine only reads clientWidth /
// clientHeight / scrollTop and (de)registers a 'scroll' listener; ResizeObserver
// and requestAnimationFrame are capability-guarded / never invoked here, so a
// plain object is enough for synchronous assertions.
function makeScrollEl({ clientWidth = 1000, clientHeight = 600 } = {}) {
  return {
    clientWidth,
    clientHeight,
    scrollTop: 0,
    addEventListener() {},
    removeEventListener() {},
  };
}

test('onChange receives the complete initial state synchronously', () => {
  let state;
  const engine = new VirtualizationEngine({
    scrollElement: makeScrollEl(),
    count: 10000,
    layout: () => gridLayout({ minItemWidth: '10rem', aspectRatio: 1, gap: 'gap-2' }),
    onChange: (nextState) => { state = nextState; },
  });
  assert.ok(state, 'initial state delivered during construction');
  assert.equal(state.virtualItems, engine.getVirtualItems(), 'payload exposes the current virtual window');
  assert.equal(state.totalSize, engine.getTotalSize(), 'payload exposes total size');
  assert.deepEqual(state.stats, engine.getStats(), 'payload exposes complete stats');
  assert.equal(state.stats.layoutName, 'grid');
  assert.ok(Number.isFinite(state.stats.rowCount), 'strategy-specific info is included in stats');
  assert.equal(engine.getLayoutInfo, undefined, 'overlapping getLayoutInfo API is removed');
  engine.destroy();
});

test('overscan: Infinity does NOT render all items (finite-guard, regression)', () => {
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  const engine = new VirtualizationEngine({
    scrollElement: makeScrollEl(),
    count: 100000,
    layout,
    overscan: Infinity,
  });
  const visible = engine.getVirtualItems().length;
  // 6 cols, rowHeight 168, viewport 600 -> ~4 rows + (default 2) overscan each
  // side. Must be a small window, NOT the whole 100000-item collection.
  assert.ok(visible > 0, 'a window is rendered');
  assert.ok(visible < 1000, `overscan:Infinity must not materialize all items; rendered ${visible}`);
  engine.destroy();
});

test('overscan: NaN still renders a non-empty window (finite-guard, regression)', () => {
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  const engine = new VirtualizationEngine({
    scrollElement: makeScrollEl(),
    count: 100000,
    layout,
    overscan: NaN,
  });
  const visible = engine.getVirtualItems().length;
  // Before the fix, NaN poisoned start/end via Math.max/min -> empty loop -> 0.
  assert.ok(visible > 0, `overscan:NaN must fall back to default and render items; rendered ${visible}`);
  assert.ok(visible < 1000, 'still a bounded window');
  engine.destroy();
});

test('count: Infinity is rejected; getTotalSize/getStats stay finite (finite-guard, regression)', () => {
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  const engine = new VirtualizationEngine({
    scrollElement: makeScrollEl(),
    count: Infinity,
    layout,
  });
  assert.equal(engine.count, 0, 'Infinity count clamps to 0 (not passed through)');
  assert.equal(engine.getTotalSize(), 0, 'getTotalSize finite (0), not Infinity');
  assert.ok(Number.isFinite(engine.getStats().total), 'stats.total finite');
  // setCount(Infinity) must be guarded the same way.
  engine.setCount(Infinity);
  assert.equal(engine.count, 0, 'setCount(Infinity) clamps to 0');
  assert.ok(Number.isFinite(engine.getTotalSize()), 'getTotalSize finite after setCount(Infinity)');
  // A valid finite count still works (and is floored).
  engine.setCount(10000.7);
  assert.equal(engine.count, 10000, 'finite count floored');
  assert.ok(engine.getTotalSize() > 0, 'total positive for valid count');
  engine.destroy();
});

test('count: NaN/0/negative all clamp to 0 (constructor + setCount)', () => {
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  for (const bad of [NaN, 0, -5, -Infinity]) {
    const engine = new VirtualizationEngine({ scrollElement: makeScrollEl(), count: bad, layout });
    assert.equal(engine.count, 0, `count:${bad} -> 0`);
    engine.setCount(bad);
    assert.equal(engine.count, 0, `setCount(${bad}) -> 0`);
    engine.destroy();
  }
});

test('teardown: public API after destroy() does not fire onChange or write scrollTop (regression)', () => {
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  const el = makeScrollEl();
  let changes = 0;
  const engine = new VirtualizationEngine({
    scrollElement: el,
    count: 1000,
    layout,
    onChange: () => { changes++; },
  });
  engine.destroy();

  const changesAtDestroy = changes; // any sync fires from construction already counted
  el.scrollTop = 12345; // sentinel: must remain untouched by post-destroy calls

  engine.refresh();
  engine.setCount(50);
  engine.setLayout(gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 }));
  engine.scrollToIndex(10);

  assert.equal(changes, changesAtDestroy, 'onChange must not fire after destroy()');
  assert.equal(el.scrollTop, 12345, 'scrollTop must not be written after destroy()');
});

test('scrollToIndex: fractional index is floored -> top-aligned on the requested row (regression)', () => {
  // list rowHeight = 72+8 = 80. scrollToIndex(5.5) must land top-aligned on
  // row 5 (y = 5*80 = 400), NOT halfway between rows 5 and 6 (440). Before the
  // floor fix, the fractional index flowed straight into getRect and the
  // scrollTop write landed mid-row.
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  const el = makeScrollEl({ clientWidth: 500, clientHeight: 300 });
  const engine = new VirtualizationEngine({ scrollElement: el, count: 1000, layout });
  engine.scrollToIndex(5.5);
  assert.equal(el.scrollTop, 400, `scrollToIndex(5.5) must top-align row 5 (400), got ${el.scrollTop}`);
  engine.scrollToIndex(5); // integer behaves identically
  assert.equal(el.scrollTop, 400, 'scrollToIndex(5) top-aligns the same row');
  engine.destroy();
});

test('scrollToIndex: fractional grid index does not cross a row boundary (regression)', () => {
  // 6-column grid, rowHeight 168. Index 5.9 must floor to 5 (row 0), NOT scroll
  // to row 1 as the un-floored column-vs-row disagreement would. Index 6.9 must
  // floor to 6 (row 1, y = 168).
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  const el = makeScrollEl({ clientWidth: 1000, clientHeight: 600 });
  const engine = new VirtualizationEngine({ scrollElement: el, count: 10000, layout });
  engine.scrollToIndex(5.9);
  assert.equal(el.scrollTop, 0, `scrollToIndex(5.9) floors to index 5 (row 0, y=0), got ${el.scrollTop}`);
  engine.scrollToIndex(6.9);
  assert.equal(el.scrollTop, 168, `scrollToIndex(6.9) floors to index 6 (row 1, y=168), got ${el.scrollTop}`);
  // The rect for the floored index must be all-finite (no undefined column lookups).
  const r = layout.getRect(Math.floor(6.9));
  assert.ok(Number.isFinite(r.x) && Number.isFinite(r.width), `getRect(6) all-finite; got ${JSON.stringify(r)}`);
  engine.destroy();
});

test('teardown: destroy() is idempotent (safe to call twice)', () => {
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  const engine = new VirtualizationEngine({ scrollElement: makeScrollEl(), count: 100, layout });
  engine.destroy();
  assert.doesNotThrow(() => engine.destroy(), 'second destroy() must not throw');
});

test('teardown: destroy() inside onChange suppresses the deferred anchored scrollTop write (regression)', () => {
  // The anchored deferred write at the end of _update runs AFTER onChange. If a
  // consumer tears down from inside onChange (a common "tear down when the
  // visible set reaches some state" pattern), the write must be suppressed —
  // otherwise scrollTop is written on a just-freed instance whose listener and
  // observer are already gone.
  //
  // Setup: construct scrolled to anchor index 100 (rowHeight 80 -> scrollTop
  // 8000), then setLayout to a taller row (rowHeight 168) so the anchored
  // relayout re-pins index 100 to y = 100*168 = 16800. targetScrollTop (16800)
  // != scrollTop (8000), which arms the deferred write at the END of _update —
  // the exact window this finding is about (the write runs AFTER onChange with
  // no re-check of _destroyed).
  const el = makeScrollEl({ clientWidth: 500, clientHeight: 300 });
  el.scrollTop = 8000; // anchor index 100 in the rowHeight-80 layout

  let tearDownNextRelayout = false;
  let engineRef = null;
  const engine = new VirtualizationEngine({
    scrollElement: el,
    count: 100000,
    layout: listLayout({ itemHeight: 72, gap: 8 }), // rowHeight 80
    onChange: () => {
      // Tear down from inside onChange, before the deferred anchored write would
      // otherwise run — but only on the explicit relayout we arm below.
      if (tearDownNextRelayout && engineRef && !engineRef._destroyed) engineRef.destroy();
    },
  });
  engineRef = engine;

  const scrollTopBeforeRelayout = el.scrollTop; // 8000
  tearDownNextRelayout = true;

  // Anchored relayout (taller rows) that moves the anchor: index 100 -> 16800,
  // arming the deferred write. onChange destroys the engine first; the
  // post-onChange re-check must suppress the write on the freed instance.
  engine.setLayout(listLayout({ itemHeight: 160, gap: 8 })); // rowHeight 168

  assert.equal(engine._destroyed, true, 'onChange tore the engine down during the anchored relayout');
  // The deferred write must NOT have fired on the freed instance: scrollTop is
  // unchanged from what _update read when it entered the torn-down dispatch.
  assert.equal(el.scrollTop, scrollTopBeforeRelayout,
    `deferred scrollTop write must be suppressed after destroy()-in-onChange; ` +
    `expected ${scrollTopBeforeRelayout} (unchanged), got ${el.scrollTop} (write leaked onto freed instance)`);
});

test('layout objects expose name ONLY via getInfo(), not as a dead root-level field (regression)', () => {
  // The root-level `name` on each layout object was dead state duplicating
  // getInfo().name; the engine/demo/tests only ever read getInfo().name. Lock in
  // its removal so the two-fields-for-one-value drift cannot reappear.
  const cases = [
    [gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 }), 'grid'],
    [listLayout({ itemHeight: 72, gap: 8 }), 'list'],
  ];
  for (const [L, expected] of cases) {
    assert.equal(L.name, undefined, `layout must not carry a root-level name (${expected})`);
    assert.ok(!Object.prototype.hasOwnProperty.call(L, 'name'),
      `layout must not declare an own 'name' property (${expected})`);
    L.measure(1000, 1000);
    assert.equal(L.getInfo().name, expected, `getInfo().name is the one live copy (${expected})`);
  }
});

// ============================================================================
// VirtualizationEngine — non-finite DOM geometry intake guards (regression)
// _update reads element.clientWidth/scrollTop/clientHeight. A non-finite DOM
// value must never reach measure()/new Array(columns)/getRange or be persisted
// into layout geometry / _scrollTop (surfaced by getStats).
// ============================================================================

test('DOM geometry: Infinity clientWidth does NOT crash the constructor and keeps stats finite (regression)', () => {
  // Before the intake guard, Infinity clientWidth -> columns = Infinity ->
  // new Array(columns + 1) = new Array(Infinity) throws RangeError 'Invalid
  // array length' inside measure(), crashing the constructor's first _update.
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  let engine;
  assert.doesNotThrow(() => {
    engine = new VirtualizationEngine({
      scrollElement: makeScrollEl({ clientWidth: Infinity, clientHeight: 600 }),
      count: 10000,
      layout,
    });
  }, 'Infinity clientWidth must not throw RangeError from new Array(Infinity)');
  const stats = engine.getStats();
  assert.ok(Number.isFinite(stats.columns), `columns must be finite; got ${stats.columns}`);
  assert.ok(Number.isFinite(stats.itemWidth), `itemWidth must be finite; got ${stats.itemWidth}`);
  assert.ok(Number.isFinite(engine.getTotalSize()), `getTotalSize must be finite; got ${engine.getTotalSize()}`);
  engine.destroy();
});

test('DOM geometry: Infinity clientWidth crashes neither measure when count is 0 (regression)', () => {
  // measure() runs even at count 0, so the new Array(Infinity) crash is
  // count-independent. Guard must hold with an empty collection too.
  const layout = gridLayout({ minItemWidth: 160, aspectRatio: 1, gap: 8 });
  let engine;
  assert.doesNotThrow(() => {
    engine = new VirtualizationEngine({
      scrollElement: makeScrollEl({ clientWidth: Infinity, clientHeight: 600 }),
      count: 0,
      layout,
    });
  }, 'Infinity clientWidth with count 0 must not throw');
  assert.equal(engine.getTotalSize(), 0, 'empty grid total stays 0');
  engine.destroy();
});

test('DOM geometry: NaN clientWidth is sanitized in list layout stats (regression)', () => {
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  const engine = new VirtualizationEngine({
    scrollElement: makeScrollEl({ clientWidth: NaN, clientHeight: 600 }),
    count: 1000,
    layout,
  });
  const stats = engine.getStats();
  assert.ok(Number.isFinite(stats.itemWidth), `getStats().itemWidth must be finite; got ${stats.itemWidth}`);
  assert.equal(stats.itemWidth, 0, 'NaN clientWidth sanitized before layout measurement');
  engine.destroy();
});

test('DOM geometry: NaN scrollTop / NaN clientHeight do not poison the window or getStats().scrollTop (regression)', () => {
  const layout = listLayout({ itemHeight: 72, gap: 8 });
  const el = makeScrollEl({ clientWidth: 500, clientHeight: NaN });
  el.scrollTop = NaN; // both viewportHeight and scrollTop non-finite
  const engine = new VirtualizationEngine({ scrollElement: el, count: 1000, layout });
  const stats = engine.getStats();
  assert.ok(Number.isFinite(stats.scrollTop), `getStats().scrollTop must be finite; got ${stats.scrollTop}`);
  assert.equal(stats.scrollTop, 0, 'NaN scrollTop sanitized to 0 in persisted _scrollTop');
  // The visible window must be all-finite indices (no NaN start/end from getRange).
  for (const it of engine.getVirtualItems()) {
    assert.ok(Number.isInteger(it.index) && it.index >= 0, `window index must be a non-negative integer; got ${it.index}`);
    assert.ok(Number.isFinite(it.y) && Number.isFinite(it.height), `item geometry must be finite; got ${JSON.stringify(it)}`);
  }
  engine.destroy();
});

test('scrollToIndex: non-finite clientHeight never writes NaN into scrollTop (regression)', () => {
  // scrollToIndex computes maxScroll = max(0, getTotalSize() - clientHeight) and
  // writes max(0, min(rect.y, maxScroll)). A non-finite clientHeight (detached /
  // zero-layout element, or a host stub) makes that subtraction NaN, and
  // Math.max/min do NOT reject NaN — so without the finite-guard the engine wrote
  // NaN to scrollTop, violating the method's "never write NaN into scrollTop"
  // contract and disagreeing with _update, which sanitizes the same DOM read.
  const layout = listLayout({ itemHeight: 72, gap: 8 }); // rowHeight 80
  for (const badH of [NaN, Infinity, -Infinity]) {
    const el = makeScrollEl({ clientWidth: 500, clientHeight: badH });
    const engine = new VirtualizationEngine({ scrollElement: el, count: 1000, layout });
    engine.scrollToIndex(5);
    assert.ok(Number.isFinite(el.scrollTop),
      `scrollToIndex with clientHeight=${badH} must keep scrollTop finite; got ${el.scrollTop}`);
    // With clientHeight sanitized to 0, maxScroll = getTotalSize() (huge), so the
    // write is rect.y for row 5 = 5*80 = 400 (top-aligned), exactly as a finite
    // viewport would give for an in-range target.
    assert.equal(el.scrollTop, 400,
      `scrollToIndex(5) must top-align row 5 (400) even with non-finite clientHeight; got ${el.scrollTop}`);
    engine.destroy();
  }
});

test('re-entrancy: a mutating call inside onChange suppresses the outer deferred scrollTop write (regression)', () => {
  // _update fires onChange BEFORE its deferred anchored scrollTop write. If a
  // consumer calls a mutating method (here setCount) synchronously inside
  // onChange, a nested _update runs to completion — re-measuring, rebuilding the
  // window and _scrollTop, and writing scrollTop for the NEW (much smaller)
  // content. When the nested call returns, the OUTER _update must NOT overwrite
  // element.scrollTop with its now-stale targetScrollTop: doing so parks the
  // element past the end of the shrunken content and desyncs _scrollTop from the
  // element. The update-sequence token detects the supersession and skips the
  // stale write (mirroring the _destroyed re-check for destroy()-in-onChange).
  const layout = listLayout({ itemHeight: 72, gap: 8 }); // rowHeight 80
  const el = makeScrollEl({ clientWidth: 500, clientHeight: 300 });
  let engineRef = null;
  let armed = false;
  const engine = new VirtualizationEngine({
    scrollElement: el,
    count: 100000,
    layout,
    onChange: () => { if (armed) { armed = false; engineRef.setCount(50); } },
  });
  engineRef = engine;

  // Arm an anchored relayout whose OUTER target (anchor index 100 -> y=8000)
  // differs from the current element scrollTop (5000), so the outer deferred
  // write is armed. onChange shrinks the count to 50 (total height 3992) and the
  // nested _update parks the element within the new content.
  el.scrollTop = 5000;
  engine._firstVisibleIndex = 100;
  engine._measured = true;
  armed = true;
  engine.refresh();

  const total = engine.getTotalSize();
  assert.equal(engine.count, 50, 're-entrant setCount applied');
  assert.ok(el.scrollTop <= total,
    `element.scrollTop (${el.scrollTop}) must stay within the shrunken content (${total}); ` +
    `the stale outer write parked it past the end`);
  assert.equal(el.scrollTop, engine._scrollTop,
    `element.scrollTop (${el.scrollTop}) must agree with engine._scrollTop (${engine._scrollTop}); ` +
    `the stale outer write desynced them`);
  engine.destroy();
});

// ============================================================================
// non-finite aspectRatio must not poison geometry (overflow / Infinity guard)
// ============================================================================

// A finite-but-tiny positive aspectRatio passes a bare `> 0` guard, yet
// itemWidth/ratio overflows past Number.MAX_VALUE to Infinity. That Infinity
// would propagate into itemHeight -> rowHeight -> totalSize (the consumer's
// spacer/scroll bound) and every getRect.y/height, and getRange's `rowHeight
// <= 0` guard does NOT catch Infinity. itemHeight must stay finite.
test('grid: tiny aspectRatio cannot overflow itemHeight/totalSize to Infinity', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: 1e-310, gap: 8 });
  L.measure(500, 20);
  const info = L.getInfo();
  assert.ok(Number.isFinite(info.itemHeight), `itemHeight must be finite, got ${info.itemHeight}`);
  assert.ok(Number.isFinite(L.getTotalSize()), `totalSize must be finite, got ${L.getTotalSize()}`);
  const r = L.getRect(6);
  assert.ok(Number.isFinite(r.y) && Number.isFinite(r.height),
    `getRect must be finite, got y=${r.y} height=${r.height}`);
});

// aspectRatio = Infinity passes a bare `> 0` guard and yields itemHeight =
// round(iw/Infinity) = 0 (silently zero-height rows). It must be rejected and
// fall back to ratio = 1 like NaN/<=0 do.
test('grid: Infinity aspectRatio is rejected (falls back to ratio 1, not zero-height)', () => {
  const L = gridLayout({ minItemWidth: 160, aspectRatio: Infinity, gap: 8 });
  L.measure(500, 20);
  const info = L.getInfo();
  assert.ok(Number.isFinite(info.itemHeight) && info.itemHeight > 0,
    `Infinity ratio must fall back to a positive finite itemHeight, got ${info.itemHeight}`);
});

// ---- summary ----
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} tests)`);
process.exit(failed ? 1 : 0);
