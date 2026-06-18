# datetime-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an
option, touching the grid arithmetic, the selection/range state machine, the hover
preview, the time interaction, navigation, constraints, or the month/year-picker
data. It is the definition of "still working."

It mirrors `media-engine`, `virtualization-engine` and `toast-engine`'s suites:
layered gates, run in order. A failure at an earlier gate makes later gates
meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The
  calendar arithmetic is pure integer math and is tested against an independent,
  **timezone-independent** oracle; every "today"/relative behavior is driven by an
  **injectable today/clock**, so there is no wall-clock or local-timezone
  dependence and no flakiness. Run on every change; if red, stop and fix first.
- **Gate 2 — Browser verification protocol.** The rendering behaviors `node` can't
  reach: the calendar painting the emitted grid, single + range selection, the
  **live hover range preview**, the month/year switch views, the time control,
  disabled days, presets, and typed input parsed by the demo. Run after meaningful
  changes.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no DOM and no
  CSS, that the demo's calendar UI is entirely consumer-rendered, and that swapping
  the rendering needs no engine change. Run after any change to what the engine
  emits.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs`
from the repository root, then open
`http://localhost:8788/demo/datetime-engine.html`. ES-module imports are blocked
over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Headless.** The engine creates no DOM and ships no CSS. It manages picker
   *state* — the visible month's grid, the selection (single/range), the time, the
   view position, the constraints — and emits it via `getState()` +
   `subscribe()`/`onChange`. The consumer renders the calendar, the day cells, the
   inputs, the time control, and all chrome. There is no built-in calendar
   component, no default look.
2. **State out, paint in.** The engine emits a fully-structured month grid (every
   cell pre-tagged: `isCurrentMonth`, `isToday`, `isSelected`, `isRangeStart`,
   `isRangeEnd`, `isInRange`, `isDisabled`, `isWeekend`, plus weekday/column
   position) and the selection/time/view/constraint state. The consumer needs
   **zero date logic** of its own. The engine never touches a cell.
3. **Picker logic only, not deep date math.** The engine owns calendar-grid
   arithmetic (weekday-of-the-1st, days-in-month, leap years, week-start offset) and
   picker state. It owns **no** timezone conversion, **no** DST, **no** locale
   formatting/parsing of arbitrary strings. It emits raw normalized values +
   structural flags; humanizing is the consumer's (the demo uses
   `Intl.DateTimeFormat`).
4. **Deterministic, timezone-independent arithmetic.** All calendar math is pure
   integer arithmetic over a proleptic-Gregorian day number (Hinnant's
   civil↔days algorithms). It does not depend on `Date`'s local-timezone quirks, so
   the grid is identical on every machine. The only real clock read is "today", and
   it is **injectable** (`{ today }` or `{ clock: { now } }`), so even "today" is
   deterministic in tests.
5. **The selection rules are the engine's.** Single sets a value (disabled days
   rejected). Range progresses start→end (second-before-first swaps; a third click
   restarts); endpoints can't be disabled, but a range may **span** a disabled day;
   optional min/max range length. The consumer only reports which day was clicked.
6. **Hover preview is computed state.** While choosing an end, `setHovered(day)`
   makes the engine emit the provisional start→hovered range (and tag the grid), so
   the consumer just renders the live highlight; the committed range is untouched
   until the click.
7. **Time is independent of the day.** With time enabled, the selection carries a
   shared time-of-day; changing the day preserves the time and changing the time
   preserves the day. 12h vs 24h is a display hint the engine emits (with derived
   `hour12`/`period`); the canonical hour is always 0–23.
8. **Dependency-free.** Zero runtime dependencies beyond the in-repo `shared/`
   helpers. This file imports only `Emitter` from `../shared/emitter.js`. It must not
   bundle or require a date library.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/datetime-engine/datetime-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **60**).

