<script setup lang="ts">
// A year picker built on reka's YearPicker. v-model is an ISO date string
// (the chosen year, e.g. "2026-01-01"). The input-like trigger opens a popover grid.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/vue';
import {
  YearPickerRoot, YearPickerHeader, YearPickerHeading, YearPickerPrev, YearPickerNext,
  YearPickerGrid, YearPickerGridBody, YearPickerGridRow, YearPickerCell, YearPickerCellTrigger,
  PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent,
} from 'reka-ui';
import type { CalendarDate } from '../Shared/utils';
import { dateFromIso, todayDate } from '../Shared/utils';

const props = defineProps({
  clickable: { type: Boolean, default: false },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  yearsPerPage: { type: Number, default: 12 },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
  placeholderText: { type: String, default: 'Pick a year' },
  closeLabel: { type: String, default: 'year picker' },
});
const model = defineModel<string>({ default: '' });
const open = ref(false);

const value = computed<CalendarDate | undefined>({
  get: () => dateFromIso(model.value),
  set: (v) => {
    model.value = v ? v.toString() : '';
    if (v) open.value = false;
  },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value) ?? todayDate());
watch(model, (v) => {
  const d = dateFromIso(v);
  if (d) {
    placeholder.value = d; // jump to externally-set value
  }
});
const min = computed(() => dateFromIso(props.minValue));
const max = computed(() => dateFromIso(props.maxValue));

const label = computed(() => {
  const d = dateFromIso(model.value);
  return d ? String(d.year) : props.placeholderText;
});
const hasValue = computed(() => !!dateFromIso(model.value));
const sizeClass = { sm: 'h-control-small px-2.5 text-xs', md: 'h-control px-3 text-sm', lg: 'h-control-large px-3.5 text-base' };
const stateClass = computed(() =>
  props.invalid
    ? 'border-destructive focus-within:ring-destructive/40 focus-visible:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30 focus-visible:border-foreground focus-visible:ring-foreground/30'
);
const navBtn = 'grid size-7 cursor-pointer place-items-center rounded-medium text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
const cellTrigger = 'flex h-10 flex-1 cursor-pointer items-center justify-center rounded-medium text-sm tabular-nums text-foreground transition-colors duration-100 select-none hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[today]:ring-1 data-[today]:ring-border data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:ring-0 data-[selected]:hover:bg-foreground data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent';
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger
      v-if="clickable"
      :disabled="disabled"
      :aria-label="label"
      :aria-invalid="invalid || undefined"
      :aria-describedby="describedBy"
      :data-invalid="invalid || undefined"
      :class="[
        'group inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-medium border bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass[size],
        stateClass,
      ]"
    >
      <span :class="['truncate', hasValue ? 'text-foreground' : 'text-faint']">{{ label }}</span>
      <CalendarDays class="size-icon-small shrink-0 text-muted transition-colors group-hover:text-foreground" aria-hidden="true" />
    </PopoverTrigger>
    <div
      v-else
      :class="[
        'group inline-flex w-full items-center gap-2 rounded-medium border bg-input text-foreground transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        sizeClass[size],
        stateClass,
      ]"
      :data-disabled="disabled || undefined"
      :data-invalid="invalid || undefined"
    >
      <span
        :class="['min-w-0 flex-1 truncate', hasValue ? 'text-foreground' : 'text-faint']"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
      >
        {{ label }}
      </span>
      <PopoverTrigger as-child>
        <button
          type="button"
          :disabled="disabled"
          aria-label="Open year picker"
          class="grid size-6 shrink-0 cursor-pointer place-items-center rounded text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarDays class="size-icon-small" aria-hidden="true" />
        </button>
      </PopoverTrigger>
    </div>
    <input v-if="name" type="hidden" :name="name" :value="model" />

    <PopoverPortal>
      <PopoverContent
        :side-offset="6"
        :aria-label="closeLabel"
        class="strata-menu-pop z-popover rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <YearPickerRoot
          v-slot="{ grid }"
          v-model="value"
          v-model:placeholder="placeholder"
          :min-value="min"
          :max-value="max"
          :years-per-page="yearsPerPage"
          :disabled="disabled"
          :readonly="readonly"
          :locale="locale"
          class="inline-block w-64 border-0 bg-transparent p-3"
        >
          <YearPickerHeader class="flex items-center justify-between pb-2">
            <YearPickerPrev :class="navBtn"><ChevronLeft class="size-icon-small" aria-hidden="true" /></YearPickerPrev>
            <YearPickerHeading class="text-sm font-medium text-foreground" />
            <YearPickerNext :class="navBtn"><ChevronRight class="size-icon-small" aria-hidden="true" /></YearPickerNext>
          </YearPickerHeader>
          <YearPickerGrid class="w-full border-collapse">
            <YearPickerGridBody>
              <YearPickerGridRow v-for="(row, i) in grid.rows" :key="i" class="flex gap-1">
                <YearPickerCell v-for="y in row" :key="y.toString()" :date="y" class="flex-1">
                  <YearPickerCellTrigger v-slot="{ yearValue }" :year="y" :class="cellTrigger">{{ yearValue }}</YearPickerCellTrigger>
                </YearPickerCell>
              </YearPickerGridRow>
            </YearPickerGridBody>
          </YearPickerGrid>
        </YearPickerRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
