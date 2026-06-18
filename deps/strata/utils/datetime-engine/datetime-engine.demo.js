// datetime-engine/datetime-engine.demo.js
// Reference CONSUMER for the headless datetime engine. The engine
// (../datetime-engine.js) ships no DOM and no CSS; everything visual here — the
// calendar grid, the range highlight, the hover preview, the time control, the
// month/year switch views, the presets, the typed-input parsing and every
// human-readable label — is the consumer's. It reads the engine's emitted state
// and paints.
//
// This file is the proof of the headless boundary (Gate 3): the engine is never
// asked to render, position, or format anything. On every change it emits the
// month grid (each cell pre-tagged) plus the selection / range / time / view /
// constraints, and this code does the rest. Swap this renderer for a different
// one and the engine does not change.
//
// Two things worth pointing at:
//   • The grid render is a plain rebuild from `state.weeks` — the engine already
//     computed isToday / isSelected / isInRange / isRangeStart / isRangeEnd /
//     isDisabled / isCurrentMonth, so there is zero date logic here.
//   • Humanized text (month name, weekday names, the selected-date sentence) is
//     produced HERE with Intl.DateTimeFormat. The engine emits only raw numbers;
//     locale formatting is deliberately the consumer's job.

import {
  createDatePicker, SelectionMode, parseISODate, addDays, daysInMonth,
} from './datetime-engine.js';

const $ = (id) => document.getElementById(id);

// ---- consumer-side locale formatting (the engine emits raw; we humanize) ---
// We build dates with Date.UTC and format them with timeZone:'UTC' so the civil
// value the engine emitted is named verbatim (no local-offset day shift). Locale
// formatting is the consumer's job; the engine never does this.
const fmtMonthYear = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fmtWeekdayShort = new Intl.DateTimeFormat(undefined, { weekday: 'short', timeZone: 'UTC' });
const fmtFull = new Intl.DateTimeFormat(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });
const fmtMonthName = new Intl.DateTimeFormat(undefined, { month: 'short', timeZone: 'UTC' });
// A civil {year, month, day} -> a JS Date at UTC midnight purely so Intl can name
// it (display only; nothing here feeds back into the engine's logic).
const asDate = (v) => new Date(Date.UTC(v.year, v.month - 1, v.day, v.hour || 0, v.minute || 0));
const labelMonthYear = (v) => fmtMonthYear.format(asDate({ ...v, day: 1 }));
const labelWeekday = (i) => fmtWeekdayShort.format(new Date(Date.UTC(2024, 0, 7 + i))); // 2024-01-07 is a Sunday
const labelMonth = (m) => fmtMonthName.format(new Date(Date.UTC(2024, m - 1, 1)));
const pad2 = (n) => String(n).padStart(2, '0');

// ---- demo configuration (creation-time options live here) ------------------
const config = {
  mode: SelectionMode.SINGLE,
  weekStart: 0,
  time: false,
  timeFormat: '24h',
  fixedWeeks: false,
};

let picker = null;
let viewLevel = 'days';  // 'days' | 'months' | 'years'  — consumer-only UI state
let yearPage = 0;        // year-grid pagination offset
let emits = 0;
let noPast = false;      // live-constraint toggles (applied via runtime setters)
let noWeekend = false;

// ---- (re)build the engine when a creation-time option changes --------------
// Mode / weekStart / time / fixedWeeks are creation-time, so changing them
// rebuilds. The two live constraints are re-applied afterwards with the runtime
// setters (which is exactly how a real app would toggle them).
function build() {
  if (picker) picker.destroy();
  picker = createDatePicker({
    mode: config.mode,
    weekStart: config.weekStart,
    time: config.time,
    timeFormat: config.timeFormat,
    fixedWeeks: config.fixedWeeks,
    onChange: render,
  });
  if (noPast) picker.setMin(picker.getState().today);
  if (noWeekend) picker.setDisabledDates((v) => isWeekendCivil(v));
  window.picker = picker; // for console poking (debug only)
  render(picker.getState());
}

// A weekend predicate over a civil {year,month,day}. (We use a UTC Date purely to
// name the weekday — display/predicate convenience; the engine never calls this.)
function isWeekendCivil(v) {
  const wd = new Date(Date.UTC(v.year, v.month - 1, v.day)).getUTCDay();
  return wd === 0 || wd === 6;
}

