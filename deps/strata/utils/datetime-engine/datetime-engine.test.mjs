// datetime-engine.test.mjs
// Pure unit tests for the datetime engine. No DOM, no browser, no framework:
//   node datetime-engine/datetime-engine.test.mjs
//
// Importing datetime-engine.js here doubles as the headless-core design check:
// if the module touched document/window at top level (or anywhere), this import
// would throw in Node. It does not — it is pure state + arithmetic.
//
// Every "today"/relative behavior is made deterministic by INJECTING today:
// createDatePicker({ today: {year, month, day} }) (or a fake clock), so the
// suite is independent of the machine's wall clock AND its local timezone. The
// calendar arithmetic is pure integer math (no Date), and where we need an
// independent oracle for weekday / days-in-month we use Date's *UTC* getters —
// which do not depend on the local timezone — never the local ones.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, assert, isMain, report } from './harness.mjs';
import {
  createDatePicker, SelectionMode, TimeFormat, Weekday,
  isLeapYear, daysInMonth, weekdayOf, compareDates, isSameDay,
  formatISODate, parseISODate, addDays, fromDate, toDate,
} from './datetime-engine.js';

// ---- helpers --------------------------------------------------------------

// A picker with a fixed "today" so every today/relative assertion is exact.
const FIXED_TODAY = { year: 2025, month: 6, day: 15 }; // Sun, 15 Jun 2025
const mk = (opts = {}) => createDatePicker({ today: FIXED_TODAY, ...opts });

const cellOf = (state, y, m, d) => state.cells.find((c) => c.year === y && c.month === m && c.day === d);
const currentMonthCells = (state) => state.cells.filter((c) => c.isCurrentMonth);

// Independent, timezone-INDEPENDENT oracles (UTC getters ignore local TZ).
const utcWeekday = (y, m, d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const utcDaysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month

// ============================================================================
// Calendar arithmetic — the deterministic core, tested hardest.
// ============================================================================

test('isLeapYear: 4/100/400 century rules (1900 no, 2000 yes, 2024 yes, 2023 no)', () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2023), false);
  assert.equal(isLeapYear(2000), true);   // divisible by 400
  assert.equal(isLeapYear(1900), false);  // divisible by 100, not 400
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(1600), true);
});

test('daysInMonth: February leap vs non-leap', () => {
  assert.equal(daysInMonth(2024, 2), 29);
  assert.equal(daysInMonth(2023, 2), 28);
  assert.equal(daysInMonth(2000, 2), 29);
  assert.equal(daysInMonth(1900, 2), 28);
  assert.equal(daysInMonth(2025, 1), 31);
  assert.equal(daysInMonth(2025, 4), 30);
});

test('daysInMonth matches the UTC oracle for every month 1900–2100', () => {
  for (let y = 1900; y <= 2100; y++) {
    for (let m = 1; m <= 12; m++) {
      assert.equal(daysInMonth(y, m), utcDaysInMonth(y, m), `${y}-${m}`);
    }
  }
});

test('weekdayOf matches the UTC oracle across a wide sweep (no timezone leak)', () => {
  for (let y = 1899; y <= 2101; y++) {
    for (let m = 1; m <= 12; m++) {
      for (const d of [1, 13, 15, 28, daysInMonth(y, m)]) {
        assert.equal(weekdayOf({ year: y, month: m, day: d }), utcWeekday(y, m, d), `${y}-${m}-${d}`);
      }
    }
  }
});

test('addDays round-trips and crosses month/year boundaries', () => {
  assert.deepEqual(addDays({ year: 2024, month: 2, day: 28 }, 1), { year: 2024, month: 2, day: 29 }); // leap
  assert.deepEqual(addDays({ year: 2023, month: 2, day: 28 }, 1), { year: 2023, month: 3, day: 1 });  // non-leap
  assert.deepEqual(addDays({ year: 2023, month: 12, day: 31 }, 1), { year: 2024, month: 1, day: 1 }); // year boundary
  assert.deepEqual(addDays({ year: 2024, month: 1, day: 1 }, -1), { year: 2023, month: 12, day: 31 });
  // round-trip a span of days
  const start = { year: 2025, month: 6, day: 4 };
  assert.deepEqual(addDays(addDays(start, 400), -400), start);
});

test('compareDates / isSameDay order by calendar day (time ignored)', () => {
  assert.ok(compareDates({ year: 2025, month: 1, day: 1 }, { year: 2025, month: 1, day: 2 }) < 0);
  assert.ok(compareDates({ year: 2025, month: 2, day: 1 }, { year: 2025, month: 1, day: 31 }) > 0);
  assert.equal(compareDates({ year: 2025, month: 1, day: 1 }, { year: 2025, month: 1, day: 1 }), 0);
  assert.ok(isSameDay({ year: 2025, month: 6, day: 4, hour: 9 }, { year: 2025, month: 6, day: 4, hour: 17 }));
  assert.ok(!isSameDay({ year: 2025, month: 6, day: 4 }, { year: 2025, month: 6, day: 5 }));
});

// ============================================================================
// ISO helpers (the minimal, deliberately-not-a-real-parser convenience)
// ============================================================================

test('formatISODate pads to YYYY-MM-DD', () => {
  assert.equal(formatISODate({ year: 2025, month: 6, day: 4 }), '2025-06-04');
  assert.equal(formatISODate({ year: 7, month: 1, day: 9 }), '0007-01-09');
  assert.equal(formatISODate({ year: 2025, month: 12, day: 31 }), '2025-12-31');
});

