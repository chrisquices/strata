<script setup lang="ts">
// A segmented time input built on reka's TimeField. v-model is an ISO time string ("14:30").
// Each segment (hour/minute/AM-PM) is an independent spinbutton — arrows adjust, type to enter.
import { computed, ref, watch } from 'vue';
import type { PropType } from 'vue';
import { TimeFieldRoot, TimeFieldInput } from 'reka-ui';
import { Time } from '@internationalized/date';
import type { Time as TimeValue } from '@internationalized/date';
import { timeFromIso, isoFromTime } from '../Shared/date';

const props = defineProps({
  hourCycle: { type: Number as PropType<12 | 24>, default: undefined, validator: (v: number) => v === 12 || v === 24 },
  granularity: { type: String as PropType<'hour' | 'minute' | 'second'>, default: 'minute', validator: (v: string) => ['hour', 'minute', 'second'].includes(v) },
  minValue: { type: String, default: undefined },
  maxValue: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  describedBy: { type: String, default: undefined },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  locale: { type: String, default: undefined },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (v: string) => ['sm', 'md', 'lg'].includes(v) },
  fullWidth: { type: Boolean, default: false },
});
const model = defineModel<string>({ default: '' });

const value = computed<TimeValue | undefined>({
  get: () => timeFromIso(model.value),
  set: (v) => { model.value = isoFromTime(v); },
});
const placeholder = ref<TimeValue>(timeFromIso(model.value) ?? new Time(0, 0));
watch(model, (v) => { const t = timeFromIso(v); if (t) placeholder.value = t; }); // jump to externally-set value
const min = computed(() => timeFromIso(props.minValue));
const max = computed(() => timeFromIso(props.maxValue));

const ROOT_H = { sm: 'h-control-small text-xs', md: 'h-control text-sm', lg: 'h-control-large text-base' };
const stateClass = computed(() =>
  props.invalid
    ? 'border-destructive focus-within:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-within:border-foreground focus-within:ring-foreground/30'
);
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
      ROOT_H[size],
      stateClass,
    ]"
  >
    <template v-for="(seg, i) in segments" :key="i">
      <TimeFieldInput
        v-if="seg.part === 'literal'"
        :part="seg.part"
        class="text-faint"
      >{{ seg.value }}</TimeFieldInput>
      <TimeFieldInput
        v-else
        :part="seg.part"
        class="rounded px-0.5 tabular-nums transition-colors focus:bg-foreground focus:text-background focus-visible:outline-none data-[placeholder]:text-faint"
      >{{ seg.value }}</TimeFieldInput>
    </template>
  </TimeFieldRoot>
</template>