// ============================================================================
// Rendering — reconcile the DOM from the emitted state
// ============================================================================

function render(state) {
  emits++;
  $('emit-count').textContent = `${emits} emits`;

  // Header label reflects whichever switch view is active.
  if (viewLevel === 'days') $('cal-title').textContent = labelMonthYear(state.view);
  else if (viewLevel === 'months') $('cal-title').textContent = String(state.view.year);
  else {
    const page = picker.getYearPickerData(yearPage);
    $('cal-title').textContent = `${page.startYear} – ${page.endYear}`;
  }

  // Nav buttons: the engine emits canGoPrev/canGoNext hints for the days view.
  const prev = $('nav-prev'); const next = $('nav-next');
  if (viewLevel === 'days') {
    prev.disabled = !state.canGoPrev;
    next.disabled = !state.canGoNext;
  } else { prev.disabled = false; next.disabled = false; }

  // Toggle the three switch screens.
  $('view-days').hidden = viewLevel !== 'days';
  $('view-months').hidden = viewLevel !== 'months';
  $('view-years').hidden = viewLevel !== 'years';

  if (viewLevel === 'days') renderDays(state);
  else if (viewLevel === 'months') renderMonths();
  else renderYears();

  renderTime(state);
  renderReadout(state);
}

function renderDays(state) {
  // Weekday headers in the configured order (engine emits indices; we name them).
  const wd = $('weekdays');
  wd.replaceChildren(...state.weekdays.map((w) => {
    const s = document.createElement('span');
    s.textContent = labelWeekday(w.index);
    s.dataset.weekend = String(w.isWeekend);
    return s;
  }));

  const grid = $('grid');
  grid.dataset.previewing = String(!!state.provisionalRange);
  const cells = [];
  for (const cell of state.cells) {
    const wrap = document.createElement('div');
    wrap.className = 'cal-cell';
    // The continuous range band + caps come straight from the emitted flags.
    wrap.dataset.inRange = String(cell.isInRange);
    wrap.dataset.rangeStart = String(cell.isRangeStart);
    wrap.dataset.rangeEnd = String(cell.isRangeEnd);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    btn.textContent = String(cell.day);
    btn.dataset.current = String(cell.isCurrentMonth);
    btn.dataset.today = String(cell.isToday);
    btn.dataset.selected = String(cell.isSelected);
    btn.dataset.disabled = String(cell.isDisabled);
    btn.dataset.weekend = String(cell.isWeekend);
    // Stash the cell's date for the delegated handlers.
    btn.dataset.y = String(cell.year);
    btn.dataset.m = String(cell.month);
    btn.dataset.d = String(cell.day);
    if (cell.isDisabled) btn.setAttribute('aria-disabled', 'true');
    btn.setAttribute('aria-label', fmtFull.format(asDate(cell.date)));

    wrap.appendChild(btn);
    cells.push(wrap);
  }
  grid.replaceChildren(...cells);
}

function renderMonths() {
  const data = picker.getMonthPickerData();
  const grid = $('view-months');
  grid.replaceChildren(...data.months.map((m) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = labelMonth(m.month);
    b.dataset.current = String(m.isCurrentMonth);
    b.dataset.selected = String(m.isSelected);
    b.disabled = m.isDisabled;
    b.dataset.month = String(m.month);
    return b;
  }));
}

function renderYears() {
  const data = picker.getYearPickerData(yearPage);
  const grid = $('view-years');
  grid.replaceChildren(...data.years.map((y) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = String(y.year);
    b.dataset.current = String(y.isCurrentYear);
    b.dataset.selected = String(y.isSelected);
    b.disabled = y.isDisabled;
    b.dataset.year = String(y.year);
    return b;
  }));
}

function renderTime(state) {
  const ctrl = $('time-control');
  ctrl.hidden = !state.time.enabled;
  if (!state.time.enabled) return;
  const is12 = state.time.format === '12h';
  $('time-period').hidden = !is12;
  $('time-hour').max = is12 ? '12' : '23';
  $('time-hour').min = is12 ? '1' : '0';
  // Reflect the engine's canonical time (0–23) into the right control.
  $('time-hour').value = is12 ? String(state.time.hour12) : pad2(state.time.hour);
  $('time-min').value = pad2(state.time.minute);
  for (const b of $('time-period').querySelectorAll('button')) {
    b.setAttribute('aria-pressed', String(b.dataset.period === state.time.period));
  }
}