test('parseISODate parses strict ISO, validates range, rejects junk', () => {
  assert.deepEqual(parseISODate('2025-06-04'), { year: 2025, month: 6, day: 4 });
  assert.deepEqual(parseISODate('2024-02-29'), { year: 2024, month: 2, day: 29 }); // valid leap day
  assert.equal(parseISODate('2023-02-29'), null); // not a leap year
  assert.equal(parseISODate('2025-13-01'), null); // month out of range
  assert.equal(parseISODate('2025-00-10'), null);
  assert.equal(parseISODate('2025-06-31'), null); // June has 30 days
  assert.equal(parseISODate('next friday'), null); // NOT a natural-language parser
  assert.equal(parseISODate('06/04/2025'), null);  // NOT locale-aware
  assert.equal(parseISODate(20250604), null);
});

test('parseISODate optionally reads a time component', () => {
  assert.deepEqual(parseISODate('2025-06-04T09:30'), { year: 2025, month: 6, day: 4, hour: 9, minute: 30, second: 0 });
  assert.deepEqual(parseISODate('2025-06-04T23:59:59'), { year: 2025, month: 6, day: 4, hour: 23, minute: 59, second: 59 });
  assert.equal(parseISODate('2025-06-04T24:00'), null); // hour out of range
});

test('fromDate/toDate interop round-trips through LOCAL components', () => {
  const v = fromDate(new Date(2025, 5, 4, 9, 30, 15)); // month 5 = June (Date is 0-indexed)
  assert.equal(v.year, 2025);
  assert.equal(v.month, 6); // engine is 1-indexed
  assert.equal(v.day, 4);
  assert.equal(v.hour, 9);
  const back = toDate(v);
  assert.equal(back.getFullYear(), 2025);
  assert.equal(back.getMonth(), 5);
  assert.equal(back.getDate(), 4);
});

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and constructs headless (no DOM)', () => {
  const p = createDatePicker(); // default real clock, no document/window present
  assert.equal(typeof p.selectDate, 'function');
  const s = p.getState();
  assert.ok(Array.isArray(s.cells) && Array.isArray(s.weeks), 'valid state synchronously');
  p.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./datetime-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const s of specifiers) {
    assert.ok(s.startsWith('../shared/'), `import "${s}" must come from ../shared/`);
  }
});

test('engine source touches no DOM globals (document/window/navigator)', () => {
  const src = readFileSync(fileURLToPath(new URL('./datetime-engine.js', import.meta.url)), 'utf8');
  assert.equal(/\bdocument\.|\bwindow\.|\bnavigator\./.test(src), false, 'no DOM member access');
});

test('getState() is valid synchronously right after creation', () => {
  const p = mk();
  const s = p.getState();
  assert.equal(s.mode, SelectionMode.SINGLE);
  assert.equal(s.cells.length % 7, 0, 'whole weeks');
  assert.equal(s.weekdays.length, 7);
  assert.equal(s.selected, null);
  assert.deepEqual(s.today, FIXED_TODAY);
});

test('subscribe() fires the deferred initial emit and unsubscribes cleanly', async () => {
  const p = mk();
  let calls = 0;
  let last = null;
  const off = p.subscribe((s) => { calls++; last = s; });
  await Promise.resolve(); // let the queued microtask run
  assert.equal(calls, 1, 'initial emit delivered to a sync subscriber');
  assert.ok(last && Array.isArray(last.cells));
  off();
  p.selectDate({ year: 2025, month: 6, day: 10 });
  assert.equal(calls, 1, 'no further calls after unsubscribe');
  p.destroy();
});

// ============================================================================
// Grid generation — exact structure for known months.
// ============================================================================

test('grid: leading/trailing adjacent-month days are correct (June 2025, Sun start)', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  const s = p.getState();
  const firstWeekday = utcWeekday(2025, 6, 1); // independent oracle
  const leading = (firstWeekday - 0 + 7) % 7;
  // The first `leading` cells are previous-month (May) days; cell[leading] is the 1st.
  for (let i = 0; i < leading; i++) assert.equal(s.cells[i].isCurrentMonth, false, `lead cell ${i}`);
  assert.equal(s.cells[leading].isCurrentMonth, true);
  assert.equal(s.cells[leading].day, 1);
  assert.equal(s.cells[leading].month, 6);
  // current-month cells == days in month, contiguous
  assert.equal(currentMonthCells(s).length, daysInMonth(2025, 6));
  // trailing cells are next-month (July) days
  const lastCurrentIdx = leading + daysInMonth(2025, 6) - 1;
  for (let i = lastCurrentIdx + 1; i < s.cells.length; i++) {
    assert.equal(s.cells[i].isCurrentMonth, false, `trail cell ${i}`);
    assert.equal(s.cells[i].month, 7);
  }
  // grid is whole weeks and the first cell sits in the weekStart column
  assert.equal(s.cells.length % 7, 0);
  assert.equal(s.cells[0].weekday, 0); // Sunday start
});

test('grid: every cell is consecutive by one day', () => {
  const p = mk({ initialView: { year: 2024, month: 1 } });
  const s = p.getState();
  for (let i = 1; i < s.cells.length; i++) {
    assert.deepEqual(s.cells[i].date, addDays(s.cells[i - 1].date, 1), `cell ${i} consecutive`);
  }
});

test('grid: February leap (2024) vs non-leap (2023) vs century (2000 leap, 1900 not)', () => {
  for (const [year, expect] of [[2024, 29], [2023, 28], [2000, 29], [1900, 28]]) {
    const p = createDatePicker({ today: FIXED_TODAY, initialView: { year, month: 2 } });
    const s = p.getState();
    assert.equal(currentMonthCells(s).length, expect, `Feb ${year} has ${expect} days`);
    // last current-month cell is the right last day
    const last = currentMonthCells(s).at(-1);
    assert.equal(last.day, expect);
  }
});

test('grid: year boundary — December 2023 trails into January 2024', () => {
  const p = mk({ initialView: { year: 2023, month: 12 } });
  const s = p.getState();
  const dec31 = cellOf(s, 2023, 12, 31);
  assert.ok(dec31 && dec31.isCurrentMonth);
  // any trailing cells belong to Jan 2024
  const trailing = s.cells.filter((c) => !c.isCurrentMonth && compareDates(c.date, { year: 2023, month: 12, day: 31 }) > 0);
  for (const c of trailing) { assert.equal(c.year, 2024); assert.equal(c.month, 1); }
});

