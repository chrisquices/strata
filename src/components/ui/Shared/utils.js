// Shared formatting helpers for the Strata kit.
//
// FORMATTING ONLY. These functions take a value and return a display string —
// no DOM, no component state, no side effects. The FileSize and RelativeTime
// components render the markup; everything that decides the *text* lives here
// so a byte count or a timestamp reads identically everywhere it appears.
//
// PORT: plain ESM module — copy verbatim into $lib/utils. Uses only built-in
// Intl APIs, so there is no dependency to add on the production stack.

// ---------------------------------------------------------------------------
// File size
// ---------------------------------------------------------------------------
// Binary scale (1024), matching how file managers report on-disk size.

const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/**
 * Format a byte count.
 *   'short'    (default) → "2.4 MB"           — one trimmed decimal, spaced unit
 *   'compact'            → "2.4M"             — no space, single-letter unit
 *   'detailed'           → "2,576,384 bytes"  — exact, digit-grouped
 */
export function formatFileSize(bytes, variant = 'short') {
  const number = Number(bytes);
  if (!Number.isFinite(number) || number < 0) return '';

  if (variant === 'detailed') {
    const whole = Math.round(number);
    return `${whole.toLocaleString()} ${whole === 1 ? 'byte' : 'bytes'}`;
  }

  let unitIndex = 0;
  let scaled = number;
  while (scaled >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  // Bytes are always whole; larger units carry up to one decimal, trimmed.
  const rounded = unitIndex === 0 ? Math.round(scaled) : Math.round(scaled * 10) / 10;
  const unit = FILE_SIZE_UNITS[unitIndex];

  if (variant === 'compact') {
    return `${rounded}${unit === 'B' ? 'B' : unit[0]}`;
  }
  return `${rounded} ${unit}`;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------
// Accepts a Date, an epoch-milliseconds number, or an ISO string.

function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Machine-readable ISO string for a <time datetime="…"> attribute. */
export function toIsoString(value) {
  const date = toDate(value);
  return date ? date.toISOString() : '';
}

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

// Each step: format anything below `limit` seconds in `unit`, dividing by
// `divisor` to convert. Ordered smallest to largest.
const RELATIVE_THRESHOLDS = [
  { limit: 60,       divisor: 1,        unit: 'second' },
  { limit: 3600,     divisor: 60,       unit: 'minute' },
  { limit: 86400,    divisor: 3600,     unit: 'hour'   },
  { limit: 604800,   divisor: 86400,    unit: 'day'    },
  { limit: 2629800,  divisor: 604800,   unit: 'week'   },
  { limit: 31557600, divisor: 2629800,  unit: 'month'  },
  { limit: Infinity, divisor: 31557600, unit: 'year'   },
];

function formatRelative(date, now) {
  const seconds = (date.getTime() - now.getTime()) / 1000;
  if (Math.abs(seconds) < 45) return relativeFormatter.format(0, 'second'); // "now"
  for (const threshold of RELATIVE_THRESHOLDS) {
    if (Math.abs(seconds) < threshold.limit) {
      return relativeFormatter.format(Math.round(seconds / threshold.divisor), threshold.unit);
    }
  }
  return '';
}

/**
 * Format a timestamp.
 *   'relative' (default) → "2 hours ago" / "in 3 days" / "now"
 *   'date'               → "May 31, 2026"
 *   'datetime'           → "May 31, 2026, 2:41 PM"
 *   'time'               → "2:41 PM"
 */
export function formatTime(value, variant = 'relative', now = new Date()) {
  const date = toDate(value);
  if (!date) return '';
  if (variant === 'relative') return formatRelative(date, now);

  const options =
    variant === 'date' ? { year: 'numeric', month: 'short', day: 'numeric' }
    : variant === 'time' ? { hour: 'numeric', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };

  return new Intl.DateTimeFormat(undefined, options).format(date);
}