function renderReadout(state) {
  const lines = [];
  lines.push(`mode      : ${state.mode}`);
  lines.push(`view      : ${labelMonthYear(state.view)}`);
  if (state.mode === SelectionMode.SINGLE) {
    lines.push(`selected  : ${state.selected ? humanize(state.selected, state.time.enabled) : '—'}`);
  } else {
    const r = state.range;
    lines.push(`range     : ${r.start ? humanize(r.start) : '—'}  →  ${r.end ? humanize(r.end) : '…'}`);
    lines.push(`length    : ${r.length != null ? r.length + ' day(s)' : '—'}`);
    if (state.provisionalRange) {
      const p = state.provisionalRange;
      lines.push(`preview   : ${humanize(p.start)} → ${humanize(p.end)}  (${p.length} days)`);
    }
  }
  if (state.time.enabled) {
    lines.push(`time      : ${pad2(state.time.hour)}:${pad2(state.time.minute)}  (${state.time.hour12} ${state.time.period})`);
  }
  lines.push(`today     : ${humanize(state.today)}`);
  lines.push(`raw value : ${JSON.stringify(state.mode === SelectionMode.SINGLE ? state.selected : state.range)}`);
  $('readout').textContent = lines.join('\n');
}

function humanize(v, withTime) {
  let s = fmtFull.format(asDate(v));
  if (withTime && v.hour != null) s += ` ${pad2(v.hour)}:${pad2(v.minute)}`;
  return s;
}

// ============================================================================
// Wiring — translate user intent into engine commands
// ============================================================================

// Day grid: delegated click + hover. The engine owns the selection/range logic;
// we just report which day was clicked or hovered.
$('grid').addEventListener('click', (e) => {
  const btn = e.target.closest('.cal-day');
  if (!btn || btn.dataset.disabled === 'true') return;
  picker.selectDate({ year: +btn.dataset.y, month: +btn.dataset.m, day: +btn.dataset.d });
});
$('grid').addEventListener('pointerover', (e) => {
  const btn = e.target.closest('.cal-day');
  if (!btn) return;
  picker.setHovered({ year: +btn.dataset.y, month: +btn.dataset.m, day: +btn.dataset.d });
});
$('grid').addEventListener('pointerleave', () => picker.clearHovered());

// Header navigation — meaning depends on the active switch level.
$('nav-prev').addEventListener('click', () => {
  if (viewLevel === 'days') picker.prevMonth();
  else if (viewLevel === 'months') picker.prevYear();
  else { yearPage -= 1; render(picker.getState()); }
});
$('nav-next').addEventListener('click', () => {
  if (viewLevel === 'days') picker.nextMonth();
  else if (viewLevel === 'months') picker.nextYear();
  else { yearPage += 1; render(picker.getState()); }
});

// Click the title to climb: days -> months -> years.
$('cal-title').addEventListener('click', () => {
  if (viewLevel === 'days') viewLevel = 'months';
  else if (viewLevel === 'months') { viewLevel = 'years'; yearPage = 0; }
  render(picker.getState());
});

// Pick a month -> drop back to the days view for it.
$('view-months').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  picker.goToMonth(picker.getState().view.year, +b.dataset.month);
  viewLevel = 'days';
  render(picker.getState());
});
// Pick a year -> drop back to the months view for it.
$('view-years').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b || b.disabled) return;
  picker.goToMonth(+b.dataset.year, picker.getState().view.month);
  viewLevel = 'months';
  render(picker.getState());
});