test('grid: fixedWeeks forces a stable 6 rows / 42 cells', () => {
  const p = mk({ fixedWeeks: true, initialView: { year: 2026, month: 2 } }); // Feb 2026 fits in 5 normally
  const s = p.getState();
  assert.equal(s.weeks.length, 6);
  assert.equal(s.cells.length, 42);
});

test('grid sweep: leading count always equals the oracle weekday offset, current cells == daysInMonth', () => {
  for (let y = 2020; y <= 2030; y++) {
    for (let m = 1; m <= 12; m++) {
      const s = createDatePicker({ today: FIXED_TODAY, initialView: { year: y, month: m } }).getState();
      const leading = (utcWeekday(y, m, 1) - 0 + 7) % 7;
      assert.equal(s.cells.findIndex((c) => c.isCurrentMonth), leading, `${y}-${m} leading`);
      assert.equal(currentMonthCells(s).length, daysInMonth(y, m), `${y}-${m} count`);
    }
  }
});

// ============================================================================
// Week-start config
// ============================================================================

test('weekStart reorders the weekday headers (Sun-first vs Mon-first)', () => {
  const sun = mk({ weekStart: 0 }).getState();
  assert.deepEqual(sun.weekdays.map((w) => w.index), [0, 1, 2, 3, 4, 5, 6]);
  const mon = mk({ weekStart: 1 }).getState();
  assert.deepEqual(mon.weekdays.map((w) => w.index), [1, 2, 3, 4, 5, 6, 0]);
  // weekend flags follow the index, not the column
  assert.deepEqual(mon.weekdays.map((w) => w.isWeekend), [false, false, false, false, false, true, true]);
});

test('weekStart shifts the leading adjacent-month days', () => {
  const view = { year: 2025, month: 6 };
  const firstWeekday = utcWeekday(2025, 6, 1);
  for (const weekStart of [0, 1, 6]) {
    const s = createDatePicker({ today: FIXED_TODAY, weekStart, initialView: view }).getState();
    const expectedLeading = (firstWeekday - weekStart + 7) % 7;
    assert.equal(s.cells.findIndex((c) => c.isCurrentMonth), expectedLeading, `weekStart ${weekStart}`);
    assert.equal(s.cells[0].weekday, weekStart, 'first column is the week-start weekday');
  }
});

test('setWeekStart re-emits a reordered grid at runtime', () => {
  const p = mk({ weekStart: 0, initialView: { year: 2025, month: 6 } });
  const before = p.getState();
  p.setWeekStart(1);
  const after = p.getState();
  assert.notDeepEqual(before.weekdays.map((w) => w.index), after.weekdays.map((w) => w.index));
  assert.equal(after.cells[0].weekday, 1);
});

// ============================================================================
// today / selected / current-month tagging
// ============================================================================

test('isToday is tagged from the injected today, not the wall clock', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  const s = p.getState();
  const todayCells = s.cells.filter((c) => c.isToday);
  assert.equal(todayCells.length, 1);
  assert.deepEqual(todayCells[0].date, FIXED_TODAY);
});

test('today via injectable clock (now) instead of a literal today', () => {
  const p = createDatePicker({ clock: { now: () => new Date(2026, 0, 2) } }); // 2 Jan 2026 local
  const s = p.getState();
  assert.deepEqual(s.today, { year: 2026, month: 1, day: 2 });
});

test('clock returning an invalid Date (NaN) falls back instead of poisoning the grid', () => {
  // A bad/mock clock (new Date(NaN)) yields NaN year/month/day. Without a finite
  // guard those NaNs flow into `view`, making buildGrid's rows/total NaN and the
  // emitted grid permanently empty. Guard it: today/view must stay finite and the
  // grid must still be populated.
  const p = createDatePicker({ clock: { now: () => new Date(NaN) } });
  const s = p.getState();
  assert.equal(Number.isFinite(s.today.year), true);
  assert.equal(Number.isFinite(s.today.month), true);
  assert.equal(Number.isFinite(s.today.day), true);
  assert.deepEqual(s.today, { year: 1970, month: 1, day: 1 });
  assert.equal(Number.isFinite(s.view.year), true);
  assert.equal(Number.isFinite(s.view.month), true);
  assert.equal(s.cells.length > 0, true); // grid is not collapsed
});

test('regression: a midnight tick between the two clock reads cannot split isToday from state.today', () => {
  // buildState() must read the clock ONCE per emit. Previously buildGrid() read
  // getToday() for the cells' isToday flags and buildState() read getToday()
  // AGAIN for the emitted `today` field. A wall-clock rollover between those two
  // adjacent reads made the grid tag day N's cell while state.today reported
  // day N+1 — the highlighted cell no longer matched the reported today.
  // Simulate it: the clock advances by one day on each call so the grid read and
  // the today read within a single getState() observe different calendar days.
  let tick = 0;
  const p = createDatePicker({
    clock: { now: () => new Date(2026, 0, 1 + (tick++)) }, // 1 Jan 2026, +1 day per call
    initialView: { year: 2026, month: 1 },
  });
  const s = p.getState();
  // The cell flagged isToday must be exactly the one matching state.today.
  const todayCells = s.cells.filter((c) => c.isToday);
  assert.equal(todayCells.length, 1, 'exactly one cell is today');
  assert.deepEqual(todayCells[0].date, s.today,
    'the isToday cell must match the emitted state.today (single clock read per emit)');
  p.destroy();
});

