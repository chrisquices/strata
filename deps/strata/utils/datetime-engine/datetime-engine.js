// datetime-engine.js
// A headless date / time picker engine.
//
// The engine owns the *logic* of a calendar picker — generating the visible
// month's grid, tracking the selection (single date or range), the time-of-day,
// the navigation position, and the constraints (min/max + disabled rules) — and
// emits that state. It renders nothing: no DOM, no CSS, no default calendar UI.
// The consumer reads the emitted state and paints every day cell, the inputs,
// the time control, the month/year switch views, and all styling/animation.
//
// Four ideas keep it honest:
//   1. State out, paint in. getState() returns the fully-structured month grid
//      (every cell tagged with isToday/isSelected/isInRange/isDisabled/…), the
//      selection, the time, the view position and the constraints. subscribe()
//      pushes the same snapshot on every change. The engine never touches a cell.
//   2. Picker logic only, NOT deep date math. It owns calendar-grid arithmetic
//      (weekday-of-the-1st, days-in-month, leap years, week-start offset) and
//      picker state. It owns NO timezone conversion, NO DST, NO locale
//      formatting/parsing of arbitrary strings — those are the consumer's (with
//      their own library if they want them). The engine emits raw normalized
//      values + structural flags; the consumer humanizes.
//   3. Deterministic, timezone-independent arithmetic. All calendar math is pure
//      integer arithmetic over a proleptic-Gregorian day number (Howard
//      Hinnant's public-domain civil<->days algorithms). It does NOT lean on
//      `Date`'s local-timezone quirks, so the grid is identical on every machine
//      and exhaustively unit-testable. The only place a real clock is read is
//      "today", and that is injectable (like toast-engine's clock) so even
//      "today"/relative behavior is deterministic in tests.
//   4. Dependency-free and DOM-free. The engine is pure state + arithmetic; it
//      imports only Emitter from ../shared/. It runs headless in Node with no
//      `document` present — proven by the test suite importing it cleanly.
//
// ── The normalized internal date representation ─────────────────────────────
// A date is a plain "civil" object of integers:
//     { year, month, day, hour, minute, second }
//   • month is 1-indexed: 1 = January … 12 = December  (NOT JS Date's 0-indexed
//     month — that footgun stops here). day is 1-indexed (1–31).
//   • hour 0–23 (24h canonical internally; 12h is a *display* config), minute and
//     second 0–59. Time fields are optional on inputs and default to 0.
//   • weekday is 0-indexed 0 = Sunday … 6 = Saturday (matches the `weekStart`
//     option range 0–6 and Date#getDay, but is computed by pure arithmetic).
// The engine emits these raw. To interop with a JS Date at the boundary, the
// consumer can use the exported fromDate()/toDate() helpers (clearly local-time).
//
// Exports:
//   { createDatePicker, SelectionMode, TimeFormat, Weekday,
//     isLeapYear, daysInMonth, weekdayOf, compareDates, isSameDay,
//     formatISODate, parseISODate, addDays, fromDate, toDate }

import { Emitter } from '../shared/emitter.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/** How clicks build a selection. */
export const SelectionMode = Object.freeze({
  SINGLE: 'single', // one date
  RANGE: 'range',   // a start + end pair
});

/** Time display hint — emitted so the consumer renders the matching control. */
export const TimeFormat = Object.freeze({
  H24: '24h', // 0–23
  H12: '12h', // 1–12 + am/pm
});

/** Convenience names for the 0–6 weekday / weekStart numbers (Date#getDay order). */
export const Weekday = Object.freeze({
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
});

const DEFAULT_WEEKEND = [Weekday.SUNDAY, Weekday.SATURDAY];

// ============================================================================
// Calendar arithmetic — pure, deterministic, timezone-independent.
//
// These are the ONLY math the engine owns, and the part to test hardest. None
// of them touch `Date`; they operate on integers and a proleptic-Gregorian day
// number (days since 1970-01-01). The civil<->days pair are Howard Hinnant's
// well-known public-domain algorithms (chrono "civil_from_days"/"days_from_civil"),
// valid for the full proleptic Gregorian calendar, so leap years and century
// rules (1900 not a leap year, 2000 is) fall out exactly with no special cases.
// ============================================================================

/**
 * Gregorian leap-year rule: divisible by 4, except centuries not divisible by
 * 400. (2000 → leap; 1900 → not.)
 * @param {number} year
 * @returns {boolean}
 */
export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Number of days in a 1-indexed month, honoring leap February.
 * @param {number} year
 * @param {number} month  1–12
 * @returns {number}
 */
export function daysInMonth(year, month) {
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1];
}

/**
 * Days since 1970-01-01 for a civil date (month 1–12, day 1–31). Pure integer
 * arithmetic — no Date, no timezone. The shared ordinal that gives every date a
 * total order and powers range membership, "days between", and weekday.
 */
