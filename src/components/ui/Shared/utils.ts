// Shared utilities for the Strata kit.

import {
    CalendarDate,
    Time,
    getLocalTimeZone,
    parseDate as parseInternationalDate,
    parseTime as parseInternationalTime,
    today,
} from '@internationalized/date';

// #region File Size

type FileSizeVariant = 'short' | 'compact' | 'detailed';

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const;

/**
 * Format a byte count on a binary (1024) scale.
 *   'short'    (default) → "2.4 MB"           one trimmed decimal, spaced unit
 *   'compact'            → "2.4M"             no space, single-letter unit
 *   'detailed'           → "2,576,384 bytes"  exact, digit-grouped
 */
export function formatFileSize(bytes: number | string, variant: FileSizeVariant = 'short'): string {
    const n = Number(bytes);
    if (!Number.isFinite(n) || n < 0) return '';

    if (variant === 'detailed') {
        const whole = Math.round(n);
        return `${whole.toLocaleString()} ${whole === 1 ? 'byte' : 'bytes'}`;
    }

    let unitIndex = 0;
    let scaled = n;
    while (scaled >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
        scaled /= 1024;
        unitIndex++;
    }

    const rounded = unitIndex === 0 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
    const unit = FILE_SIZE_UNITS[unitIndex];

    return variant === 'compact'
        ? `${rounded}${unit === 'B' ? 'B' : unit[0]}`
        : `${rounded} ${unit}`;
}

// #endregion

// #region Time Formatting

type TimeVariant = 'relative' | 'date' | 'time' | 'datetime';

function coerceToDate(value: unknown): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    if (typeof value === 'number' || typeof value === 'string') {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** Machine-readable ISO string for a `<time datetime="…">` attribute. */
export function toIsoString(value: unknown): string {
    return coerceToDate(value)?.toISOString() ?? '';
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});

const RELATIVE_THRESHOLDS: { limit: number; divisor: number; unit: Intl.RelativeTimeFormatUnit }[] = [
    {limit: 60, divisor: 1, unit: 'second'},
    {limit: 3_600, divisor: 60, unit: 'minute'},
    {limit: 86_400, divisor: 3_600, unit: 'hour'},
    {limit: 604_800, divisor: 86_400, unit: 'day'},
    {limit: 2_629_800, divisor: 604_800, unit: 'week'},
    {limit: 31_557_600, divisor: 2_629_800, unit: 'month'},
    {limit: Infinity, divisor: 31_557_600, unit: 'year'},
];

function formatRelative(date: Date, now: Date): string {
    const seconds = (date.getTime() - now.getTime()) / 1000;
    if (Math.abs(seconds) < 45) return relativeFormatter.format(0, 'second');
    for (const {limit, divisor, unit} of RELATIVE_THRESHOLDS) {
        if (Math.abs(seconds) < limit) {
            return relativeFormatter.format(Math.round(seconds / divisor), unit);
        }
    }
    return '';
}

const DATE_FORMAT_OPTIONS: Record<TimeVariant, Intl.DateTimeFormatOptions> = {
    relative: {},
    date: {year: 'numeric', month: 'short', day: 'numeric'},
    time: {hour: 'numeric', minute: '2-digit'},
    datetime: {year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'},
};

/**
 * Format a timestamp (Date, epoch-ms number, or ISO string).
 *   'relative' (default) → "2 hours ago" / "in 3 days" / "now"
 *   'date'               → "May 31, 2026"
 *   'datetime'           → "May 31, 2026, 2:41 PM"
 *   'time'               → "2:41 PM"
 */
export function formatTime(value: unknown, variant: TimeVariant = 'relative', now: Date = new Date()): string {
    const date = coerceToDate(value);
    if (!date) return '';
    if (variant === 'relative') return formatRelative(date, now);
    return new Intl.DateTimeFormat(undefined, DATE_FORMAT_OPTIONS[variant]).format(date);
}

// #endregion

// #region Calendar Date / Time

// Components expose ISO strings as v-model and convert to/from
// @internationalized/date values internally for reka-ui compatibility.

export {CalendarDate, Time};

export interface IsoRange {
    start?: string;
    end?: string;
}

export interface DateRange {
    start?: CalendarDate;
    end?: CalendarDate;
}

/** Current date as a CalendarDate — used as the default calendar placeholder. */
export function todayDate(): CalendarDate {
    return today(getLocalTimeZone());
}

/** "2026-06-14" → CalendarDate, or undefined if empty/invalid. */
export function dateFromIso(iso: string | undefined | null): CalendarDate | undefined {
    if (!iso) return undefined;
    try {
        return parseInternationalDate(iso);
    } catch {
        return undefined;
    }
}

/** CalendarDate → "2026-06-14", or empty string if absent. */
export function isoFromDate(date: CalendarDate | null | undefined): string {
    return date?.toString() ?? '';
}

/** "14:30" / "14:30:00" → Time, or undefined if empty/invalid. */
export function timeFromIso(iso: string | undefined | null): Time | undefined {
    if (!iso) return undefined;
    try {
        return parseInternationalTime(iso);
    } catch {
        return undefined;
    }
}

/**
 * Time → "14:30" (or "14:30:45" when seconds are present).
 * Strips trailing ":00" seconds so minute-granularity fields stay clean.
 */
export function isoFromTime(time: Time | null | undefined): string {
    if (!time) return '';
    const s = time.toString();
    return s.endsWith(':00') ? s.slice(0, 5) : s;
}

/** { start: "2026-06-01", end: "2026-06-07" } → { start, end } as CalendarDates. */
export function rangeFromIso(range: IsoRange | null | undefined): DateRange {
    return {start: dateFromIso(range?.start), end: dateFromIso(range?.end)};
}

/** { start, end } CalendarDates → ISO-string range. */
export function isoFromRange(range: DateRange | null | undefined): IsoRange {
    return {start: isoFromDate(range?.start), end: isoFromDate(range?.end)};
}

// #endregion
