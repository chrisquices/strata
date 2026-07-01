<script setup lang="ts">
// An inline month-range grid built on reka's MonthRangePicker. v-model is { start, end } ISO date
// strings (each the chosen month's first day). Click a start then an end; the span highlights.
import { computed, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  MonthRangePickerRoot, MonthRangePickerHeader, MonthRangePickerHeading, MonthRangePickerPrev, MonthRangePickerNext,
  MonthRangePickerGrid, MonthRangePickerGridBody, MonthRangePickerGridRow, MonthRangePickerCell, MonthRangePickerCellTrigger,
} from 'reka-ui';
import type { CalendarDate } from '../Shared/utils';
import { dateFromIso, todayDate, rangeFromIso, isoFromRange } from '../Shared/utils';
import type { IsoRange, DateRange } from '../Shared/utils';

const props = defineProps({
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
});
const model = defineModel<IsoRange>({ default: function () { return { start: '', end: '' }; } });

const value = computed<DateRange>({
  get: function () { return rangeFromIso(model.value); },
  set: function (range) { model.value = isoFromRange(range); },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value?.start) ?? todayDate());
watch(function () { return model.value?.start; }, function (start) { const date = dateFromIso(start); if (date) placeholder.value = date; }); // jump to externally-set start
const min = computed(function () { return dateFromIso(props.minValue); });
const max = computed(function () { return dateFromIso(props.maxValue); });

const rangeComplete = computed(function () { return !!(model.value?.start && model.value?.end && model.value.start !== model.value.end); });

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
function roundFor(scope: any, row: CalendarDate[], index: number): string {
  if (scope.selected) {
    if (!rangeComplete.value) return 'rounded-medium';
  }
  if (rangeComplete.value && isInCompletedRange(row[index])) {
    const leftOpen = index === 0 || !isInCompletedRange(row[index - 1]);
    const rightOpen = index === row.length - 1 || !isInCompletedRange(row[index + 1]);
    return segmentRadius(leftOpen, rightOpen);
  }
  if (scope.highlightedStart && scope.highlightedEnd) return 'rounded-medium';
  if (scope.highlightedStart) return 'rounded-l-medium';
  if (scope.highlightedEnd) return 'rounded-r-medium';
  if (scope.highlighted) return 'rounded-none';
  return 'rounded-none';
}

const navigationButton = 'grid size-control-small cursor-pointer place-items-center rounded-medium text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
// Transition on the entered states only — colors fade in, but deselect (returning to base) is instant.
const cellTransition = 'hover:transition-colors hover:duration-100 data-[selected]:transition-colors data-[selected]:duration-100 data-[highlighted]:transition-colors data-[highlighted]:duration-100';
const cellBase = `flex h-control-large flex-1 cursor-pointer items-center justify-center text-sm text-foreground select-none ${cellTransition} hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[selected]:bg-foreground data-[selected]:text-background data-[highlighted]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent`;
</script>

<template>
  <MonthRangePickerRoot
    v-slot="{ grid }"
    v-model="value"
    v-model:placeholder="placeholder"
    :min-value="min"
    :max-value="max"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :locale="props.locale"
    class="inline-block w-64 rounded-large border border-border bg-surface p-surface-small"
  >
    <MonthRangePickerHeader class="flex items-center justify-between pb-2">
      <MonthRangePickerPrev :class="navigationButton"><ChevronLeft class="size-icon-small" aria-hidden="true" /></MonthRangePickerPrev>
      <MonthRangePickerHeading class="text-sm font-medium text-foreground" />
      <MonthRangePickerNext :class="navigationButton"><ChevronRight class="size-icon-small" aria-hidden="true" /></MonthRangePickerNext>
    </MonthRangePickerHeader>
    <MonthRangePickerGrid class="w-full border-collapse">
      <MonthRangePickerGridBody>
        <MonthRangePickerGridRow v-for="(row, index) in grid.rows" :key="index" class="flex">
          <MonthRangePickerCell v-for="(month, monthIndex) in row" :key="month.toString()" :date="month" class="flex-1">
            <MonthRangePickerCellTrigger :month="month" as-child v-slot="scope">
              <div :class="[cellBase, roundFor(scope, row, monthIndex)]">{{ scope.monthValue }}</div>
            </MonthRangePickerCellTrigger>
          </MonthRangePickerCell>
        </MonthRangePickerGridRow>
      </MonthRangePickerGridBody>
    </MonthRangePickerGrid>
  </MonthRangePickerRoot>
</template>