function daysFromCivil(year, month, day) {
  const adjustedYear = month <= 2 ? year - 1 : year;
  // Math.floor alone IS the era formula. Hinnant's C++ writes (y >= 0 ? y : y-399)/400
  // because C++ integer division truncates toward zero; that bias EMULATES floor.
  // Porting the bias AND using Math.floor double-corrected years before 0000-03-01.
  const era = Math.floor(adjustedYear / 400);
  const yearOfEra = adjustedYear - era * 400;                                   // [0, 399]
  const dayOfYear = Math.floor((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5) + day - 1; // [0, 365]
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;        // [0, 146096]
  return era * 146097 + dayOfEra - 719468;
}

/** Inverse of daysFromCivil: a day number back to a { year, month, day } civil date. */
function civilFromDays(dayNumber) {
  dayNumber += 719468;
  // Same floor-vs-truncation note as daysFromCivil: no bias with Math.floor.
  const era = Math.floor(dayNumber / 146097);
  const dayOfEra = dayNumber - era * 146097;                               // [0, 146096]
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );                                                          // [0, 399]
  const year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100)); // [0, 365]
  const monthFromMarch = Math.floor((5 * dayOfYear + 2) / 153);                // [0, 11]
  const day = dayOfYear - Math.floor((153 * monthFromMarch + 2) / 5) + 1;      // [1, 31]
  const month = monthFromMarch < 10 ? monthFromMarch + 3 : monthFromMarch - 9;                   // [1, 12]
  return { year: year + (month <= 2 ? 1 : 0), month, day };
}

/** Weekday (0 = Sunday … 6 = Saturday) for a day number. Hinnant's formula. */
function weekdayFromDays(dayNumber) {
  return dayNumber >= -4 ? (dayNumber + 4) % 7 : ((dayNumber + 5) % 7 + 6);
}

/** Day number for a civil value (reads only year/month/day). */
function toDayNumber(value) {
  return daysFromCivil(value.year, value.month, value.day);
}

/**
 * Weekday (0 = Sunday … 6 = Saturday) of a civil value, by pure arithmetic.
 * @param {{year:number, month:number, day:number}} value
 * @returns {number}
 */
export function weekdayOf(value) {
  return weekdayFromDays(toDayNumber(value));
}

/**
 * Compare two civil values by calendar DAY (time-of-day ignored): negative if
 * a is before b, 0 if the same day, positive if after. The basis for selection,
 * range and constraint logic — a picker reasons in whole days.
 */
export function compareDates(a, b) {
  return toDayNumber(a) - toDayNumber(b);
}

/** True when two civil values fall on the same calendar day. */
export function isSameDay(a, b) {
  return a != null && b != null && toDayNumber(a) === toDayNumber(b);
}

/** A new civil { year, month, day } `n` days after `value` (n may be negative). */
export function addDays(value, days) {
  return civilFromDays(toDayNumber(value) + days);
}

// ── minimal ISO helpers (the most the engine offers — NOT a real parser) ────

/**
 * Format a civil value as a minimal ISO `YYYY-MM-DD` date string. Date only —
 * no time, no timezone, no locale. A convenience for stable cell keys and the
 * simplest typed-input round-trip; anything richer is the consumer's job.
 */
export function formatISODate(value) {
  // Sign-aware: padStart on a negative year used to pad around the minus sign,
  // emitting malformed keys like '00-4-02-09'.
  const sign = value.year < 0 ? '-' : '';
  const year = String(Math.abs(value.year)).padStart(4, '0');
  const month = String(value.month).padStart(2, '0');
  const day = String(value.day).padStart(2, '0');
  return `${sign}${year}-${month}-${day}`;
}

/**
 * Parse a STRICT ISO `YYYY-MM-DD` (optionally `YYYY-MM-DDTHH:MM` or `…:SS`) into
 * a civil value, or null if it doesn't match or is out of range. This is the
 * deliberately-minimal helper the spec allows: it is NOT locale-aware and NOT a
 * natural-language parser ("next friday", "03/15"). Real typed-input parsing is
 * the consumer's responsibility — parse however you like, then hand the engine a
 * normalized value via setDate().
 * @param {string} str
 * @returns {{year:number, month:number, day:number, hour?:number, minute?:number, second?:number}|null}
 */
