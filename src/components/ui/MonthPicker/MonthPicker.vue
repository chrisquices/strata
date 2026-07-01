<script lang="ts">
// Module-scoped counter for unique error-message ids (aria-describedby targets).
let uid = 0;
</script>

<script setup lang="ts">
// A month picker built on reka's MonthPicker. v-model is an ISO date string
// (the chosen month's first day, e.g. "2026-06-01"). The input-like trigger opens a popover grid.
import {computed, ref, watch, useSlots} from 'vue';
import type {PropType} from 'vue';
import {CalendarDays, ChevronLeft, ChevronRight} from '@lucide/vue';
import {
  MonthPickerRoot, MonthPickerHeader, MonthPickerHeading, MonthPickerPrev, MonthPickerNext,
  MonthPickerGrid, MonthPickerGridBody, MonthPickerGridRow, MonthPickerCell, MonthPickerCellTrigger,
  PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent,
} from 'reka-ui';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';
import type {CalendarDate} from '../Shared/utils';
import {dateFromIso, todayDate} from '../Shared/utils';

const props = defineProps({
  clickable: {type: Boolean, default: false},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  minValue: {type: String, default: undefined},
  maxValue: {type: String, default: undefined},
  disabled: {type: Boolean, default: false},
  readonly: {type: Boolean, default: false},
  invalid: {type: Boolean, default: false},
  describedBy: {type: String, default: undefined},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  locale: {type: String, default: undefined},
  popoverLabel: {type: String, default: 'month picker'},
});
const model = defineModel<string>({default: ''});
const open = ref(false);
const slots = useSlots();

function extractText(vnodes: any[]): string {
  let text = '';
  for (let index = 0; index < vnodes.length; index++) {
    const vnode = vnodes[index];
    if (typeof vnode.children === 'string') {
      text += vnode.children;
    } else if (Array.isArray(vnode.children)) {
      text += extractText(vnode.children);
    }
  }
  return text;
}

const errorText = computed(function () {
  if (!slots.default) return '';
  return extractText(slots.default()).trim();
});
const isInvalid = computed(function () {
  return props.invalid || !!errorText.value;
});

// Link the error message to the trigger for screen readers, preserving any caller-supplied describedBy.
const errorId = `strata-month-picker-error-${++uid}`;
const describedById = computed(function () {
  const ids: string[] = [];
  if (props.describedBy) ids.push(props.describedBy);
  if (errorText.value) ids.push(errorId);
  return ids.length ? ids.join(' ') : undefined;
});

const value = computed<CalendarDate | undefined>({
  get: function () {
    return dateFromIso(model.value);
  },
  set: function (date) {
    model.value = date ? date.toString() : '';
    if (date) open.value = false;
  },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value) ?? todayDate());
watch(model, function (iso) {
  const date = dateFromIso(iso);
  if (date) {
    placeholder.value = date; // jump to externally-set value
  }
});
const min = computed(function () {
  return dateFromIso(props.minValue);
});
const max = computed(function () {
  return dateFromIso(props.maxValue);
});

const monthFormatter = computed(function () {
  return new Intl.DateTimeFormat(props.locale || undefined, {month: 'long', year: 'numeric'});
});
const label = computed(function () {
  const date = dateFromIso(model.value);
  if (!date) return '';
  return monthFormatter.value.format(new Date(date.year, date.month - 1, 1));
});
const hasValue = computed(function () {
  return !!dateFromIso(model.value);
});
const sizeClass = {
  sm: 'h-control-small px-control-x-small text-xs',
  md: 'h-control px-control-x text-sm',
  lg: 'h-control-large px-control-x-large text-base'
};
const triggerSizeClass = {sm: 'size-5', md: 'size-6', lg: 'size-7'};
const stateClass = computed(function () {
  return isInvalid.value ? 'border-destructive focus-within:ring-destructive/40 focus-visible:ring-destructive/40' : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30 focus-visible:border-foreground focus-visible:ring-foreground/30';
});
const navigationButton = 'grid size-control-small cursor-pointer place-items-center rounded-medium text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[disabled]:pointer-events-none data-[disabled]:opacity-40';
const cellTrigger = 'flex h-control-large flex-1 cursor-pointer items-center justify-center rounded-medium text-sm text-foreground transition-colors duration-100 select-none hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[today]:font-semibold data-[today]:ring-1 data-[today]:ring-border data-[selected]:bg-foreground data-[selected]:text-background data-[selected]:ring-0 data-[selected]:hover:bg-foreground data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-40 data-[disabled]:hover:bg-transparent';
</script>

