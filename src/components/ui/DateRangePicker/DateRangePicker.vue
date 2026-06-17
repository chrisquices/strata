<script setup lang="ts">
// A date-range picker: segmented start/end fields with a calendar button.
// Set editable=false for the compact click-only summary trigger.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { CalendarRange } from '@lucide/vue';
import { DateRangeFieldRoot, DateRangeFieldInput, PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui';
import type { CalendarDate } from '@internationalized/date';
import RangeCalendar from '../RangeCalendar/RangeCalendar.vue';
import { dateFromIso, todayDate, rangeFromIso, isoFromRange } from '../Shared/date';
import type { DateRange, IsoRange } from '../Shared/date';

const props = defineProps({
  editable: { type: Boolean, default: true },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  numberOfMonths: { type: Number, default: 2 },
  weekdayFormat: { type: String as PropType<'narrow' | 'short' | 'long'>, default: 'short', validator: (v: string) => ['narrow', 'short', 'long'].includes(v) },
  fixedWeeks: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
  placeholderText: { type: String, default: 'Pick a date range' },
  closeLabel: { type: String, default: 'date range calendar' },
});
const model = defineModel<IsoRange>({ default: () => ({ start: '', end: '' }) });

const value = computed<DateRange>({
  get: () => rangeFromIso(model.value),
  set: (v) => { model.value = isoFromRange(v); },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value?.start) ?? todayDate());
watch(() => model.value?.start, (s) => {
  const d = dateFromIso(s);
  if (d) placeholder.value = d;
});
const min = computed(() => dateFromIso(props.minValue));
const max = computed(() => dateFromIso(props.maxValue));
const label = computed(() => {
  const { start, end } = model.value ?? {};
  if (!start && !end) return props.placeholderText;
  return `${start || '…'} – ${end || '…'}`;
});
const hasValue = computed(() => !!(model.value?.start || model.value?.end));
const sizeClass = { sm: 'h-control-small px-2.5 text-xs', md: 'h-control px-3 text-sm', lg: 'h-control-large px-3.5 text-base' };
const stateClass = computed(() =>
  props.invalid
    ? 'border-destructive focus-within:ring-destructive/40 focus-visible:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30 focus-visible:border-foreground focus-visible:ring-foreground/30'
);
const segmentClass = 'rounded px-0.5 tabular-nums transition-colors focus:bg-foreground focus:text-background focus-visible:outline-none data-[placeholder]:text-faint';
</script>

<template>
  <PopoverRoot>
    <div
      v-if="editable"
      :class="[
        'inline-flex w-full items-center gap-2 rounded-medium border bg-input text-foreground transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        sizeClass[size],
        stateClass,
      ]"
      :data-disabled="disabled || undefined"
      :data-invalid="invalid || undefined"
    >
      <DateRangeFieldRoot
        v-slot="{ segments }"
        v-model="value"
        v-model:placeholder="placeholder"
        :min-value="min"
        :max-value="max"
        :disabled="disabled"
        :readonly="readonly"
        :name="name"
        :required="required"
        :locale="locale"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
        class="flex min-w-0 flex-1 items-center"
      >
        <div class="flex items-center">
          <template v-for="s in segments.start" :key="`start-${s.part}`">
            <DateRangeFieldInput v-if="s.part === 'literal'" type="start" :part="s.part" class="text-faint">{{ s.value }}</DateRangeFieldInput>
            <DateRangeFieldInput v-else type="start" :part="s.part" :class="segmentClass">{{ s.value }}</DateRangeFieldInput>
          </template>
        </div>
        <span class="px-1.5 text-faint" aria-hidden="true">–</span>
        <div class="flex items-center">
          <template v-for="e in segments.end" :key="`end-${e.part}`">
            <DateRangeFieldInput v-if="e.part === 'literal'" type="end" :part="e.part" class="text-faint">{{ e.value }}</DateRangeFieldInput>
            <DateRangeFieldInput v-else type="end" :part="e.part" :class="segmentClass">{{ e.value }}</DateRangeFieldInput>
          </template>
        </div>
      </DateRangeFieldRoot>
      <PopoverTrigger as-child>
        <button
          type="button"
          :disabled="disabled"
          aria-label="Open range calendar"
          class="grid size-6 shrink-0 place-items-center rounded text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarRange class="size-icon-small" aria-hidden="true" />
        </button>
      </PopoverTrigger>
    </div>
    <PopoverTrigger
      v-else
      :disabled="disabled"
      :aria-label="label"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :data-invalid="invalid || undefined"
      :class="[
        'group inline-flex w-full items-center justify-between gap-2 rounded-medium border bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass[size],
        stateClass,
      ]"
    >
      <span :class="['truncate', hasValue ? 'text-foreground' : 'text-faint']">{{ label }}</span>
      <CalendarRange class="size-icon-small shrink-0 text-muted" aria-hidden="true" />
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        :aria-label="closeLabel"
        class="strata-menu-pop z-popover max-w-[calc(100vw-2rem)] overflow-x-auto rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <RangeCalendar
          v-model="model"
          :min-value="minValue"
          :max-value="maxValue"
          :number-of-months="numberOfMonths"
          :weekday-format="weekdayFormat"
          :fixed-weeks="fixedWeeks"
          :disabled="disabled"
          :readonly="readonly"
          :required="required"
          :locale="locale"
          class="border-0 bg-transparent"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