export function parseISODate(str) {
  if (typeof str !== 'string') return null;
  // Years are bounded (4-6 digits, optional sign): unbounded digits used to parse
  // to unsafe integers that passed validation and collapsed the emitted grid into
  // duplicate cells. Six digits round-trips every formatISODate output.
  const match = /^(-?\d{4,6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(str.trim());
  if (!match) return null;
  const year = +match[1];
  if (!Number.isSafeInteger(year)) return null;
  const month = +match[2];
  const day = +match[3];
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  const out = { year, month, day };
  if (match[4] != null) {
    const hour = +match[4];
    const minute = +match[5];
    const second = match[6] != null ? +match[6] : 0;
    if (hour > 23 || minute > 59 || second > 59) return null;
    out.hour = hour;
    out.minute = minute;
    out.second = second;
  }
  return out;
}

// ── Date interop (opt-in, at the boundary, clearly LOCAL time) ──────────────
// Provided so a consumer that already holds a JS Date can cross into the
// engine's civil representation and back. These DO use Date's local getters/
// constructor — that's the consumer's choice to make at the edge. The engine's
// own logic never calls them, so its determinism is unaffected.

/** A JS Date → civil value, reading its LOCAL components. */
export function fromDate(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

/** A civil value → JS Date in LOCAL time (month un-shifted to Date's 0-index). */
export function toDate(value) {
  // Constructed against a fixed leap year, then setFullYear: passing years 0-99
  // straight to the constructor silently maps them to 1900-1999.
  const date = new Date(2000, value.month - 1, value.day, value.hour || 0, value.minute || 0, value.second || 0, 0);
  date.setFullYear(value.year);
  return date;
}

// ── month-index helpers (browse months/years with no boundary special-cases) ─

/** A {year, month} → a single integer month index (handles year rollover). */
function monthIndex(year, month) {
  return year * 12 + (month - 1);
}

/** Inverse of monthIndex; floor division so negative years behave. */
function fromMonthIndex(index) {
  const year = Math.floor(index / 12);
  return { year, month: index - year * 12 + 1 };
}

// ============================================================================
// Validation
// ============================================================================

// Number.isSafeInteger (not isInteger): a non-safe huge magnitude like
// Number.MAX_VALUE is an "integer" yet overflows daysFromCivil's era*146097 to
// Infinity, collapsing the grid to 0 cells. parseISODate already guards its year
// the same way; this closes the object-input gates (isValidCivil / pickInitialView).
const isInt = (value) => typeof value === "number" && Number.isSafeInteger(value);

/**
 * True when `value` is a structurally valid civil date (integer y/m/d, month 1–12,
 * day within that month's real length). Time fields, if present, must be in
 * range. Adjacent-month grid days are always valid; this guards external input.
 */
function isValidCivil(value) {
  if (!value || typeof value !== 'object') return false;
  if (!isInt(value.year) || !isInt(value.month) || !isInt(value.day)) return false;
  if (value.month < 1 || value.month > 12) return false;
  if (value.day < 1 || value.day > daysInMonth(value.year, value.month)) return false;
  if (value.hour != null && (!isInt(value.hour) || value.hour < 0 || value.hour > 23)) return false;
  if (value.minute != null && (!isInt(value.minute) || value.minute < 0 || value.minute > 59)) return false;
  if (value.second != null && (!isInt(value.second) || value.second < 0 || value.second > 59)) return false;
  return true;
}

/** Keep only the date part as a fresh, normalized civil object. */
function dateOnly(value) {
  return { year: value.year, month: value.month, day: value.day };
}

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} DateValue  a normalized civil date the engine emits/accepts
 * @property {number} year
 * @property {number} month   1–12
 * @property {number} day     1–31
 * @property {number} [hour]  0–23
 * @property {number} [minute] 0–59
 * @property {number} [second] 0–59
 */

/**
 * @typedef {Object} DayCell  one rendered grid cell, carrying ALL the metadata a
 *   consumer needs so it does zero date logic of its own.
 * @property {DateValue} date     the cell's civil date (date only)
 * @property {number} year
 * @property {number} month       1–12
 * @property {number} day         1–31 (day-of-month number to render)
 * @property {number} weekday     0 = Sun … 6 = Sat
 * @property {string} key         stable ISO `YYYY-MM-DD` (good React/diff key)
 * @property {number} weekIndex   row (0-based)
 * @property {number} columnIndex column (0-based, 0 = the week-start column)
 * @property {boolean} isCurrentMonth  false for leading/trailing adjacent-month days
 * @property {boolean} isToday
 * @property {boolean} isSelected      single: the selection; range: an endpoint
 * @property {boolean} isRangeStart
 * @property {boolean} isRangeEnd
 * @property {boolean} isInRange       within [start, end] inclusive (commit or hover)
 * @property {boolean} isDisabled      fails min/max or a disabled-date rule
 * @property {boolean} isWeekend
 */

/**
 * @typedef {Object} PickerState  the full emitted snapshot
 * @property {string} mode                 'single' | 'range'
 * @property {{year:number, month:number}} view  the displayed month (raw; consumer formats)
 * @property {Array<{index:number, isWeekend:boolean}>} weekdays  headers, ordered from weekStart
 * @property {DayCell[][]} weeks           grid as rows of 7 cells
 * @property {DayCell[]} cells             the same cells, flat
 * @property {number} weekStart            0–6
 * @property {DateValue|null} selected     single-mode selection (with time merged)
 * @property {{start:DateValue|null, end:DateValue|null, length:number|null}} range
 * @property {{start:DateValue, end:DateValue, length:number}|null} provisionalRange  live hover
 * @property {{enabled:boolean, format:string, hour:number, minute:number, second:number, hour12:number, period:string}} time
 * @property {DateValue} today
 * @property {DateValue|null} min
 * @property {DateValue|null} max
 * @property {boolean} canGoPrev           the previous month has at least one in-range day
 * @property {boolean} canGoNext           the next month has at least one in-range day
 * @property {Object} config               resolved configuration
 */

// ============================================================================
// createDatePicker
// ============================================================================

/**
 * Create a headless date-picker instance.
 *
 * @param {Object} [options]
 * @param {string} [options.mode='single']        'single' | 'range'
 * @param {number} [options.weekStart=0]          first column weekday, 0 = Sun … 6 = Sat
 * @param {DateValue} [options.min]               earliest selectable day (inclusive)
 * @param {DateValue} [options.max]               latest selectable day (inclusive)
 * @param {DateValue[]|((value:DateValue)=>boolean)} [options.disabledDates]  list OR predicate
 * @param {boolean} [options.time=false]          enable time-of-day selection
 * @param {string} [options.timeFormat='24h']     '24h' | '12h' (display hint)
 * @param {number[]} [options.weekendDays=[0,6]]  which weekdays are flagged isWeekend
 * @param {boolean} [options.fixedWeeks=false]    always emit 6 rows (no month-to-month resize)
 * @param {number} [options.minRangeLength]       range mode: min span in days (inclusive count)
 * @param {number} [options.maxRangeLength]       range mode: max span in days (inclusive count)
 * @param {number} [options.yearsPerPage=12]      year-picker page size (capped at 100)
 * @param {DateValue} [options.initialDate]       seed the selection (validated)
 * @param {{year:number, month:number}} [options.initialView]  seed the displayed month (no day needed; else from selection/today)
 * @param {DateValue} [options.today]             override "today" (highest priority; for tests)
 * @param {{now:()=>Date}} [options.clock]        injectable clock; default real `() => new Date()`
 * @param {(state:PickerState)=>void} [options.onChange]  called with state on every change
 * @returns {Object} the picker instance
 */
export function createDatePicker(options = {}) {
  const clock = options.clock && typeof options.clock.now === 'function'
    ? options.clock
    : { now: () => new Date() };

  const config = {
    mode: validateMode(options.mode, SelectionMode.SINGLE),
    weekStart: clampWeekday(options.weekStart),
    timeEnabled: !!options.time,
    timeFormat: validateTimeFormat(options.timeFormat, TimeFormat.H24),
    weekendDays: Array.isArray(options.weekendDays) ? options.weekendDays.slice() : DEFAULT_WEEKEND.slice(),
    fixedWeeks: !!options.fixedWeeks,
    minRangeLength: positiveIntegerOrNull(options.minRangeLength),
    maxRangeLength: positiveIntegerOrNull(options.maxRangeLength),
    // Cap to a sane maximum so an oversized config can't drive
    // getYearPickerData()'s loop/allocation past a small bound.
    yearsPerPage: Math.min(positiveIntegerOrNull(options.yearsPerPage) || 12, 100),
  };

  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;
  let destroyed = false;

  // ---- constraints --------------------------------------------------------
  let min = options.min != null && isValidCivil(options.min) ? dateOnly(options.min) : null;
  let max = options.max != null && isValidCivil(options.max) ? dateOnly(options.max) : null;
  let disabledPredicate = buildDisabledPredicate(options.disabledDates);

  // ---- selection / time / view state --------------------------------------
  /** @type {DateValue|null} single-mode selection (date only; time merged at emit). */
  let selected = null;
  /** @type {DateValue|null} range start (date only). */
  let rangeStart = null;
  /** @type {DateValue|null} range end (date only). */
  let rangeEnd = null;
  /** @type {DateValue|null} the hovered day during end selection (range preview). */
  let hovered = null;
  /** Shared time-of-day, merged onto the emitted selection. Written via setTime,
   *  setDate, and an accepted initialDate seed. */
  const time = { hour: 0, minute: 0, second: 0 };

  // Seed the selection from initialDate (validated against constraints).
  if (options.initialDate != null && isValidCivil(options.initialDate)) {
    const seed = dateOnly(options.initialDate);
    if (!isDisabledDay(seed)) {
      if (config.mode === SelectionMode.SINGLE) {
        selected = seed;
      } else if (config.minRangeLength != null && config.minRangeLength > 1) {
        // A one-day seeded range would violate minRangeLength; seed the start
        // only and let the user complete a valid range.
        rangeStart = seed;
        rangeEnd = null;
      } else {
        rangeStart = seed;
        rangeEnd = seed;
      }
      // Carry an explicit seed time only when the seed itself was accepted.
      if (config.timeEnabled) applyTimeFields(options.initialDate);
    }
  }

  // The displayed month: initialView wins, else the selection's month, else today.
  let view = pickInitialView();

  // ---- constraint helpers -------------------------------------------------

  function isOutOfRange(value) {
    if (min && compareDates(value, min) < 0) return true;
    if (max && compareDates(value, max) > 0) return true;
    return false;
  }

  /** A day is disabled if it's out of [min,max] OR the disabled rule rejects it. */
  function isDisabledDay(value) {
    if (isOutOfRange(value)) return true;
    return disabledPredicate ? !!disabledPredicate(dateOnly(value)) : false;
  }

  // ---- "today" (from the injectable clock; overridable for tests) ---------

  function getToday() {
    if (options.today != null && isValidCivil(options.today)) return dateOnly(options.today);
    const now = clock.now();
    // Local getters: "today" means the user's local calendar day. Reading it back
    // is timezone-independent (the same components go in and come out).
    const year = now.getFullYear(), month = now.getMonth() + 1, day = now.getDate();
    // Finite-guard the clock boundary: an invalid Date (e.g. new Date(NaN)) yields
    // NaN components that would poison `view` and collapse the grid (rows/total NaN).
    // Fall back to the Unix epoch day rather than emit an unusable picker.
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
      return { year: 1970, month: 1, day: 1 };
    }
    return { year, month, day };
  }

  function pickInitialView() {
    // initialView is a {year, month} (no day required) — validate just those.
    const initialView = options.initialView;
    if (initialView && isInt(initialView.year) && isInt(initialView.month) && initialView.month >= 1 && initialView.month <= 12) {
      return { year: initialView.year, month: initialView.month };
    }
    if (selected) return { year: selected.year, month: selected.month };
    if (rangeStart) return { year: rangeStart.year, month: rangeStart.month };
    const today = getToday();
    return { year: today.year, month: today.month };
  }

  // ---- time ---------------------------------------------------------------

  function applyTimeFields(value) {
    if (isInt(value.hour)) time.hour = clampNumber(value.hour, 0, 23);
    if (isInt(value.minute)) time.minute = clampNumber(value.minute, 0, 59);
    if (isInt(value.second)) time.second = clampNumber(value.second, 0, 59);
  }

  /** Merge the shared time-of-day onto a date-only value for emission. */
  function withTime(value) {
    if (!value) return null;
    return { year: value.year, month: value.month, day: value.day, hour: time.hour, minute: time.minute, second: time.second };
  }

  // ---- range progression --------------------------------------------------
  // selectingEnd is true when a start is set but no end yet — the next click
  // completes the range, and hover previews against the start.
  function selectingEnd() {
    return config.mode === SelectionMode.RANGE && rangeStart != null && rangeEnd == null;
  }

  // ============================== state emission ===========================

  function buildWeekdays() {
    const out = [];
    for (let i = 0; i < 7; i++) {
      const index = (config.weekStart + i) % 7;
      out.push({ index, isWeekend: config.weekendDays.includes(index) });
    }
    return out;
  }

  /**
   * Which range to highlight in the grid: the live hover preview while choosing
   * an end, otherwise the committed range. Returned as { startNum, endNum } day
   * numbers (lo..hi), or null. Endpoints are also flagged separately.
   */
  function activeRangeNums() {
    if (selectingEnd() && hovered) {
      const a = toDayNumber(rangeStart);
      const b = toDayNumber(hovered);
      return { startNum: Math.min(a, b), endNum: Math.max(a, b), hasEnd: true };
    }
    if (rangeStart && rangeEnd) {
      return { startNum: toDayNumber(rangeStart), endNum: toDayNumber(rangeEnd), hasEnd: true };
    }
    if (rangeStart) {
      // A lone start has no end yet: hasEnd lets the grid flag isRangeStart
      // without the contradictory isRangeEnd it used to emit alongside a null
      // range.end.
      const n = toDayNumber(rangeStart);
      return { startNum: n, endNum: n, hasEnd: false };
    }
    return null;
  }

  function buildGrid(today) {
    const todayNum = toDayNumber(today);
    const selectedDayNumber = config.mode === SelectionMode.SINGLE && selected ? toDayNumber(selected) : null;
    const range = config.mode === SelectionMode.RANGE ? activeRangeNums() : null;

    // Leading adjacent-month days: how many week-start columns precede the 1st.
    const firstWeekday = weekdayOf({ year: view.year, month: view.month, day: 1 });
    const leading = (firstWeekday - config.weekStart + 7) % 7;
    const daysInViewMonth = daysInMonth(view.year, view.month);

    // Complete weeks; fixedWeeks pads to a stable 6 rows so the grid never resizes.
    let rows = Math.ceil((leading + daysInViewMonth) / 7);
    if (config.fixedWeeks) rows = 6;
    const total = rows * 7;

    const firstNum = daysFromCivil(view.year, view.month, 1);
    const startNum = firstNum - leading;

    const cells = [];
    for (let i = 0; i < total; i++) {
      const num = startNum + i;
      const cellDate = civilFromDays(num);
      const weekday = weekdayFromDays(num);
      const isCurrentMonth = cellDate.year === view.year && cellDate.month === view.month;

      let isSelected = false;
      let isRangeStart = false;
      let isRangeEnd = false;
      let isInRange = false;
      if (selectedDayNumber != null) {
        isSelected = num === selectedDayNumber;
      } else if (range) {
        isInRange = num >= range.startNum && num <= range.endNum;
        isRangeStart = num === range.startNum;
        isRangeEnd = range.hasEnd && num === range.endNum;
        isSelected = isRangeStart || isRangeEnd;
      }

      cells.push({
        date: cellDate,
        year: cellDate.year,
        month: cellDate.month,
        day: cellDate.day,
        weekday,
        key: formatISODate(cellDate),
        weekIndex: (i / 7) | 0,
        columnIndex: i % 7,
        isCurrentMonth,
        isToday: num === todayNum,
        isSelected,
        isRangeStart,
        isRangeEnd,
        isInRange,
        isDisabled: isDisabledDay(cellDate),
        isWeekend: config.weekendDays.includes(weekday),
      });
    }

    const weeks = [];
    for (let rowIndex = 0; rowIndex < rows; rowIndex++) weeks.push(cells.slice(rowIndex * 7, rowIndex * 7 + 7));
    return { cells, weeks };
  }

  /**
   * Whether a month (year + 1-indexed month) has any day inside [min, max].
   * Deliberately min/max only: the disabledDates rule is NOT consulted (it may
   * be an arbitrary predicate; probing 28-31 days per nav-arrow render would
   * make navigation gating O(predicate) — consumers needing that gate it
   * themselves).
   */
  function monthHasInRangeDay(year, month) {
    if (!min && !max) return true;
    // An inverted [min, max] is an empty interval: every day is out of range
    // (isOutOfRange disables the whole grid), so no month has an in-range day.
    // The one-sided bound tests below never fire for a month between max and min.
    if (min && max && toDayNumber(min) > toDayNumber(max)) return false;
    const firstNum = daysFromCivil(year, month, 1);
    const lastNum = daysFromCivil(year, month, daysInMonth(year, month));
    if (min && lastNum < toDayNumber(min)) return false;
    if (max && firstNum > toDayNumber(max)) return false;
    return true;
  }

  function buildTime() {
    const hour12 = ((time.hour + 11) % 12) + 1;
    return {
      enabled: config.timeEnabled,
      format: config.timeFormat,
      hour: time.hour,
      minute: time.minute,
      second: time.second,
      hour12,
      period: time.hour < 12 ? 'am' : 'pm',
    };
  }

  function buildState() {
    // Read the clock ONCE per emit: the grid's isToday flags and the emitted
    // `today` field must come from a single observation, or a midnight rollover
    // between two reads would flag a cell that disagrees with state.today.
    const today = getToday();
    const { cells, weeks } = buildGrid(today);
    const prev = fromMonthIndex(monthIndex(view.year, view.month) - 1);
    const next = fromMonthIndex(monthIndex(view.year, view.month) + 1);

    let range;
    if (config.mode === SelectionMode.RANGE) {
      const length = rangeStart && rangeEnd
        ? Math.abs(compareDates(rangeEnd, rangeStart)) + 1
        : null;
      range = { start: withTime(rangeStart), end: withTime(rangeEnd), length };
    } else {
      range = { start: null, end: null, length: null };
    }

    let provisionalRange = null;
    if (selectingEnd() && hovered) {
      const rangeNumbers = activeRangeNums();
      provisionalRange = {
        start: withTime(civilFromDays(rangeNumbers.startNum)),
        end: withTime(civilFromDays(rangeNumbers.endNum)),
        length: rangeNumbers.endNum - rangeNumbers.startNum + 1,
      };
    }

    return {
      mode: config.mode,
      view: { year: view.year, month: view.month },
      weekdays: buildWeekdays(),
      weeks,
      cells,
      weekStart: config.weekStart,
      selected: config.mode === SelectionMode.SINGLE ? withTime(selected) : null,
      range,
      provisionalRange,
      time: buildTime(),
      today,
      min: min ? { ...min } : null,
      max: max ? { ...max } : null,
      canGoPrev: monthHasInRangeDay(prev.year, prev.month),
      canGoNext: monthHasInRangeDay(next.year, next.month),
      config: { ...config, weekendDays: config.weekendDays.slice() },
    };
  }

  function notify() {
    if (destroyed) return;
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }

  // ============================== selection =================================

  /**
   * Select a day. Single mode sets the selection; range mode advances the
   * start→end progression (and a completing click before the start swaps so
   * start ≤ end; a click on a complete range starts a new one). Disabled days
   * can never be selected or be a range endpoint. Returns a result so a rejected
   * click is observable without a state change.
   * @param {DateValue} value
   * @returns {{accepted:boolean, reason?:string}}
   */
  function selectDate(value) {
    if (destroyed) return reject('destroyed');
    if (!isValidCivil(value)) return reject('invalid');
    const day = dateOnly(value);
    if (isDisabledDay(day)) return reject('disabled');

    if (config.mode === SelectionMode.SINGLE) {
      selected = day;
      notify();
      return { accepted: true };
    }

    // Range mode.
    if (rangeStart == null || rangeEnd != null) {
      // Fresh start (first click, or restart after a complete range).
      rangeStart = day;
      rangeEnd = null;
      hovered = null;
      notify();
      return { accepted: true };
    }

    // Completing the range: order the endpoints, then check length constraints.
    let start = rangeStart;
    let end = day;
    if (compareDates(end, start) < 0) { const swapped = start; start = end; end = swapped; }
    const length = Math.abs(compareDates(end, start)) + 1;
    if (config.minRangeLength != null && length < config.minRangeLength) return reject('min-length');
    if (config.maxRangeLength != null && length > config.maxRangeLength) return reject('max-length');

    rangeStart = start;
    rangeEnd = end;
    hovered = null;
    notify();
    return { accepted: true };
  }

  /**
   * Set a complete range directly (range mode). Swaps so start ≤ end, validates
   * endpoints against constraints/length, and moves the view to the start.
   * @returns {{accepted:boolean, reason?:string}}
   */
  function setRange(startValue, endValue) {
    if (destroyed) return reject('destroyed');
    if (config.mode !== SelectionMode.RANGE) return reject('not-range-mode');
    if (!isValidCivil(startValue) || !isValidCivil(endValue)) return reject('invalid');
    let start = dateOnly(startValue);
    let end = dateOnly(endValue);
    if (compareDates(end, start) < 0) { const swapped = start; start = end; end = swapped; }
    if (isDisabledDay(start) || isDisabledDay(end)) return reject('disabled');
    const length = Math.abs(compareDates(end, start)) + 1;
    if (config.minRangeLength != null && length < config.minRangeLength) return reject('min-length');
    if (config.maxRangeLength != null && length > config.maxRangeLength) return reject('max-length');
    rangeStart = start;
    rangeEnd = end;
    hovered = null;
    view = { year: start.year, month: start.month };
    notify();
    return { accepted: true };
  }

  /** Clear the selection (and any hover preview). */
  function clear() {
    if (destroyed) return;
    selected = null;
    rangeStart = null;
    rangeEnd = null;
    hovered = null;
    notify();
  }

  // ---- hover preview (range) ----------------------------------------------

  /** Report the hovered day so the engine emits the provisional start→hovered range. */
  function setHovered(value) {
    if (destroyed) return;
    if (!selectingEnd()) return;            // only meaningful while choosing an end
    if (!isValidCivil(value)) return;
    const next = dateOnly(value);
    if (hovered && isSameDay(hovered, next)) return; // no-op: same cell
    hovered = next;
    notify();
  }

  /** Drop the hover preview (revert to just the committed start). */
  function clearHovered() {
    if (destroyed || hovered == null) return;
    hovered = null;
    notify();
  }

  // ============================== time ====================================

  /**
   * Set the time-of-day carried by the selection. Out-of-range parts are
   * clamped. Changing the time never changes the selected day (and selecting a
   * day never resets the time) — the two are independent.
   * @param {{hour?:number, minute?:number, second?:number}} timeParts
   */
  function setTime(timeParts) {
    if (destroyed || !timeParts || typeof timeParts !== 'object') return;
    // Finite checks: NaN used to slip through clamping and permanently corrupt
    // the emitted time (and the selection it merges onto).
    if (Number.isFinite(timeParts.hour)) time.hour = clampNumber(Math.trunc(timeParts.hour), 0, 23);
    if (Number.isFinite(timeParts.minute)) time.minute = clampNumber(Math.trunc(timeParts.minute), 0, 59);
    if (Number.isFinite(timeParts.second)) time.second = clampNumber(Math.trunc(timeParts.second), 0, 59);
    notify();
  }

  // ============================== navigation ===============================

  function goToMonthIndex(index) {
    view = fromMonthIndex(index);
    notify();
  }

  function nextMonth() { if (!destroyed) goToMonthIndex(monthIndex(view.year, view.month) + 1); }
  function prevMonth() { if (!destroyed) goToMonthIndex(monthIndex(view.year, view.month) - 1); }
  function nextYear() { if (!destroyed) { view = { year: view.year + 1, month: view.month }; notify(); } }
  function prevYear() { if (!destroyed) { view = { year: view.year - 1, month: view.month }; notify(); } }

  /** Jump to a specific month (year, 1-indexed month). Month is clamped to 1–12. */
  function goToMonth(year, month) {
    if (destroyed || !isInt(year) || !isInt(month)) return;
    view = { year, month: clampNumber(month, 1, 12) };
    notify();
  }

  /** Move the view to the current "today" month (selection untouched). */
  function goToToday() {
    if (destroyed) return;
    const today = getToday();
    view = { year: today.year, month: today.month };
    notify();
  }

  /** Move the view to the selected date (or range start). No-op if nothing selected. */
  function goToSelected() {
    if (destroyed) return;
    const target = config.mode === SelectionMode.SINGLE ? selected : rangeStart;
    if (!target) return;
    view = { year: target.year, month: target.month };
    notify();
  }

  // ---- alternate-view data (month grid / year grid switch views) ----------

  /**
   * Data for a 12-month picker for the current view year: each month tagged
   * current/selected/disabled so the consumer renders the month-switch grid.
   * @returns {{year:number, months:Array<{month:number, isCurrentMonth:boolean, isSelected:boolean, isDisabled:boolean, isCurrentRealMonth:boolean}>}}
   */
  function getMonthPickerData() {
    const today = getToday();
    const months = [];
    for (let monthNumber = 1; monthNumber <= 12; monthNumber++) {
      months.push({
        month: monthNumber,
        isCurrentMonth: monthNumber === view.month,
        isSelected: selectionTouchesMonth(view.year, monthNumber),
        isDisabled: !monthHasInRangeDay(view.year, monthNumber),
        isCurrentRealMonth: today.year === view.year && today.month === monthNumber,
      });
    }
    return { year: view.year, months };
  }

  /**
   * Data for a paginated year picker. Pages tile the integer line in blocks of
   * `yearsPerPage` (default 12) aligned to a block boundary; pageOffset shifts by
   * whole pages from the page containing the view year.
   * @param {number} [pageOffset=0]
   * @returns {{startYear:number, endYear:number, pageOffset:number, years:Array<{year:number, isCurrentYear:boolean, isSelected:boolean, isDisabled:boolean, isCurrentRealYear:boolean}>}}
   */
  function getYearPickerData(pageOffset = 0) {
    const yearsPerPage = config.yearsPerPage;
    const today = getToday();
    const blockStart = Math.floor(view.year / yearsPerPage) * yearsPerPage + (pageOffset | 0) * yearsPerPage;
    const years = [];
    for (let i = 0; i < yearsPerPage; i++) {
      const year = blockStart + i;
      years.push({
        year,
        isCurrentYear: year === view.year,
        isSelected: selectionTouchesYear(year),
        isDisabled: !yearHasInRangeDay(year),
        isCurrentRealYear: year === today.year,
      });
    }
    return { startYear: blockStart, endYear: blockStart + yearsPerPage - 1, pageOffset: pageOffset | 0, years };
  }

  function selectionTouchesMonth(year, month) {
    if (config.mode === SelectionMode.SINGLE) {
      return !!selected && selected.year === year && selected.month === month;
    }
    return (!!rangeStart && rangeStart.year === year && rangeStart.month === month)
      || (!!rangeEnd && rangeEnd.year === year && rangeEnd.month === month);
  }

  function selectionTouchesYear(year) {
    if (config.mode === SelectionMode.SINGLE) return !!selected && selected.year === year;
    return (!!rangeStart && rangeStart.year === year) || (!!rangeEnd && rangeEnd.year === year);
  }

  function yearHasInRangeDay(year) {
    if (!min && !max) return true;
    // An inverted [min, max] is an empty interval — no year has an in-range day
    // (mirrors monthHasInRangeDay; the one-sided tests below miss this boundary).
    if (min && max && toDayNumber(min) > toDayNumber(max)) return false;
    const firstNum = daysFromCivil(year, 1, 1);
    const lastNum = daysFromCivil(year, 12, 31);
    if (min && lastNum < toDayNumber(min)) return false;
    if (max && firstNum > toDayNumber(max)) return false;
    return true;
  }

  // ============================== programmatic set =========================

  /**
   * Validate a normalized value against the constraints, move the view to it,
   * and select it (the same progression selectDate drives). This is the seam for
   * typed input: the consumer parses the string however it likes, then hands the
   * engine the normalized result. A value that is invalid, disabled, or out of
   * range is rejected with the view left put; otherwise the view moves to the
   * value's month and the selection is applied in one emit. Returns the result.
   * @param {DateValue} value
   * @returns {{accepted:boolean, reason?:string}}
   */
  function setDate(value) {
    if (destroyed) return reject('destroyed');
    if (!isValidCivil(value)) return reject('invalid');
    if (isDisabledDay(value)) return reject('disabled');
    // The typed-input seam keeps the typed time too (parseISODate can carry one);
    // it used to be silently dropped while initialDate honored it. Snapshot it
    // first so a rejected set can restore the shared time-of-day verbatim.
    const previousTime = { ...time };
    if (config.timeEnabled) applyTimeFields(value);
    // Move the view first so the single notify() from selectDate emits the new
    // month — but restore it if selectDate still rejects (range-length rules),
    // so a rejected set leaves the picker exactly as it was.
    const previousView = view;
    view = { year: value.year, month: value.month };
    const result = selectDate(value);
    if (!result.accepted) {
      view = previousView;
      time.hour = previousTime.hour;
      time.minute = previousTime.minute;
      time.second = previousTime.second;
    }
    return result;
  }

  // ============================== config setters ===========================

  function setMode(mode) {
    if (destroyed) return;
    const next = validateMode(mode, config.mode);
    if (next === config.mode) return;
    config.mode = next;
    // Switching selection shape would leave ambiguous state; start clean.
    selected = null;
    rangeStart = null;
    rangeEnd = null;
    hovered = null;
    notify();
  }

  function setWeekStart(weekStart) {
    if (destroyed) return;
    config.weekStart = clampWeekday(weekStart);
    notify();
  }

  // Note for setMin/setMax/setDisabledDates: an existing selection is deliberately
  // KEPT when constraints tighten around it — the grid then emits those cells with
  // isSelected && isDisabled, and the consumer decides whether to clear or warn.
  // Silently destroying the user's selection on a config change would lose data.
  function setMin(value) {
    if (destroyed) return;
    min = value != null && isValidCivil(value) ? dateOnly(value) : null;
    notify();
  }

  function setMax(value) {
    if (destroyed) return;
    max = value != null && isValidCivil(value) ? dateOnly(value) : null;
    notify();
  }

  function setDisabledDates(rule) {
    if (destroyed) return;
    disabledPredicate = buildDisabledPredicate(rule);
    notify();
  }

  function setTimeEnabled(enabled) {
    if (destroyed) return;
    config.timeEnabled = !!enabled;
    notify();
  }

  /** Switch the 12h/24h display hint (the canonical time stays 24h internally). */
  function setTimeFormat(format) {
    if (destroyed) return;
    config.timeFormat = validateTimeFormat(format, config.timeFormat);
    notify();
  }

  // ============================== read / lifecycle =========================

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }

  function getState() {
    return buildState();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    emitter.clear();
  }

  function reject(reason) { return { accepted: false, reason }; }

  // Emit the initial state once after construction (deferred a microtask so a
  // synchronous subscribe() right after creation still receives it), mirroring
  // the other engines. getState() is already valid synchronously.
  queueMicrotask(() => { if (!destroyed) notify(); });

  return {
    // read
    getState,
    subscribe,
    // selection
    selectDate,
    setRange,
    clear,
    // hover preview
    setHovered,
    clearHovered,
    // time
    setTime,
    // navigation
    nextMonth,
    prevMonth,
    nextYear,
    prevYear,
    goToMonth,
    goToToday,
    goToSelected,
    // alternate views
    getMonthPickerData,
    getYearPickerData,
    // programmatic set
    setDate,
    // config setters
    setMode,
    setWeekStart,
    setMin,
    setMax,
    setDisabledDates,
    setTimeEnabled,
    setTimeFormat,
    // lifecycle
    destroy,
  };
}