test('isCurrentMonth distinguishes in-month days from adjacent bleed', () => {
  const s = mk({ initialView: { year: 2025, month: 6 } }).getState();
  assert.equal(cellOf(s, 2025, 6, 1).isCurrentMonth, true);
  const may = s.cells.find((c) => c.month === 5);
  if (may) assert.equal(may.isCurrentMonth, false);
});

// ============================================================================
// Single selection
// ============================================================================

test('single: selectDate sets the selection and tags the cell', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  const res = p.selectDate({ year: 2025, month: 6, day: 10 });
  assert.equal(res.accepted, true);
  const s = p.getState();
  assert.deepEqual(s.selected, { year: 2025, month: 6, day: 10, hour: 0, minute: 0, second: 0 });
  assert.equal(cellOf(s, 2025, 6, 10).isSelected, true);
  assert.equal(cellOf(s, 2025, 6, 11).isSelected, false);
});

test('single: selecting a disabled day is rejected, no state change', () => {
  let emits = 0;
  const p = mk({ initialView: { year: 2025, month: 6 }, disabledDates: [{ year: 2025, month: 6, day: 10 }] });
  p.subscribe(() => { emits++; });
  const res = p.selectDate({ year: 2025, month: 6, day: 10 });
  assert.equal(res.accepted, false);
  assert.equal(res.reason, 'disabled');
  assert.equal(p.getState().selected, null);
});

test('single: selecting an invalid value is rejected', () => {
  const p = mk();
  assert.equal(p.selectDate({ year: 2025, month: 13, day: 1 }).accepted, false);
  assert.equal(p.selectDate({ year: 2025, month: 2, day: 30 }).accepted, false);
  assert.equal(p.selectDate(null).accepted, false);
});

test('clear() drops the selection', () => {
  const p = mk();
  p.selectDate({ year: 2025, month: 6, day: 10 });
  p.clear();
  assert.equal(p.getState().selected, null);
});

// ============================================================================
// Range selection
// ============================================================================

test('range: start → end progression tags start/end/in-range', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 10 }); // start
  let s = p.getState();
  assert.deepEqual(s.range.start, { year: 2025, month: 6, day: 10, hour: 0, minute: 0, second: 0 });
  assert.equal(s.range.end, null);

  p.selectDate({ year: 2025, month: 6, day: 14 }); // end
  s = p.getState();
  assert.equal(s.range.start.day, 10);
  assert.equal(s.range.end.day, 14);
  assert.equal(s.range.length, 5); // inclusive 10..14
  assert.equal(cellOf(s, 2025, 6, 10).isRangeStart, true);
  assert.equal(cellOf(s, 2025, 6, 14).isRangeEnd, true);
  assert.equal(cellOf(s, 2025, 6, 12).isInRange, true);
  assert.equal(cellOf(s, 2025, 6, 10).isInRange, true, 'endpoints are in-range too');
  assert.equal(cellOf(s, 2025, 6, 15).isInRange, false);
});

test('range: a second click before the start swaps so start ≤ end', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 20 }); // start
  p.selectDate({ year: 2025, month: 6, day: 5 });  // earlier → swap
  const s = p.getState();
  assert.equal(s.range.start.day, 5);
  assert.equal(s.range.end.day, 20);
  assert.equal(s.range.length, 16);
});

test('range: a third click starts a fresh range', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 5 });
  p.selectDate({ year: 2025, month: 6, day: 9 }); // complete
  p.selectDate({ year: 2025, month: 6, day: 20 }); // restart
  const s = p.getState();
  assert.equal(s.range.start.day, 20);
  assert.equal(s.range.end, null);
});

test('range: endpoints cannot be a disabled day, but a range may SPAN one', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 }, disabledDates: [{ year: 2025, month: 6, day: 12 }] });
  // disabled day rejected as an endpoint
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 12 }).accepted, false);
  // a range that crosses the disabled day is allowed; the day stays disabled
  p.selectDate({ year: 2025, month: 6, day: 10 });
  p.selectDate({ year: 2025, month: 6, day: 14 });
  const s = p.getState();
  assert.equal(s.range.length, 5);
  const spanned = cellOf(s, 2025, 6, 12);
  assert.equal(spanned.isInRange, true, 'range crosses the disabled day');
  assert.equal(spanned.isDisabled, true, 'but it stays unselectable');
});

test('range: minRangeLength / maxRangeLength reject a violating completion', () => {
  const p = mk({ mode: 'range', minRangeLength: 3, maxRangeLength: 7, initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 11 }).reason, 'min-length'); // length 2 < 3
  assert.equal(p.getState().range.end, null, 'still awaiting a valid end');
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 20 }).reason, 'max-length'); // length 11 > 7
  const ok = p.selectDate({ year: 2025, month: 6, day: 14 }); // length 5, in [3,7]
  assert.equal(ok.accepted, true);
  assert.equal(p.getState().range.length, 5);
});

test('setRange sets a complete range, swaps, validates, and moves the view', () => {
  const p = mk({ mode: 'range', initialView: { year: 2030, month: 1 } });
  const res = p.setRange({ year: 2025, month: 6, day: 20 }, { year: 2025, month: 6, day: 10 });
  assert.equal(res.accepted, true);
  const s = p.getState();
  assert.equal(s.range.start.day, 10);
  assert.equal(s.range.end.day, 20);
  assert.deepEqual(s.view, { year: 2025, month: 6 }, 'view moved to the start');
});

test('range mode reports no single `selected`; single mode reports no range', () => {
  const r = mk({ mode: 'range' }).getState();
  assert.equal(r.selected, null);
  const sgl = mk({ mode: 'single' }).getState();
  assert.equal(sgl.range.start, null);
});

// ============================================================================
// Hover preview (range)
// ============================================================================