The suite (`tests/datetime-engine/datetime-engine.test.mjs`, harness in
`tests/datetime-engine/harness.mjs`) injects a fixed `today` and uses pure
arithmetic, so every assertion is exact. Where an independent oracle is needed it
uses `Date`'s **UTC** getters (`getUTCDay`, day-0-of-next-month), which are
timezone-independent — never the local ones. Coverage maps directly to the
invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createDatePicker()` constructs with no `document`; `getState()` is valid synchronously; the source touches no `document.`/`window.`/`navigator.`. |
| Import boundary | The engine source imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| **Leap / century rules** | `isLeapYear` and `daysInMonth` for 2024 (29), 2023 (28), **2000 (29), 1900 (28)**; `daysInMonth` cross-checked against the UTC oracle for **every month 1900–2100**. |
| **Weekday math** | `weekdayOf` cross-checked against the UTC `getUTCDay` oracle across **1899–2101** (proves the grid math and the absence of a timezone leak in one sweep). |
| Day arithmetic | `addDays` crosses month/year/leap boundaries and round-trips; `compareDates`/`isSameDay` order by calendar day, ignoring time. |
| ISO helpers | `formatISODate` pads `YYYY-MM-DD`; `parseISODate` parses strict ISO (+ optional time), validates ranges (rejects `2023-02-29`, `2025-13-01`, `2025-06-31`), and **rejects** `next friday` / `06/04/2025` — it is deliberately not a real parser. |
| **Grid generation** | Exact leading/trailing adjacent-month days, current-month cell count == days-in-month, whole weeks, every cell consecutive by one day, February leap vs non-leap vs century, **year-boundary** trailing (Dec→Jan), `fixedWeeks` forces 6 rows, and a sweep asserting leading-count == oracle offset for every month 2020–2030. |
| Week-start | `weekStart` reorders the weekday headers (Sun-first vs Mon-first) and shifts the leading days; `setWeekStart` re-emits at runtime; weekend flags follow the weekday index. |
| today / selected | `isToday` from the injected today (not the wall clock); also via an injected `clock.now`; `isCurrentMonth` distinguishes in-month from adjacent bleed. |
| Single selection | Sets the value and tags the cell; a disabled day is rejected (no state change); invalid values rejected; `clear()` drops it. |
| **Range selection** | start→end tagging (`isRangeStart`/`End`/`InRange`, endpoints in-range); second-before-first **swaps**; a third click restarts; endpoints can't be disabled but a range **spans** a disabled day; `minRangeLength`/`maxRangeLength` reject a violating completion; `setRange` swaps + validates + moves the view. |
| **Hover preview** | `setHovered` emits the provisional start→hovered range and tags the grid; the committed range is untouched; `clearHovered` reverts; hovering before the start previews a swapped range; ignored when not choosing an end. |
| Time | Disabled by default; 24h/12h config reflected; `setTime` updates and derives `hour12`/`period`, clamping parts; the selection carries the time, and changing the day preserves it (and vice versa). |
| Navigation | next/prev month roll across the year boundary; next/prev year; `goToMonth` (clamped); `goToToday`/`goToSelected` move the view only; `canGoPrev`/`canGoNext` hint when the adjacent month is fully out of range; **navigation never alters the selection**. |
| Month/year data | 12 months tagged current/selected/disabled; year picker paginated in aligned blocks with current/selected/disabled flags and whole-page offsets. |
| Constraints | min/max disable the right cells (inclusive); a **predicate** rule (e.g. weekends) is applied per cell; a disabled list blocks selection; runtime `setMin`/`setMax`/`setDisabledDates` re-tag the grid. |
| Programmatic set | `setDate` validates, moves the view, and selects; a rejected value leaves the view put. |
| Mode / lifecycle | `setMode` switches selection shape and clears the old selection; `initialDate` seeds selection + view; `destroy()` makes commands inert no-ops and emits nothing. |

**Timezone-independence is part of the gate.** The suite must pass regardless of
`TZ`. Confirmed green under `TZ=Pacific/Kiritimati` (+14), `TZ=Etc/GMT+12` (−12) and
`TZ=Asia/Kolkata` (+5:30). If it ever fails under one TZ and not another, the engine
is leaking local-tz dependence — that is the bug, not the test.

**Also confirm nothing else regressed:**
`node tests/toast-engine/toast-engine.test.mjs` (39),
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/media-engine/run-all.mjs` (68),
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/datetime-engine.html`. The demo
(`demo/datetime-engine.js`) is a reference **consumer**: it renders the calendar
from the engine's emitted state and owns all markup, CSS, and the human-readable
labels (via `Intl.DateTimeFormat`).

Each check below was confirmed in a real browser session against this build.

1. **The calendar renders the emitted grid.** With an injected/real today of
   Thu 4 Jun 2026, the grid shows June 2026, the 1st in the Monday column (Sunday
   start), the 4th ringed as today, a leading May 31 and trailing July days — all
   from the per-cell flags; the demo does no date logic. The header label, weekday
   names and selected sentence are the demo's `Intl` formatting of the engine's raw
   values.
2. **Single selection.** Clicking a day fills it (`isSelected`), updates
   `selected` to `{year,month,day,hour,minute,second}`, and the readout shows the
   formatted date. Selecting is a no-op on a disabled day.
3. **Range selection with live hover preview.** In range mode, clicking a start
   then **hovering** another day paints a continuous band (start→hovered) with
   rounded caps and shows the provisional length — verified: hovering the 14th from
   a start of the 8th highlighted 7 cells with `range.end` still `null` (committed
   range untouched). Clicking the 14th commits the range (`length: 7`), with start
   and end caps. A second click before the start swaps; a third restarts.
4. **Month / year switch views.** Clicking the title climbs days → months → years.
   The months grid (Jan–Dec) tags the current month; the years grid shows an aligned
   12-year block (2016–2027) tagging the current year and paginating (‹ → 2004–2015).
   Picking a year drops to months; picking a month drops to days at that month —
   all from `getMonthPickerData()`/`getYearPickerData()`.
5. **Time control.** Enabling time reveals the hour/minute control (and AM/PM in
   12-hour mode). Setting 14:30 and selecting the 20th yields
   `{…, hour:14, minute:30}`; changing the day to the 21st **preserves** 14:30.
6. **Disabled days are unselectable.** "disable weekends" (a predicate) strikes
   every Sat/Sun and leaves weekdays selectable; "disable past days"
   (`setMin(today)`) disables days before today, leaves today (== min) selectable,
   and **disables the ‹ button** via the emitted `canGoPrev:false`. Clicking a
   disabled day does nothing.
7. **Presets.** Mode-aware presets call ordinary engine methods — single: "Today"
   (`setDate`) / "Clear"; range: "Last 7 days" (`setRange(addDays(today,-6), today)`),
   "This month", "Today", "Clear".
8. **Typed input is parsed by the demo, not the engine.** Typing `2027-01-15` and
   pressing Go parses it with the minimal `parseISODate`, calls `setDate`, and the
   calendar jumps to Jan 2027 with the day selected. Typing `next tuesday` shows
   "Couldn't parse …" — the engine never attempted to parse it.
9. **Month/year boundary correctness is visible.** Navigating Dec→Jan rolls the
   year in the header; February shows 29 days in 2024/2000 and 28 in 2023/1900 when
   navigated to.
10. **No console errors or warnings** at any point during the above.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing. These checks confirm the
boundary holds.

1. **No DOM, no CSS in the engine.** `datetime-engine.js` contains no
   `document`/`window`/`navigator` access, no stylesheet, no markup, and no default
   calendar component (grep + the Gate-1 source scan confirm it; the clean Node
   import proves none of it runs at module scope). Its only environmental input is
   the injectable clock's `now()` (default `() => new Date()`), used solely to read
   "today".
2. **The demo's calendar UI is entirely consumer-rendered.** Every element, class,
   color, the range band and its caps, the switch grids, the time control, and all
   human-readable text live in `demo/datetime-engine.html` /
   `demo/datetime-engine.js`. Delete the demo and the engine is unchanged and still
   fully tested by Gate 1.
3. **Swapping the rendering needs no engine change.** The consumer reads only
   emitted values — the per-cell flags, `weekdays`, `view`, `selected`, `range`,
   `provisionalRange`, `time`, `today`, `min`/`max`, `canGoPrev`/`canGoNext`, and the
   month/year-picker data. A completely different renderer (different markup,
   different framework, or none) consumes the same state with zero edits to
   `datetime-engine.js`. The engine emits structure; the consumer owns layout,
   styling, animation, and formatting.
4. **Formatting is opaque to the engine.** The demo names months/weekdays/dates with
   `Intl.DateTimeFormat`; the engine emits only integers. A different locale or a
   custom formatter changes nothing in the engine.

---

## 5. Known scope boundaries (by design)

- No timezone conversion, no DST handling, no locale-aware formatting, no
  natural-language or locale parsing. The engine owns calendar-grid arithmetic and
  picker state only; everything else is the consumer's (with their own library if
  needed).
- No formatting/humanization — the engine emits raw normalized values + structural
  flags; the consumer formats ("Wed, Jun 4 2025", "in 3 days", etc.).
- No default UI / CSS / calendar component — headless; the engine renders nothing.
- No real string parsing — `setDate` takes a normalized value; the only parse helper
  is the minimal, clearly-marked `parseISODate` (`YYYY-MM-DD`).
- No persistence, no network, no host coupling (stores, services, routing, design
  tokens, framework hooks). The engine takes config + values and emits state.

---

## 6. Copy-paste starter

A complete, runnable, vanilla calendar wired to the engine — single + range modes
with the **live hover preview** (the fiddly part). Save it next to
`datetime-engine.js` (or fix the import path), serve over HTTP, and open it. The CSS
is a plain, editable starting skin — not a precious design.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Datetime engine — starter</title>
<style>
  /* All consumer-owned. The engine ships none of this. Edit freely. */
  body { font: 15px/1.4 system-ui, sans-serif; margin: 40px; }
  .cal { width: 300px; user-select: none; }
  .cal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
  .cal-head button { font: inherit; cursor: pointer; }
  .cal-title { font-weight: 600; }
  .grid, .weekdays { display: grid; grid-template-columns: repeat(7, 1fr); }
  .weekdays span { text-align: center; font-size: 12px; color: #888; padding: 4px 0; }
  .cell { display: flex; justify-content: center; padding: 2px 0; }
  .cell[data-in-range="true"] { background: #dbeafe; }
  .cell[data-range-start="true"] { border-radius: 999px 0 0 999px; }
  .cell[data-range-end="true"] { border-radius: 0 999px 999px 0; }
  .day { width: 36px; height: 36px; border: 1px solid transparent; border-radius: 50%;
         background: none; cursor: pointer; font: inherit; }
  .day:hover:not([data-disabled="true"]) { background: #eee; }
  .day[data-current="false"] { color: #bbb; }
  .day[data-today="true"] { border-color: #3b82f6; font-weight: 700; }
  .day[data-selected="true"] { background: #3b82f6; color: #fff; border-color: #3b82f6; }
  .day[data-disabled="true"] { color: #ddd; cursor: not-allowed; text-decoration: line-through; }
</style>
</head>
<body>
  <label><input type="checkbox" id="range"> range mode</label>
  <div class="cal">
    <div class="cal-head">
      <button id="prev" type="button">‹</button>
      <span class="cal-title" id="title"></span>
      <button id="next" type="button">›</button>
    </div>
    <div class="weekdays" id="weekdays"></div>
    <div class="grid" id="grid"></div>
  </div>

  <script type="module">
    // Adjust this path to point at the engine.
    import { createDatePicker } from './datetime-engine.js';

    const $ = (id) => document.getElementById(id);
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    let picker;
    function build(mode) {
      if (picker) picker.destroy();
      picker = createDatePicker({ mode, weekStart: 0, onChange: render });
      render(picker.getState());
    }

    function render(state) {
      $('title').textContent = `${MONTHS[state.view.month - 1]} ${state.view.year}`;
      // weekday headers, in the configured order (engine emits the indices)
      $('weekdays').replaceChildren(...state.weekdays.map((w) => {
        const s = document.createElement('span'); s.textContent = WD[w.index]; return s;
      }));
      // the grid: every flag is precomputed by the engine — zero date logic here
      $('grid').replaceChildren(...state.cells.map((c) => {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.inRange = c.isInRange;
        cell.dataset.rangeStart = c.isRangeStart;
        cell.dataset.rangeEnd = c.isRangeEnd;
        const b = document.createElement('button');
        b.className = 'day';
        b.textContent = c.day;
        b.dataset.current = c.isCurrentMonth;
        b.dataset.today = c.isToday;
        b.dataset.selected = c.isSelected;
        b.dataset.disabled = c.isDisabled;
        b.dataset.key = `${c.year}-${c.month}-${c.day}`;
        cell.appendChild(b);
        return cell;
      }));
    }

    const dayFromEvent = (e) => {
      const b = e.target.closest('.day');
      if (!b) return null;
      const [year, month, day] = b.dataset.key.split('-').map(Number);
      return { el: b, value: { year, month, day } };
    };

    // click to select; hover to preview the range end (the engine computes it)
    $('grid').addEventListener('click', (e) => {
      const hit = dayFromEvent(e);
      if (hit && hit.el.dataset.disabled !== 'true') picker.selectDate(hit.value);
    });
    $('grid').addEventListener('pointerover', (e) => {
      const hit = dayFromEvent(e);
      if (hit) picker.setHovered(hit.value); // no-op unless choosing a range end
    });
    $('grid').addEventListener('pointerleave', () => picker.clearHovered());

    $('prev').addEventListener('click', () => picker.prevMonth());
    $('next').addEventListener('click', () => picker.nextMonth());
    $('range').addEventListener('change', (e) => build(e.target.checked ? 'range' : 'single'));

    build('single');
  </script>
</body>
</html>
```