// ============================================================================
// small module-private helpers
// ============================================================================

function clampNumber(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

/** Coerce a weekStart to an integer 0–6 (default 0). */
function clampWeekday(weekStart) {
  if (!isInt(weekStart)) return 0;
  return clampNumber(weekStart, 0, 6);
}

/** A positive integer, or null (used for optional counts/lengths). */
function positiveIntegerOrNull(value) {
  return isInt(value) && value > 0 ? value : null;
}

// Enum validation. An omitted (nullish) value falls back to the default; a
// genuinely-unknown non-nullish value throws TypeError — the repo convention
// (cf. color/transform2d/toast: "Unknown enum values must throw"). datetime is
// cited as the precedent for that convention, so it must hold here too.
const SELECTION_MODES = Object.freeze(Object.values(SelectionMode));
const TIME_FORMATS = Object.freeze(Object.values(TimeFormat));

/** Validate `mode` against SelectionMode; nullish → default; unknown → throw. */
function validateMode(mode, fallback) {
  if (mode == null) return fallback;
  if (SELECTION_MODES.includes(mode)) return mode;
  throw new TypeError('Unknown mode: ' + mode);
}

/** Validate `format` against TimeFormat; nullish → default; unknown → throw. */
function validateTimeFormat(format, fallback) {
  if (format == null) return fallback;
  if (TIME_FORMATS.includes(format)) return format;
  throw new TypeError('Unknown timeFormat: ' + format);
}

/**
 * Normalize `disabledDates` (a predicate OR a list of values) into a single
 * predicate, or null when there's no rule. A list is pre-indexed by day number
 * so lookups are O(1).
 */
function buildDisabledPredicate(rule) {
  if (typeof rule === 'function') return rule;
  if (Array.isArray(rule)) {
    const set = new Set();
    for (const value of rule) if (isValidCivil(value)) set.add(daysFromCivil(value.year, value.month, value.day));
    if (set.size === 0) return null;
    return (value) => set.has(daysFromCivil(value.year, value.month, value.day));
  }
  return null;
}
