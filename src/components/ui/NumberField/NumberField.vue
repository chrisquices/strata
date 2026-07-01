<script setup lang="ts">
import {computed, useAttrs} from 'vue';
import type {PropType} from 'vue';
import {Minus, Plus} from '@lucide/vue';
import {NumberFieldRoot, NumberFieldInput, NumberFieldIncrement, NumberFieldDecrement} from 'reka-ui';

defineOptions({inheritAttrs: false});

const props = defineProps({
  min: {type: Number, default: undefined},
  max: {type: Number, default: undefined},
  step: {type: Number, default: 1},
  disabled: {type: Boolean, default: false},
  readonly: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  id: {type: String, default: undefined},
  formatOptions: {type: Object as PropType<Intl.NumberFormatOptions | undefined>, default: undefined},
  locale: {type: String, default: undefined},

  // The four below default to undefined so reka's own defaults apply unless explicitly set.
  stepSnapping: {type: Boolean, default: undefined}, // snap to step boundaries (reka default true)
  focusOnChange: {type: Boolean, default: undefined}, // refocus input after a stepper press (reka default true)
  disableWheelChange: {type: Boolean, default: undefined},
  invertWheelChange: {type: Boolean, default: undefined},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: function (value: string) { return ['sm', 'md', 'lg'].includes(value); }
  },
  decrementLabel: {type: String, default: 'Decrease'},
  incrementLabel: {type: String, default: 'Increase'},
});
const model = defineModel<number | null>();

// class/style size the container; everything else (aria-*, id, data-*, listeners) flows to the input.
const attributes = useAttrs();
const inputAttributes = computed(function () {
  const {class: _class, style: _style, ...rest} = attributes;
  return rest;
});

const rootHeightClasses = {sm: 'h-control-small', md: 'h-control', lg: 'h-control-large'};
const textClasses = {sm: 'text-xs', md: 'text-sm', lg: 'text-base'};
const buttonWidthClasses = {sm: 'w-control-small', md: 'w-control', lg: 'w-control-large'};

const stepButton = 'grid h-full place-items-center text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none data-[disabled]:pointer-events-none data-[disabled]:text-faint data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent';
</script>

<template>
  <NumberFieldRoot
      v-model="model"
      :class="['flex w-full items-stretch overflow-hidden rounded-medium border bg-input transition-colors border-border hover:border-foreground/40 focus-within:border-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:opacity-50 data-[disabled]:pointer-events-none', rootHeightClasses[props.size], attributes.class]"
      :style="attributes.style"
      :min="props.min"
      :max="props.max"
      :step="props.step"
      :disabled="props.disabled"
      :readonly="props.readonly"
      :name="props.name"
      :required="props.required"
      :id="props.id"
      :format-options="props.formatOptions"
      :locale="props.locale"
      :step-snapping="props.stepSnapping"
      :focus-on-change="props.focusOnChange"
      :disable-wheel-change="props.disableWheelChange"
      :invert-wheel-change="props.invertWheelChange"
  >
    <NumberFieldDecrement :aria-label="props.decrementLabel" :class="[stepButton, buttonWidthClasses[props.size], 'border-r border-border']">
      <Minus class="size-icon-small" aria-hidden="true"/>
    </NumberFieldDecrement>
    <NumberFieldInput
        v-bind="inputAttributes"
        :class="['min-w-0 flex-1 bg-transparent px-control-x-small text-center tabular-nums text-foreground placeholder:text-faint read-only:text-muted focus-visible:outline-none', textClasses[props.size]]"
    />
    <NumberFieldIncrement :aria-label="props.incrementLabel" :class="[stepButton, buttonWidthClasses[props.size], 'border-l border-border']">
      <Plus class="size-icon-small" aria-hidden="true"/>
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>
