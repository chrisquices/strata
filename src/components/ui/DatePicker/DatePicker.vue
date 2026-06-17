<script setup lang="ts">
// A date picker built on reka's DatePicker: an editable segmented field + a popover month calendar.
// v-model is an ISO date string ("2026-06-14"). Type into the segments or pick from the calendar —
// both drive the same value. (The calendar is the kit's own Calendar, kept in sync via the model.)
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { CalendarDays } from '@lucide/vue';
import { DatePickerRoot, DatePickerField, DatePickerInput, DatePickerTrigger, DatePickerContent, DatePickerArrow } from 'reka-ui';
import type { CalendarDate } from '../Shared/utils';
import { dateFromIso, todayDate } from '../Shared/utils';
import Calendar from '../Calendar/Calendar.vue';

const props = defineProps({
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
});
const model = defineModel<string>({ default: '' });
const open = ref(false);

const value = computed<CalendarDate | undefined>({
  get: () => dateFromIso(model.value),
  set: (v) => { model.value = v ? v.toString() : ''; },
});
const placeholder = ref<CalendarDate>(dateFromIso(model.value) ?? todayDate());

watch(model, (v) => {
  const d = dateFromIso(v);
  if (d) placeholder.value = d; // keep the field's month in step with an externally-set value
  if (v) open.value = false;    // close once a date is committed (guard so clearing a segment doesn't)
});

const sizeClass = { sm: 'h-control-small px-2.5 text-xs', md: 'h-control px-3 text-sm', lg: 'h-control-large px-3.5 text-base' };
const stateClass = computed(() =>
  props.invalid
    ? 'border-destructive focus-within:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30'
);
</script>

<template>
  <DatePickerRoot
    v-model="value"
    v-model:placeholder="placeholder"
    v-model:open="open"
    :min-value="dateFromIso(minValue)"
    :max-value="dateFromIso(maxValue)"
    :disabled="disabled"
    :readonly="readonly"
    :name="name"
    :required="required"
    :locale="locale"
  >
    <div
      :class="[
        'group inline-flex w-full items-center gap-1 rounded-medium border bg-input text-foreground transition-colors focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:opacity-50',
        sizeClass[size],
        stateClass,
      ]"
      :data-invalid="invalid || undefined"
    >
      <DatePickerField
        v-slot="{ segments }"
        class="flex flex-1 items-center"
        :aria-invalid="invalid || undefined"
        :aria-describedby="describedBy"
      >
        <template v-for="(seg, i) in segments" :key="i">
          <DatePickerInput v-if="seg.part === 'literal'" :part="seg.part" class="text-faint">{{ seg.value }}</DatePickerInput>
          <DatePickerInput v-else :part="seg.part" class="rounded px-0.5 tabular-nums transition-colors focus:bg-foreground focus:text-background focus-visible:outline-none data-[placeholder]:text-faint">{{ seg.value }}</DatePickerInput>
        </template>
      </DatePickerField>
      <DatePickerTrigger aria-label="Open calendar" class="grid size-6 shrink-0 place-items-center rounded text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40">
        <CalendarDays class="size-icon-small" aria-hidden="true" />
      </DatePickerTrigger>
    </div>

    <DatePickerContent
      :side-offset="6"
      class="strata-ui-menu-pop z-popover rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
    >
      <DatePickerArrow class="fill-surface stroke-border" />
      <Calendar v-model="model" :min-value="minValue" :max-value="maxValue" :disabled="disabled" :readonly="readonly" :locale="locale" class="border-0 bg-transparent" />
    </DatePickerContent>
  </DatePickerRoot>
</template>
