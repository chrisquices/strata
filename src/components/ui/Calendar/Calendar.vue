<script setup lang="ts">
// A month calendar built on reka's Calendar. v-model is an ISO date string ("2026-06-14"); reka's
// DateValue plumbing is handled internally. Arrow keys move days, PageUp/Down change months, and
// the grid is fully ARIA-labelled. Set min/max (ISO strings) to bound selection.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  CalendarRoot, CalendarHeader, CalendarHeading, CalendarPrev, CalendarNext,
  CalendarGrid, CalendarGridHead, CalendarGridBody, CalendarGridRow, CalendarHeadCell,
  CalendarCell, CalendarCellTrigger,
} from 'reka-ui';
import type { CalendarDate } from '../Shared/utils';
import { dateFromIso, todayDate } from '../Shared/utils';

const props = defineProps({
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  numberOfMonths: { type: Number, default: 1 },
  weekdayFormat: { type: String as PropType<'narrow' | 'short' | 'long'>, default: 'short', validator: (v: string) => ['narrow', 'short', 'long'].includes(v) },
  fixedWeeks: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
});
const model = defineModel<string>({ default: '' });

const value = computed<CalendarDate | undefined>({
  get: () => dateFromIso(model.value),
  set: (v) => { model.value = v ? v.toString() : ''; },
});
// `placeholder` drives the visible month and stays writable (prev/next nav writes to it via
// v-model:placeholder). Keep it a ref — but sync it when the value is set programmatically from
// outside so the calendar jumps to the new month. (A computed here would break navigation.)
const placeholder = ref<CalendarDate>(dateFromIso(model.value) ?? todayDate());
watch(model, (v) => { const d = dateFromIso(v); if (d) placeholder.value = d; });
const min = computed(() => dateFromIso(props.minValue));
const max = computed(() => dateFromIso(props.maxValue));

const navBtn = 'grid size-7 place-items-center rounded-medium text-muted transition-colors duration-fast hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
const cellTrigger = 'relative grid size-9 cursor-default place-items-center rounded-medium text-sm text-foreground tabular-nums transition-colors duration-fast select-none hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[today]:ring-1 data-[today]:ring-border data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:ring-0 data-[selected]:hover:bg-foreground data-[outside-view]:text-faint/50 data-[unavailable]:text-faint data-[unavailable]:line-through data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent';
</script>

<template>
  <CalendarRoot
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
    :locale="locale"
    class="inline-block rounded-large border border-border bg-surface p-3"
  >
    <CalendarHeader class="flex items-center justify-between pb-2">
      <CalendarPrev :class="navBtn"><ChevronLeft class="size-icon-small" aria-hidden="true" /></CalendarPrev>
      <CalendarHeading class="text-sm font-medium text-foreground" />
      <CalendarNext :class="navBtn"><ChevronRight class="size-icon-small" aria-hidden="true" /></CalendarNext>
    </CalendarHeader>
    <div class="flex flex-wrap gap-4">
      <CalendarGrid v-for="month in grid" :key="month.value.toString()" class="border-collapse">
        <CalendarGridHead>
          <CalendarGridRow class="flex">
            <CalendarHeadCell v-for="day in weekDays" :key="day" class="grid size-9 place-items-center text-xs font-normal text-faint">{{ day }}</CalendarHeadCell>
          </CalendarGridRow>
        </CalendarGridHead>
        <CalendarGridBody>
          <CalendarGridRow v-for="(week, i) in month.rows" :key="i" class="flex">
            <CalendarCell v-for="d in week" :key="d.toString()" :date="d">
              <CalendarCellTrigger v-slot="{ dayValue }" :day="d" :month="month.value" :class="cellTrigger">{{ dayValue }}</CalendarCellTrigger>
            </CalendarCell>
          </CalendarGridRow>
        </CalendarGridBody>
      </CalendarGrid>
    </div>
  </CalendarRoot>
</template>