<template>
  <PopoverRoot v-model:open="open">
    <FieldErrorTooltip :id="errorId" :message="errorText">
      <PopoverTrigger
          v-if="props.clickable"
          :disabled="props.disabled"
          :aria-label="hasValue ? label : 'Open month picker'"
          :aria-invalid="isInvalid || undefined"
          :aria-describedby="describedById"
          :data-invalid="isInvalid || undefined"
          :class="[
          'group inline-flex w-full cursor-pointer items-center justify-between gap-cluster-small rounded-medium border bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          sizeClass[props.size],
          stateClass,
        ]"
      >
        <span :class="['truncate', hasValue ? 'text-foreground' : 'text-faint']">
          <template v-if="hasValue">
            {{ label }}
          </template>
          <template v-else>
            Pick a month
          </template>
        </span>
        <CalendarDays class="size-icon-small shrink-0 text-muted transition-colors group-hover:text-foreground"
                      aria-hidden="true"/>
      </PopoverTrigger>
      <div
          v-else
          :class="[
          'group inline-flex w-full items-center gap-cluster-small rounded-medium border bg-input text-foreground transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          sizeClass[props.size],
          stateClass,
        ]"
          :data-disabled="props.disabled || undefined"
          :data-invalid="isInvalid || undefined"
      >
        <span :class="['min-w-0 flex-1 truncate', hasValue ? 'text-foreground' : 'text-faint']">
          <template v-if="hasValue">
            {{ label }}
          </template>
          <template v-else>
            Pick a month
          </template>
        </span>
        <PopoverTrigger as-child>
          <button
              type="button"
              :disabled="props.disabled"
              :aria-invalid="isInvalid || undefined"
              :aria-describedby="describedById"
              aria-label="Open month picker"
              :class="['grid shrink-0 cursor-pointer place-items-center rounded-small text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 disabled:cursor-not-allowed disabled:opacity-50', triggerSizeClass[props.size]]"
          >
            <CalendarDays class="size-icon-small" aria-hidden="true"/>
          </button>
        </PopoverTrigger>
      </div>
    </FieldErrorTooltip>
    <input v-if="props.name" type="hidden" :name="props.name" :value="model"/>

    <PopoverPortal>
      <PopoverContent
          :side-offset="6"
          :aria-label="props.popoverLabel"
          class="strata-menu-pop z-popover rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <MonthPickerRoot
            v-slot="{ grid }"
            v-model="value"
            v-model:placeholder="placeholder"
            :min-value="min"
            :max-value="max"
            :disabled="props.disabled"
            :readonly="props.readonly"
            :locale="props.locale"
            class="inline-block w-64 border-0 bg-transparent p-surface-small"
        >
          <MonthPickerHeader class="flex items-center justify-between pb-2">
            <MonthPickerPrev :class="navigationButton">
              <ChevronLeft class="size-icon-small" aria-hidden="true"/>
            </MonthPickerPrev>
            <MonthPickerHeading class="text-sm font-medium text-foreground"/>
            <MonthPickerNext :class="navigationButton">
              <ChevronRight class="size-icon-small" aria-hidden="true"/>
            </MonthPickerNext>
          </MonthPickerHeader>
          <MonthPickerGrid class="w-full border-collapse">
            <MonthPickerGridBody>
              <MonthPickerGridRow v-for="(row, index) in grid.rows" :key="index" class="flex gap-cluster-small">
                <MonthPickerCell v-for="month in row" :key="month.toString()" :date="month" class="flex-1">
                  <MonthPickerCellTrigger v-slot="{ monthValue }" :month="month" :class="cellTrigger">{{
                      monthValue
                    }}
                  </MonthPickerCellTrigger>
                </MonthPickerCell>
              </MonthPickerGridRow>
            </MonthPickerGridBody>
          </MonthPickerGrid>
        </MonthPickerRoot>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