test('hover: setHovered emits a provisional start→hovered range; clearing reverts', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 10 }); // start, awaiting end
  p.setHovered({ year: 2025, month: 6, day: 13 });
  let s = p.getState();
  assert.ok(s.provisionalRange);
  assert.equal(s.provisionalRange.start.day, 10);
  assert.equal(s.provisionalRange.end.day, 13);
  assert.equal(s.provisionalRange.length, 4);
  assert.equal(cellOf(s, 2025, 6, 12).isInRange, true, 'preview highlight in the grid');
  assert.equal(s.range.end, null, 'committed range untouched during preview');

  p.clearHovered();
  s = p.getState();
  assert.equal(s.provisionalRange, null);
  assert.equal(cellOf(s, 2025, 6, 12).isInRange, false, 'preview reverted');
});

test('hover: hovering before the start previews a swapped range', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 15 });
  p.setHovered({ year: 2025, month: 6, day: 9 });
  const s = p.getState();
  assert.equal(s.provisionalRange.start.day, 9);
  assert.equal(s.provisionalRange.end.day, 15);
});

test('hover: ignored when not choosing an end (no start, or complete range)', () => {
  const p = mk({ mode: 'range', initialView: { year: 2025, month: 6 } });
  p.setHovered({ year: 2025, month: 6, day: 13 }); // no start yet
  assert.equal(p.getState().provisionalRange, null);
  p.selectDate({ year: 2025, month: 6, day: 10 });
  p.selectDate({ year: 2025, month: 6, day: 14 }); // complete
  p.setHovered({ year: 2025, month: 6, day: 20 });
  assert.equal(p.getState().provisionalRange, null, 'no preview once the range is complete');
});

// ============================================================================
// Time
// ============================================================================

test('time: disabled by default; enabled config reflected (24h vs 12h)', () => {
  assert.equal(mk().getState().time.enabled, false);
  const h24 = mk({ time: true }).getState().time;
  assert.equal(h24.enabled, true);
  assert.equal(h24.format, TimeFormat.H24);
  const h12 = mk({ time: true, timeFormat: '12h' }).getState().time;
  assert.equal(h12.format, TimeFormat.H12);
});

test('time: setTime updates time and derives hour12/period; parts are clamped', () => {
  const p = mk({ time: true });
  p.setTime({ hour: 14, minute: 30, second: 5 });
  let t = p.getState().time;
  assert.deepEqual([t.hour, t.minute, t.second], [14, 30, 5]);
  assert.equal(t.hour12, 2);
  assert.equal(t.period, 'pm');
  p.setTime({ hour: 0 });
  t = p.getState().time;
  assert.equal(t.hour12, 12); // midnight → 12 am
  assert.equal(t.period, 'am');
  p.setTime({ hour: 99, minute: -5 }); // clamped
  t = p.getState().time;
  assert.equal(t.hour, 23);
  assert.equal(t.minute, 0);
});

test('time: selected value carries the time; changing the day preserves it and vice versa', () => {
  const p = mk({ time: true, initialView: { year: 2025, month: 6 } });
  p.setTime({ hour: 9, minute: 45 });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  assert.deepEqual(p.getState().selected, { year: 2025, month: 6, day: 10, hour: 9, minute: 45, second: 0 });
  // change the day → time preserved
  p.selectDate({ year: 2025, month: 6, day: 20 });
  assert.equal(p.getState().selected.hour, 9);
  assert.equal(p.getState().selected.minute, 45);
  // change the time → day preserved
  p.setTime({ hour: 18 });
  const s = p.getState();
  assert.equal(s.selected.day, 20);
  assert.equal(s.selected.hour, 18);
});

// ============================================================================
// Navigation (independent of selection)
// ============================================================================

test('nav: next/prev month roll across the year boundary', () => {
  const p = mk({ initialView: { year: 2025, month: 12 } });
  p.nextMonth();
  assert.deepEqual(p.getState().view, { year: 2026, month: 1 });
  p.prevMonth();
  assert.deepEqual(p.getState().view, { year: 2025, month: 12 });
  p.prevMonth();
  assert.deepEqual(p.getState().view, { year: 2025, month: 11 });
});

test('nav: next/prev year and goToMonth', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  p.nextYear();
  assert.deepEqual(p.getState().view, { year: 2026, month: 6 });
  p.prevYear();
  assert.deepEqual(p.getState().view, { year: 2025, month: 6 });
  p.goToMonth(2030, 3);
  assert.deepEqual(p.getState().view, { year: 2030, month: 3 });
  p.goToMonth(2030, 99); // clamped to 12
  assert.deepEqual(p.getState().view, { year: 2030, month: 12 });
});

test('nav: goToToday and goToSelected move the view only', () => {
  const p = mk({ initialView: { year: 2030, month: 1 } });
  p.goToToday();
  assert.deepEqual(p.getState().view, { year: 2025, month: 6 });
  p.selectDate({ year: 2027, month: 9, day: 9 });
  p.goToMonth(2020, 1);
  p.goToSelected();
  assert.deepEqual(p.getState().view, { year: 2027, month: 9 });
});

test('nav: browsing months never changes the selection', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  const sel = p.getState().selected;
  p.nextMonth(); p.nextMonth(); p.prevYear(); p.goToMonth(2000, 1);
  assert.deepEqual(p.getState().selected, sel, 'selection untouched by navigation');
});

test('nav: canGoPrev/canGoNext hint when the adjacent month is fully out of range', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, min: { year: 2025, month: 6, day: 1 }, max: { year: 2025, month: 6, day: 30 } });
  const s = p.getState();
  assert.equal(s.canGoPrev, false, 'May is entirely before min');
  assert.equal(s.canGoNext, false, 'July is entirely after max');
  const open = mk({ initialView: { year: 2025, month: 6 } }).getState();
  assert.equal(open.canGoPrev, true);
  assert.equal(open.canGoNext, true);
});

// ============================================================================
// Month / year picker data (alternate switch views)
// ============================================================================

