<script setup lang="ts">
// A numeric input with stepper buttons, built on reka's NumberField. v-model holds a Number (or null).
// reka handles typing, Arrow/PageUp-Down/Home/End keys, mouse-wheel, press-and-hold on the steppers,
// decimal-safe math, and ARIA (role=spinbutton). `name` enables form submission; `formatOptions`
// (Intl.NumberFormat) + `locale` give currency / percent / fixed-decimal display.
// Accessible name: pass `aria-label` (or `aria-labelledby` referencing a FieldLabel) — it lands on the
// input. It's w-full by default (like Input) — set its width by constraining the container it sits in.
import { computed, useAttrs } from 'vue';
import type { PropType } from 'vue';
import { Minus, Plus } from '@lucide/vue';
import { NumberFieldRoot, NumberFieldInput, NumberFieldIncrement, NumberFieldDecrement } from 'reka-ui';

defineOptions({ inheritAttrs: false });

defineProps({
  min: { type: Number, default: undefined },
  max: { type: Number, default: undefined },
  step: { type: Number, default: 1 },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  id: { type: String, default: undefined },
  placeholder: { type: String, default: undefined },
  formatOptions: { type: Object as PropType<Intl.NumberFormatOptions | undefined>, default: undefined },
  locale: { type: String, default: undefined },
  // The four below default to undefined so reka's own defaults apply unless explicitly set.
  stepSnapping: { type: Boolean, default: undefined }, // snap to step boundaries (reka default true)
  focusOnChange: { type: Boolean, default: undefined }, // refocus input after a stepper press (reka default true)
  disableWheelChange: { type: Boolean, default: undefined }, // disable mouse-wheel changes
  invertWheelChange: { type: Boolean, default: undefined }, // invert wheel direction
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  decrementLabel: { type: String, default: 'Decrease' },
  incrementLabel: { type: String, default: 'Increase' },
});
const model = defineModel<number | null>();

// class/style size the container; everything else (aria-*, id, data-*, listeners) flows to the input.
const attrs = useAttrs();
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const ROOT_H = { sm: 'h-control-small', md: 'h-control', lg: 'h-control-large' };
const TEXT = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' };
const BTN_W = { sm: 'w-6', md: 'w-8', lg: 'w-10' };

const stepBtn = 'grid h-full place-items-center text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none data-[disabled]:pointer-events-none data-[disabled]:text-faint data-[disabled]:opacity-50 data-[disabled]:hover:bg-transparent';
</script>

<template>
  <NumberFieldRoot
    v-model="model"
    :class="['flex w-full items-stretch overflow-hidden rounded-medium border bg-input transition-colors border-border hover:border-foreground/40 focus-within:border-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background data-[disabled]:opacity-50 data-[disabled]:pointer-events-none', ROOT_H[size], attrs.class]"
    :style="attrs.style"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :readonly="readonly"
    :name="name"
    :required="required"
    :id="id"
    :format-options="formatOptions"
    :locale="locale"
    :step-snapping="stepSnapping"
    :focus-on-change="focusOnChange"
    :disable-wheel-change="disableWheelChange"
    :invert-wheel-change="invertWheelChange"
  >
    <NumberFieldDecrement :aria-label="decrementLabel" :class="[stepBtn, BTN_W[size], 'border-r border-border']">
      <Minus class="size-icon-small" aria-hidden="true" />
    </NumberFieldDecrement>
    <NumberFieldInput
      v-bind="inputAttrs"
      :placeholder="placeholder"
      :class="['min-w-0 flex-1 bg-transparent px-2 text-center tabular-nums text-foreground placeholder:text-faint read-only:text-muted focus-visible:outline-none', TEXT[size]]"
    />
    <NumberFieldIncrement :aria-label="incrementLabel" :class="[stepBtn, BTN_W[size], 'border-l border-border']">
      <Plus class="size-icon-small" aria-hidden="true" />
    </NumberFieldIncrement>
  </NumberFieldRoot>
</template>
