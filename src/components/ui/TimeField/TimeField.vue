<script setup lang="ts">
// A segmented time input built on reka's TimeField. v-model is an ISO time string ("14:30").
// Each segment (hour/minute/AM-PM) is an independent spinbutton — arrows adjust, type to enter.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { Time, timeFromIso, isoFromTime } from '../Shared/utils';

const props = defineProps({
  hourCycle: { type: Number as PropType<12 | 24>, default: undefined, validator: function (value) { return value === 12 || value === 24; } },
  granularity: { type: String as PropType<'hour' | 'minute' | 'second'>, default: 'minute', validator: function (value) { return ['hour', 'minute', 'second'].includes(value); } },
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: function (value) { return ['sm', 'md', 'lg'].includes(value); } },
  fullWidth: { type: Boolean, default: false },
});
const model = defineModel<string>({ default: '' });

const value = computed<Time | undefined>({
  get: function () { return timeFromIso(model.value); },
  set: function (time) { model.value = isoFromTime(time); },
});
const placeholder = ref<Time>(timeFromIso(model.value) ?? new Time(0, 0));

// Jump the visible segments to an externally-set value.
watch(model, function (iso) { const time = timeFromIso(iso); if (time) placeholder.value = time; });
const min = computed(function () { return timeFromIso(props.minValue); });
const max = computed(function () { return timeFromIso(props.maxValue); });

const ROOT_HEIGHT = { sm: 'h-control-small text-xs', md: 'h-control text-sm', lg: 'h-control-large text-base' };
const stateClass = computed(function () {
  return props.invalid ? 'border-destructive focus-within:ring-destructive/40' : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30';
});
</script>

<template>
  <TimeFieldRoot
    v-slot="{ segments }"
    v-model="value"
    v-model:placeholder="placeholder"
    :hour-cycle="hourCycle"
    :granularity="granularity"
    :min-value="min"
    :max-value="max"
    :disabled="disabled"
    :readonly="readonly"
    :name="name"
    :required="required"
    :locale="locale"
    :aria-invalid="invalid || undefined"
    :aria-describedby="describedBy"
    :data-invalid="invalid || undefined"
    :class="[
      'inline-flex items-center rounded-medium border bg-input px-3 text-foreground transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:opacity-50 data-[disabled]:pointer-events-none',
      fullWidth ? 'w-full' : 'w-fit',
      ROOT_HEIGHT[size],
      stateClass,
    ]"
  >
    <template v-for="(segment, index) in segments" :key="index">
      <TimeFieldInput
        v-if="segment.part === 'literal'"
        :part="segment.part"
        class="text-faint"
      >{{ segment.value }}</TimeFieldInput>
      <TimeFieldInput
        v-else
        :part="segment.part"
        class="rounded px-0.5 tabular-nums transition-colors focus:bg-foreground focus:text-background focus-visible:outline-none data-[placeholder]:text-faint"
      >{{ segment.value }}</TimeFieldInput>
    </template>
  </TimeFieldRoot>
</template>