test('month picker: 12 months tagged current/selected/disabled', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, min: { year: 2025, month: 3, day: 1 } });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  const data = p.getMonthPickerData();
  assert.equal(data.year, 2025);
  assert.equal(data.months.length, 12);
  assert.equal(data.months[5].month, 6);
  assert.equal(data.months[5].isCurrentMonth, true);
  assert.equal(data.months[5].isSelected, true);
  assert.equal(data.months[0].isDisabled, true, 'Jan 2025 fully before min (Mar 1)');
  assert.equal(data.months[1].isDisabled, true, 'Feb 2025 fully before min');
  assert.equal(data.months[2].isDisabled, false, 'Mar 2025 partly in range');
});

test('year picker: paginated blocks, current/selected/disabled flags', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, max: { year: 2026, month: 12, day: 31 } });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  const page = p.getYearPickerData(0);
  assert.equal(page.years.length, 12);
  assert.equal(page.startYear, 2016); // floor(2025/12)*12
  assert.equal(page.endYear, 2027);
  assert.equal(page.years.find((y) => y.year === 2025).isCurrentYear, true);
  assert.equal(page.years.find((y) => y.year === 2025).isSelected, true);
  assert.equal(page.years.find((y) => y.year === 2027).isDisabled, true, 'fully after max year 2026');
  // pagination shifts by whole blocks
  assert.equal(p.getYearPickerData(1).startYear, 2028);
  assert.equal(p.getYearPickerData(-1).startYear, 2004);
});

test('regression: inverted min>max empty interval disables month/year picker + canGoPrev/Next, agreeing with per-cell grid', () => {
  // Independent setters can leave min > max — an empty selectable interval.
  // Per-cell isOutOfRange disables EVERY day; the switch-view flags must agree.
  const p = mk({ initialView: { year: 2025, month: 6 }, max: { year: 2025, month: 6, day: 10 } });
  p.setMin({ year: 2025, month: 6, day: 20 }); // now min (Jun 20) > max (Jun 10)
  const s = p.getState();
  // Every actual day cell in June is disabled.
  const enabledJuneDays = s.cells.filter((c) => c.month === 6 && c.year === 2025 && !c.isDisabled);
  assert.equal(enabledJuneDays.length, 0, 'no June day is selectable under an inverted interval');
  // The switch-view paths must NOT paint June / 2025 as enabled.
  const month = p.getMonthPickerData();
  assert.equal(month.months[5].month, 6);
  assert.equal(month.months[5].isDisabled, true, 'month picker: June disabled (empty interval)');
  const year = p.getYearPickerData(0);
  assert.equal(year.years.find((y) => y.year === 2025).isDisabled, true, 'year picker: 2025 disabled (empty interval)');
  // canGoPrev/canGoNext (which call monthHasInRangeDay) must agree too.
  assert.equal(s.canGoPrev, false, 'no adjacent month has an in-range day under an empty interval');
  assert.equal(s.canGoNext, false);
});

// ============================================================================
// Constraints
// ============================================================================

test('constraints: min/max disable the out-of-range cells', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, min: { year: 2025, month: 6, day: 10 }, max: { year: 2025, month: 6, day: 20 } });
  const s = p.getState();
  assert.equal(cellOf(s, 2025, 6, 9).isDisabled, true);
  assert.equal(cellOf(s, 2025, 6, 10).isDisabled, false); // inclusive
  assert.equal(cellOf(s, 2025, 6, 20).isDisabled, false); // inclusive
  assert.equal(cellOf(s, 2025, 6, 21).isDisabled, true);
});

test('constraints: predicate-based disabled rule (e.g. weekends) is applied', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, disabledDates: (v) => weekdayOf(v) === 0 || weekdayOf(v) === 6 });
  const s = p.getState();
  for (const c of s.cells) {
    const weekend = c.weekday === 0 || c.weekday === 6;
    assert.equal(c.isDisabled, weekend, `${c.key} weekend=${weekend}`);
  }
});

test('constraints: disabled list blocks selection of those days', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, disabledDates: [{ year: 2025, month: 6, day: 10 }, { year: 2025, month: 6, day: 11 }] });
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 10 }).accepted, false);
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 12 }).accepted, true);
});

test('constraints: runtime setMin/setMax/setDisabledDates re-tag the grid', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  assert.equal(cellOf(p.getState(), 2025, 6, 5).isDisabled, false);
  p.setMin({ year: 2025, month: 6, day: 10 });
  assert.equal(cellOf(p.getState(), 2025, 6, 5).isDisabled, true, 'newly out of range');
  p.setMin(null);
  assert.equal(cellOf(p.getState(), 2025, 6, 5).isDisabled, false, 'constraint cleared');
  p.setDisabledDates([{ year: 2025, month: 6, day: 5 }]);
  assert.equal(cellOf(p.getState(), 2025, 6, 5).isDisabled, true, 'newly disabled by rule');
});

// ============================================================================
// Programmatic setDate
// ============================================================================

test('setDate validates, moves the view, and selects', () => {
  const p = mk({ initialView: { year: 2025, month: 6 } });
  const res = p.setDate({ year: 2025, month: 9, day: 15 });
  assert.equal(res.accepted, true);
  const s = p.getState();
  assert.deepEqual(s.view, { year: 2025, month: 9 }, 'view jumped to the date');
  assert.equal(s.selected.day, 15);
  assert.equal(cellOf(s, 2025, 9, 15).isSelected, true);
});

test('setDate rejects a disabled/out-of-range value and leaves the view put', () => {
  const p = mk({ initialView: { year: 2025, month: 6 }, max: { year: 2025, month: 6, day: 30 } });
  const res = p.setDate({ year: 2025, month: 12, day: 25 });
  assert.equal(res.accepted, false);
  assert.deepEqual(p.getState().view, { year: 2025, month: 6 }, 'view unchanged on rejection');
  assert.equal(p.getState().selected, null);
});

// ============================================================================
// Config setters / mode switch
// ============================================================================

