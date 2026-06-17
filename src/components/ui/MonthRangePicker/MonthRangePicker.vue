<script setup lang="ts">
// An inline month-range grid built on reka's MonthRangePicker. v-model is { start, end } ISO date
// strings (each the chosen month's first day). Click a start then an end; the span highlights.
import { computed, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  MonthRangePickerRoot, MonthRangePickerHeader, MonthRangePickerHeading, MonthRangePickerPrev, MonthRangePickerNext,
  MonthRangePickerGrid, MonthRangePickerGridBody, MonthRangePickerGridRow, MonthRangePickerCell, MonthRangePickerCellTrigger,
} from 'reka-ui';
import type { CalendarDate } from '@internationalized/date';
import { dateFromIso, todayDate, rangeFromIso, isoFromRange } from '../Shared/date';
import type { IsoRange, DateRange } from '../Shared/date';

const props = defineProps({
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
});
const model = defineModel<IsoRange>({ default: () => ({ start: '', end: '' }) });

const value = computed<DateRange>({
  get: () => rangeFromIso(model.value),
  set: (v) => { model.value = isoFromRange(v); },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value?.start) ?? todayDate());
watch(() => model.value?.start, (s) => { const d = dateFromIso(s); if (d) placeholder.value = d; }); // jump to externally-set start
const min = computed(() => dateFromIso(props.minValue));
const max = computed(() => dateFromIso(props.maxValue));

const rangeComplete = computed(() => !!(model.value?.start && model.value?.end && model.value.start !== model.value.end));

function monthKey(date: CalendarDate): string {
  return date.toString().slice(0, 7);
}

function orderedRange(): [string, string] | undefined {
  const start = model.value?.start;
  const end = model.value?.end;
  if (!start || !end) return undefined;
  const startKey = start.slice(0, 7);
  const endKey = end.slice(0, 7);
  return startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
}

function isInCompletedRange(date: CalendarDate): boolean {
  const range = orderedRange();
  if (!range) return false;
  const key = monthKey(date);
  return key >= range[0] && key <= range[1];
}

function segmentRadius(leftOpen: boolean, rightOpen: boolean): string {
  if (leftOpen && rightOpen) return 'rounded-medium';
  if (leftOpen) return 'rounded-l-medium';
  if (rightOpen) return 'rounded-r-medium';
  return 'rounded-none';
}

// One rounding class per cell so each rendered row segment gets its own clean edges.
function roundFor(s: any, row: CalendarDate[], index: number): string {
  if (s.selected) {
    if (!rangeComplete.value) return 'rounded-medium';
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

const navBtn = 'grid size-7 cursor-pointer place-items-center rounded-medium text-muted transition-colors duration-fast hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
// Transition on the entered states only — colors fade in, but deselect (returning to base) is instant.
const cellTransition = 'hover:transition-colors hover:duration-fast data-[selected]:transition-colors data-[selected]:duration-fast data-[highlighted]:transition-colors data-[highlighted]:duration-fast';
const cellBase = `flex h-10 flex-1 cursor-pointer items-center justify-center text-sm text-foreground select-none ${cellTransition} hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[selected]:bg-foreground data-[selected]:text-background data-[highlighted]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent`;
</script>

<template>
  <MonthRangePickerRoot
    v-slot="{ grid }"
    v-model="value"
    v-model:placeholder="placeholder"
    :min-value="min"
    :max-value="max"
    :disabled="disabled"
    :readonly="readonly"
    :locale="locale"
    class="inline-block w-64 rounded-large border border-border bg-surface p-3"
  >
    <MonthRangePickerHeader class="flex items-center justify-between pb-2">
      <MonthRangePickerPrev :class="navBtn"><ChevronLeft class="size-icon-small" aria-hidden="true" /></MonthRangePickerPrev>
      <MonthRangePickerHeading class="text-sm font-medium text-foreground" />
      <MonthRangePickerNext :class="navBtn"><ChevronRight class="size-icon-small" aria-hidden="true" /></MonthRangePickerNext>
    </MonthRangePickerHeader>
    <MonthRangePickerGrid class="w-full border-collapse">
      <MonthRangePickerGridBody>
        <MonthRangePickerGridRow v-for="(row, i) in grid.rows" :key="i" class="flex">
          <MonthRangePickerCell v-for="(m, monthIndex) in row" :key="m.toString()" :date="m" class="flex-1">
            <MonthRangePickerCellTrigger :month="m" as-child v-slot="s">
              <div :class="[cellBase, roundFor(s, row, monthIndex)]">{{ s.monthValue }}</div>
            </MonthRangePickerCellTrigger>
          </MonthRangePickerCell>
        </MonthRangePickerGridRow>
      </MonthRangePickerGridBody>
    </MonthRangePickerGrid>
  </MonthRangePickerRoot>
</template>
