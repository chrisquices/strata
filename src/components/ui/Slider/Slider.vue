<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, reactive, provide } from 'vue';
import { SliderRoot, SliderTrack } from 'reka-ui';
import SliderRangePart from './SliderRange.vue';
import SliderThumbPart from './SliderThumb.vue';

const props = defineProps({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: function (value: string) { return ['sm', 'md', 'lg'].includes(value); } },
});
const model = defineModel<number | number[]>({ default: 0 });

// reka's model is always an array; accept either a single number or an array and adapt both ways.
const isArray = computed(function () {
  return Array.isArray(model.value);
});
const values = computed({
  get: function () {
    return isArray.value ? model.value : [model.value];
  },
  set: function (value) {
    model.value = isArray.value ? value : value[0];
  },
});

// Thumb lives inside the (thin) track; reka only sets horizontal position, so center it on the
// track vertically with top-1/2 + a negative half-thumb margin.
const sizeClasses = {
  sm: { track: 'h-1', thumb: 'size-3 top-1/2 -mt-1.5' },
  md: { track: 'h-1.5', thumb: 'size-4 top-1/2 -mt-2' },
  lg: { track: 'h-2', thumb: 'size-5 top-1/2 -mt-2.5' },
};
const sizing = computed(function () {
  return sizeClasses[props.size] ?? sizeClasses.md;
});

provide('sliderStyle', reactive({
  trackClass: computed(function () {
    return sizing.value.track;
  }),
  thumbClass: computed(function () {
    return sizing.value.thumb;
  }),
}));
</script>

<template>
  <SliderRoot
    v-model="values"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :name="name"
    :required="required"
    :class="['relative flex h-4 w-full touch-none items-center', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer']"
  >
    <SliderTrack :class="['relative w-full grow rounded-full bg-border', sizing.track]">
      <slot>
        <SliderRangePart />
        <SliderThumbPart v-for="(_, index) in values" :key="index" />
      </slot>
    </SliderTrack>
  </SliderRoot>
</template>