test('setMode switches selection shape and clears the old selection', () => {
  const p = mk({ mode: 'single', initialView: { year: 2025, month: 6 } });
  p.selectDate({ year: 2025, month: 6, day: 10 });
  p.setMode('range');
  const s = p.getState();
  assert.equal(s.mode, SelectionMode.RANGE);
  assert.equal(s.selected, null);
  assert.equal(s.range.start, null);
});

test('initialDate seeds the selection (single) and the view', () => {
  const p = createDatePicker({ today: FIXED_TODAY, initialDate: { year: 2027, month: 3, day: 8 } });
  const s = p.getState();
  assert.deepEqual(s.view, { year: 2027, month: 3 }, 'view derived from the seed');
  assert.equal(s.selected.day, 8);
});

// ============================================================================
// Lifecycle
// ============================================================================

test('destroy(): subsequent commands are inert no-ops and emit nothing', async () => {
  const p = mk();
  let calls = 0;
  p.subscribe(() => { calls++; });
  await Promise.resolve();
  assert.equal(calls, 1);
  p.destroy();
  p.selectDate({ year: 2025, month: 6, day: 10 });
  p.nextMonth();
  p.setTime({ hour: 5 });
  assert.equal(calls, 1, 'no emits after destroy');
  // selectDate after destroy reports not-accepted
  assert.equal(p.selectDate({ year: 2025, month: 6, day: 1 }).accepted, false);
});

// ---- regressions from the audit/refactor pass ------------------------------

test('regression: era math is exact for negative years (no double floor-correction)', () => {
  // Walk across the proleptic boundary region day by day: dates must round-trip
  // and weekdays must advance by exactly one per day.
  let cursor = { year: -401, month: 12, day: 28 };
  let weekday = weekdayOf(cursor);
  for (let i = 0; i < 800; i++) {
    cursor = addDays(cursor, 1);
    const expected = (weekday + 1) % 7;
    assert.equal(weekdayOf(cursor), expected, `weekday continuity at ${formatISODate(cursor)}`);
    weekday = expected;
    assert.equal(compareDates(addDays(cursor, -1), cursor), -1, 'total order holds');
  }
});

test('regression: formatISODate handles negative years and round-trips via parseISODate', () => {
  assert.equal(formatISODate({ year: -4, month: 2, day: 9 }), '-0004-02-09');
  assert.deepEqual(parseISODate('-0004-02-09'), { year: -4, month: 2, day: 9 });
  assert.equal(formatISODate({ year: 2024, month: 6, day: 1 }), '2024-06-01', 'positive unchanged');
});

test('regression: parseISODate rejects unsafe-integer years', () => {
  assert.equal(parseISODate('99999999999999999999-01-01'), null);
  assert.equal(parseISODate('1234567-01-01'), null, 'beyond 6 digits rejected');
});

test('regression: object-input gates reject a non-safe-integer year (no collapsed grid)', () => {
  // Number.MAX_VALUE is Number.isInteger but NOT Number.isSafeInteger; it used to
  // pass validation, poison view.year, and overflow daysFromCivil to Infinity so
  // leading/rows/total went NaN and the grid emitted 0 cells. All three object-
  // input entry points must now reject it and leave a usable grid.
  const huge = Number.MAX_VALUE;

  // 1. initialView never moves to the poisoned year (falls back to today's month).
  const viaInitial = createDatePicker({ today: FIXED_TODAY, initialView: { year: huge, month: 6 } });
  const s1 = viaInitial.getState();
  assert.ok(s1.cells.length > 0, 'initialView grid not collapsed');
  assert.deepEqual(s1.view, { year: FIXED_TODAY.year, month: FIXED_TODAY.month }, 'view fell back to today');
  assert.ok(Number.isFinite(viaInitial.getYearPickerData().startYear), 'year picker not poisoned');
  viaInitial.destroy();

  // 2. setDate rejects the value (and so leaves the view + grid intact).
  const viaSet = mk();
  const before = viaSet.getState().view;
  const res = viaSet.setDate({ year: huge, month: 6, day: 1 });
  assert.equal(res.accepted, false, 'setDate rejects non-safe-integer year');
  assert.equal(res.reason, 'invalid');
  assert.deepEqual(viaSet.getState().view, before, 'view unchanged on rejection');
  assert.ok(viaSet.getState().cells.length > 0, 'setDate grid not collapsed');
  viaSet.destroy();

  // 3. goToMonth ignores the non-safe-integer year and keeps the grid usable.
  const viaGoto = mk();
  const beforeGoto = viaGoto.getState().view;
  viaGoto.goToMonth(huge, 6);
  assert.deepEqual(viaGoto.getState().view, beforeGoto, 'goToMonth ignored non-safe year');
  assert.ok(viaGoto.getState().cells.length > 0, 'goToMonth grid not collapsed');
  viaGoto.destroy();
});

test('regression: toDate does not map years 0-99 to 1900-1999', () => {
  assert.equal(toDate({ year: 99, month: 3, day: 15 }).getFullYear(), 99);
  assert.equal(toDate({ year: 5, month: 1, day: 1 }).getFullYear(), 5);
});

test('regression: setTime ignores non-finite parts instead of poisoning state', () => {
  const picker = createDatePicker({ time: true, today: { year: 2024, month: 6, day: 10 } });
  picker.setTime({ hour: 9, minute: 30 });
  picker.setTime({ hour: NaN, minute: Infinity, second: 'x' });
  const time = picker.getState().time;
  assert.equal(time.hour, 9);
  assert.equal(time.minute, 30);
  picker.destroy();
});

test('regression: a rejected setDate leaves the view untouched', () => {
  const picker = createDatePicker({
    mode: SelectionMode.RANGE, maxRangeLength: 3,
    today: { year: 2024, month: 6, day: 10 },
  });
  picker.selectDate({ year: 2024, month: 6, day: 1 }); // range start
  const before = picker.getState().view;
  const result = picker.setDate({ year: 2024, month: 9, day: 20 }); // span >> 3 days
  assert.equal(result.accepted, false);
  assert.deepEqual(picker.getState().view, before, 'view did not move on rejection');
  picker.destroy();
});