// Mode + creation-time options (these rebuild the engine).
$('mode-single').addEventListener('click', () => setMode(SelectionMode.SINGLE));
$('mode-range').addEventListener('click', () => setMode(SelectionMode.RANGE));
function setMode(mode) {
  config.mode = mode;
  $('mode-single').setAttribute('aria-pressed', String(mode === SelectionMode.SINGLE));
  $('mode-range').setAttribute('aria-pressed', String(mode === SelectionMode.RANGE));
  build();
  renderPresets();
}
$('week-start').addEventListener('change', (e) => { config.weekStart = +e.target.value; picker.setWeekStart(config.weekStart); });
$('opt-time').addEventListener('change', (e) => { config.time = e.target.checked; build(); });
$('opt-12h').addEventListener('change', (e) => { config.timeFormat = e.target.checked ? '12h' : '24h'; build(); });
$('opt-fixed').addEventListener('change', (e) => { config.fixedWeeks = e.target.checked; build(); });

// Live constraints (no rebuild — runtime setters re-tag the grid).
$('opt-no-past').addEventListener('change', (e) => {
  noPast = e.target.checked;
  picker.setMin(noPast ? picker.getState().today : null);
});
$('opt-no-weekend').addEventListener('change', (e) => {
  noWeekend = e.target.checked;
  picker.setDisabledDates(noWeekend ? (v) => isWeekendCivil(v) : null);
});

// Time control -> setTime. For 12h we convert the period back to 0–23 ourselves.
function commitTime() {
  const is12 = picker.getState().time.format === '12h';
  let hour = parseInt($('time-hour').value, 10);
  const minute = parseInt($('time-min').value, 10) || 0;
  if (is12) {
    const pm = $('time-period').querySelector('[data-period="pm"]').getAttribute('aria-pressed') === 'true';
    hour = (hour % 12) + (pm ? 12 : 0);
  }
  picker.setTime({ hour: hour || 0, minute });
}
$('time-hour').addEventListener('change', commitTime);
$('time-min').addEventListener('change', commitTime);
$('time-period').addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return;
  for (const x of $('time-period').querySelectorAll('button')) x.setAttribute('aria-pressed', String(x === b));
  commitTime();
});

// Presets — context-aware to the mode. They call ordinary engine methods.
function renderPresets() {
  const host = $('presets');
  const today = picker.getState().today;
  const defs = config.mode === SelectionMode.SINGLE
    ? [
        ['Today', () => picker.setDate(today)],
        ['Clear', () => picker.clear()],
      ]
    : [
        ['Last 7 days', () => picker.setRange(addDays(today, -6), today)],
        ['This month', () => {
          const v = picker.getState().view;
          picker.setRange({ year: v.year, month: v.month, day: 1 },
            { year: v.year, month: v.month, day: daysInMonth(v.year, v.month) });
        }],
        ['Today', () => picker.setRange(today, today)],
        ['Clear', () => picker.clear()],
      ];
  host.replaceChildren(...defs.map(([label, fn]) => {
    const b = document.createElement('button');
    b.className = 'btn'; b.type = 'button'; b.textContent = label;
    b.addEventListener('click', () => { fn(); if (label !== 'Clear') goToSelectionMonth(); });
    return b;
  }));
}
function goToSelectionMonth() {
  // Keep the view on the selection after a preset (nice-to-have, consumer choice).
  const s = picker.getState();
  const anchor = s.mode === SelectionMode.SINGLE ? s.selected : s.range.start;
  if (anchor) picker.goToMonth(anchor.year, anchor.month);
}

// Typed input — the ENGINE does not parse. The demo parses, then feeds setDate.
function submitTyped() {
  const raw = $('typed').value.trim();
  $('typed-err').textContent = '';
  if (!raw) return;
  const parsed = parseISODate(raw);          // the demo's choice of parser
  if (!parsed) { $('typed-err').textContent = `Couldn't parse "${raw}" — try YYYY-MM-DD.`; return; }
  const res = picker.setDate(parsed);         // engine validates against constraints
  if (parsed.hour != null) picker.setTime(parsed);
  if (!res.accepted) {
    $('typed-err').textContent = res.reason === 'disabled'
      ? `${raw} is disabled / out of range.` : `Rejected: ${res.reason}.`;
  } else {
    viewLevel = 'days';
    $('typed').value = '';
  }
}
$('typed-go').addEventListener('click', submitTyped);
$('typed').addEventListener('keydown', (e) => { if (e.key === 'Enter') submitTyped(); });

// ---- go ---------------------------------------------------------------------
build();
renderPresets();
