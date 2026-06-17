<script setup lang="ts">
// A range calendar built on reka's RangeCalendar. v-model is { start, end } ISO date strings.
// Click a start then an end; reka highlights the in-progress range and enforces min/max.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  RangeCalendarRoot, RangeCalendarHeader, RangeCalendarHeading, RangeCalendarPrev, RangeCalendarNext,
  RangeCalendarGrid, RangeCalendarGridHead, RangeCalendarGridBody, RangeCalendarGridRow, RangeCalendarHeadCell,
  RangeCalendarCell, RangeCalendarCellTrigger,
} from 'reka-ui';
import type { CalendarDate } from '../Shared/utils';
import { dateFromIso, todayDate, rangeFromIso, isoFromRange } from '../Shared/utils';
import type { IsoRange, DateRange } from '../Shared/utils';

const props = defineProps({
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  numberOfMonths: { type: Number, default: 2 },
  weekdayFormat: { type: String as PropType<'narrow' | 'short' | 'long'>, default: 'short', validator: (v: string) => ['narrow', 'short', 'long'].includes(v) },
  fixedWeeks: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
});
const model = defineModel<IsoRange>({ default: () => ({ start: '', end: '' }) });

const value = computed<DateRange>({
  get: () => rangeFromIso(model.value),
  set: (v) => { model.value = isoFromRange(v); },
});
// Stays writable for prev/next nav (v-model:placeholder); synced when the range is set externally
// so the calendar jumps to the new start month. (A computed here would break navigation.)
const placeholder = ref<CalendarDate>(dateFromIso(model.value?.start) ?? todayDate());
watch(() => model.value?.start, (s) => { const d = dateFromIso(s); if (d) placeholder.value = d; });
const min = computed(() => dateFromIso(props.minValue));
const max = computed(() => dateFromIso(props.maxValue));

// A range is "complete" once both ends are set. Completed ranges are shaped by the
// rendered row, so wrapped ranges become clean row segments.
const rangeComplete = computed(() => !!(model.value?.start && model.value?.end && model.value.start !== model.value.end));

// Shape of the slot scope reka exposes on RangeCalendarCellTrigger (the bits we style on).
interface CellState {
  dayValue: string;
  highlighted: boolean;
  highlightedStart: boolean;
  highlightedEnd: boolean;
  selected: boolean;
  selectionStart: boolean;
  selectionEnd: boolean;
}

function orderedRange(): [string, string] | undefined {
  const start = model.value?.start;
  const end = model.value?.end;
  if (!start || !end) return undefined;
  return start <= end ? [start, end] : [end, start];
}

function isInCompletedRange(date: CalendarDate): boolean {
  const range = orderedRange();
  if (!range) return false;
  const key = date.toString();
  return key >= range[0] && key <= range[1];
}

function segmentRadius(leftOpen: boolean, rightOpen: boolean): string {
  if (leftOpen && rightOpen) return 'rounded-medium';
  if (leftOpen) return 'rounded-l-medium';
  if (rightOpen) return 'rounded-r-medium';
  return 'rounded-none';
}

// Exactly ONE rounding class per cell so each rendered row segment gets its own clean edges.
function roundFor(s: CellState, row: CalendarDate[], index: number): string {
  if (s.selected) {
    if (!rangeComplete.value) return 'rounded-medium'; // lone selected day = single
  }
  if (rangeComplete.value && isInCompletedRange(row[index])) {
    const leftOpen = index === 0 || !isInCompletedRange(row[index - 1]);
    const rightOpen = index === row.length - 1 || !isInCompletedRange(row[index + 1]);
    return segmentRadius(leftOpen, rightOpen);
  }
  if (s.highlightedStart && s.highlightedEnd) return 'rounded-medium';
  if (s.highlightedStart) return 'rounded-l-medium';
  if (s.highlightedEnd) return 'rounded-r-medium';
  if (s.highlighted) return 'rounded-none';
  return 'rounded-none';
}

const navBtn = 'grid size-7 place-items-center rounded-medium text-muted transition-colors duration-fast hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
// The color transition lives on the ACTIVE states (hover/selected/highlighted), not the base — CSS
// reads transitions from the state being entered, so colors fade IN smoothly but returning to base
// (deselect) is instant. That kills the deselect fade-out where the radius snapped back (artifact).
const cellTransition = 'hover:transition-colors hover:duration-fast data-[selected]:transition-colors data-[selected]:duration-fast data-[highlighted]:transition-colors data-[highlighted]:duration-fast';
const cellBase = `relative grid size-9 cursor-default place-items-center text-sm text-foreground tabular-nums select-none ${cellTransition} hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[today]:ring-1 data-[today]:ring-border data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:ring-0 data-[highlighted]:bg-border data-[outside-view]:text-faint/50 data-[unavailable]:text-faint data-[unavailable]:line-through data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent`;
</script>

<template>
  <RangeCalendarRoot
    v-slot="{ grid, weekDays }"
    v-model="value"
    v-model:placeholder="placeholder"
    :min-value="min"
    :max-value="max"
    :number-of-months="numberOfMonths"
    :weekday-format="weekdayFormat"
    :fixed-weeks="fixedWeeks"
    :disabled="disabled"
    :readonly="readonly"
    :required="required"
    :locale="locale"
    class="inline-block rounded-large border border-border bg-surface p-3"
  >
    <RangeCalendarHeader class="flex items-center justify-between pb-2">
      <RangeCalendarPrev :class="navBtn"><ChevronLeft class="size-icon-small" aria-hidden="true" /></RangeCalendarPrev>
      <RangeCalendarHeading class="text-sm font-medium text-foreground" />
      <RangeCalendarNext :class="navBtn"><ChevronRight class="size-icon-small" aria-hidden="true" /></RangeCalendarNext>
    </RangeCalendarHeader>
    <div class="flex flex-wrap gap-4">
      <RangeCalendarGrid v-for="month in grid" :key="month.value.toString()" class="border-collapse">
        <RangeCalendarGridHead>
          <RangeCalendarGridRow class="flex">
            <RangeCalendarHeadCell v-for="day in weekDays" :key="day" class="grid size-9 place-items-center text-xs font-normal text-faint">{{ day }}</RangeCalendarHeadCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridHead>
        <RangeCalendarGridBody>
          <RangeCalendarGridRow v-for="(week, i) in month.rows" :key="i" class="flex">
            <RangeCalendarCell v-for="(d, dayIndex) in week" :key="d.toString()" :date="d">
              <RangeCalendarCellTrigger :day="d" :month="month.value" as-child v-slot="s">
                <div :class="[cellBase, roundFor(s, week, dayIndex)]">{{ s.dayValue }}</div>
              </RangeCalendarCellTrigger>
            </RangeCalendarCell>
          </RangeCalendarGridRow>
        </RangeCalendarGridBody>
      </RangeCalendarGrid>
    </div>
  </RangeCalendarRoot>
</template>