test('regression: a rejected setDate leaves the shared time-of-day untouched', () => {
  const picker = createDatePicker({
    mode: SelectionMode.RANGE, time: true, maxRangeLength: 3,
    today: { year: 2024, month: 6, day: 10 },
  });
  picker.selectDate({ year: 2024, month: 6, day: 1 }); // range start
  picker.setTime({ hour: 8, minute: 0, second: 0 });
  const before = picker.getState().time;
  // Spans far more than 3 days → max-length rejection, but the value carries a
  // 23:59 time-of-day that must NOT leak into the shared time on rejection.
  const result = picker.setDate({ year: 2024, month: 9, day: 20, hour: 23, minute: 59 });
  assert.equal(result.accepted, false);
  assert.equal(result.reason, 'max-length');
  const after = picker.getState().time;
  assert.equal(after.hour, before.hour, 'hour unchanged on rejection');
  assert.equal(after.minute, before.minute, 'minute unchanged on rejection');
  assert.equal(after.second, before.second, 'second unchanged on rejection');
  assert.deepEqual([after.hour, after.minute, after.second], [8, 0, 0]);
  picker.destroy();
});

test('regression: a lone range start is not flagged isRangeEnd', () => {
  const picker = createDatePicker({ mode: SelectionMode.RANGE, today: { year: 2024, month: 6, day: 10 } });
  picker.selectDate({ year: 2024, month: 6, day: 12 });
  const cell = picker.getState().cells.find((c) => c.key === '2024-06-12');
  assert.equal(cell.isRangeStart, true);
  assert.equal(cell.isRangeEnd, false, 'no end exists yet');
  assert.equal(picker.getState().range.end, null);
  picker.destroy();
});

test('regression: initialDate honors minRangeLength (seeds start-only, not a 1-day range)', () => {
  const picker = createDatePicker({
    mode: SelectionMode.RANGE, minRangeLength: 3,
    initialDate: { year: 2024, month: 6, day: 10 },
    today: { year: 2024, month: 6, day: 10 },
  });
  const range = picker.getState().range;
  assert.ok(range.start, 'start seeded');
  assert.equal(range.end, null, 'no 1-day range that violates minRangeLength');
  picker.destroy();
});

test('regression: setDate carries a typed time when time is enabled; setTimeFormat exists', () => {
  const picker = createDatePicker({ time: true, today: { year: 2024, month: 6, day: 10 } });
  picker.setDate({ year: 2024, month: 6, day: 12, hour: 14, minute: 45 });
  const state = picker.getState();
  assert.equal(state.selected.hour, 14, 'typed hour kept');
  assert.equal(state.selected.minute, 45);
  picker.setTimeFormat(TimeFormat.H12);
  assert.equal(picker.getState().time.format, TimeFormat.H12);
  picker.destroy();
});

test('regression: oversized yearsPerPage is capped so getYearPickerData stays bounded', () => {
  const picker = createDatePicker({
    yearsPerPage: 50000000,
    today: { year: 2024, month: 6, day: 10 },
  });
  const data = picker.getYearPickerData();
  assert.equal(data.years.length, 100, 'page size capped at 100');
  assert.equal(data.endYear - data.startYear + 1, 100, 'range matches capped page size');
  picker.destroy();
});

test('regression: a small yearsPerPage under the cap is honored unchanged', () => {
  const picker = createDatePicker({
    yearsPerPage: 16,
    today: { year: 2024, month: 6, day: 10 },
  });
  assert.equal(picker.getYearPickerData().years.length, 16);
  picker.destroy();
});

// ============================================================================
// Regression: unknown enum inputs throw TypeError instead of silently
// falling back (repo convention; datetime is cited as the precedent).
// ============================================================================

test('regression: constructor throws TypeError on unknown mode (no silent fallback to SINGLE)', () => {
  assert.throws(() => createDatePicker({ today: FIXED_TODAY, mode: 'rangee' }), TypeError);
  // valid values and omitted/nullish still work
  assert.equal(mk({ mode: SelectionMode.RANGE }).getState().mode, SelectionMode.RANGE);
  assert.equal(mk().getState().mode, SelectionMode.SINGLE, 'omitted mode defaults to SINGLE');
});

test('regression: constructor throws TypeError on unknown timeFormat (no silent fallback to H24)', () => {
  assert.throws(() => createDatePicker({ today: FIXED_TODAY, timeFormat: '13h' }), TypeError);
  assert.equal(mk({ timeFormat: TimeFormat.H12 }).getState().time.format, TimeFormat.H12);
  assert.equal(mk().getState().time.format, TimeFormat.H24, 'omitted timeFormat defaults to H24');
});

test('regression: setMode throws TypeError on unknown value (wrong-case "RANGE" no longer no-ops to SINGLE)', () => {
  const p = mk();
  assert.throws(() => p.setMode('RANGE'), TypeError);
  // state unchanged by the rejected call
  assert.equal(p.getState().mode, SelectionMode.SINGLE);
  // valid value still switches
  p.setMode(SelectionMode.RANGE);
  assert.equal(p.getState().mode, SelectionMode.RANGE);
  p.destroy();
});

test('regression: setTimeFormat throws TypeError on unknown value (e.g. "24" no longer no-ops to H24)', () => {
  const p = mk();
  assert.throws(() => p.setTimeFormat('24'), TypeError);
  assert.equal(p.getState().time.format, TimeFormat.H24);
  p.setTimeFormat(TimeFormat.H12);
  assert.equal(p.getState().time.format, TimeFormat.H12);
  p.destroy();
});

if (isMain(import.meta.url)) report({ exit: true });
