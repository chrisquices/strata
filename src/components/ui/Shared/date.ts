// ISO-string <-> @internationalized/date converters. The kit's date components expose a plain
// ISO-string v-model and convert to reka's DateValue objects
// internally. Invalid/empty strings degrade to undefined rather than throwing.
import { CalendarDate, Time, today, getLocalTimeZone, parseDate, parseTime } from '@internationalized/date';

export interface IsoRange {
  start?: string;
  end?: string;
}
export interface DateRange {
  start?: CalendarDate;
  end?: CalendarDate;
}

/** "2026-06-14" -> CalendarDate (undefined if empty/invalid). */
export function dateFromIso(iso: string | undefined | null): CalendarDate | undefined {
  if (!iso) return undefined;
  try {
    return parseDate(iso);
  } catch {
    return undefined;
  }
}

/** CalendarDate -> "2026-06-14" (empty string if null). */
export function isoFromDate(date: CalendarDate | null | undefined): string {
  return date ? date.toString() : '';
}

/** "14:30" / "14:30:00" -> Time (undefined if empty/invalid). */
export function timeFromIso(iso: string | undefined | null): Time | undefined {
  if (!iso) return undefined;
  try {
    return parseTime(iso);
  } catch {
    return undefined;
  }
}

/** Time -> "14:30" (or "14:30:45" when seconds are set, e.g. granularity="second"). Empty if null. */
export function isoFromTime(time: Time | null | undefined): string {
  if (!time) return '';
  const s = time.toString(); // "HH:MM:SS" (the lib always serializes seconds)
  return s.endsWith(':00') ? s.slice(0, 5) : s; // drop the trailing ":00", but keep real seconds
}

/** Current date as a CalendarDate — the default calendar placeholder. */
export function todayDate(): CalendarDate {
  return today(getLocalTimeZone());
}

/** { start: "2026-06-01", end: "2026-06-07" } -> { start, end } as CalendarDates. */
export function rangeFromIso(range: IsoRange | null | undefined): DateRange {
  return { start: dateFromIso(range?.start), end: dateFromIso(range?.end) };
}

/** { start, end } CalendarDates -> ISO-string range. */
export function isoFromRange(range: DateRange | null | undefined): IsoRange {
  return { start: isoFromDate(range?.start), end: isoFromDate(range?.end) };
}
