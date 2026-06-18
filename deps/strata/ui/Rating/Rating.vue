<script setup lang="ts">
// A star rating. v-model is a number (0..max). Custom (reka has no rating). Accessible as a slider:
// role=slider with arrow-key steps, Home/End, a hover preview, and an aria-valuetext like "3.5 of 5".
// Set `allowHalf` for half-star precision (click the left/right half of a star; arrows step by 0.5).
import { computed, ref } from 'vue';
import type { PropType } from 'vue';
import { Star } from '@lucide/vue';

const props = defineProps({
  max: { type: Number, default: 5 },
  allowHalf: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (v: string) => ['sm', 'md', 'lg'].includes(v) },
  label: { type: String, default: 'Rating' },
});
const model = defineModel<number>({ default: 0 });
const hover = ref(0);

const interactive = computed(() => !props.readonly && !props.disabled);
const display = computed(() => hover.value || model.value);
const stars = computed(() => Array.from({ length: props.max }, (_, i) => i + 1));
const step = computed(() => (props.allowHalf ? 0.5 : 1));
const SIZE = { sm: 'size-icon-small', md: 'size-icon-medium', lg: 'size-icon-large' };

// Fill width for a given star position based on the current (hover or committed) value.
function fillPct(star: number): string {
  const d = display.value;
  if (d >= star) return '100%';
  if (props.allowHalf && d >= star - 0.5) return '50%';
  return '0%';
}
function set(value: number) {
  if (!interactive.value) return;
  model.value = model.value === value ? 0 : value; // click the current value again to clear
}
function onKeydown(event: KeyboardEvent) {
  if (!interactive.value) return;
  let next = model.value;
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(props.max, model.value + step.value);
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, model.value - step.value);
  else if (event.key === 'Home') next = step.value;
  else if (event.key === 'End') next = props.max;
  else return;
  event.preventDefault();
  model.value = next;
}
</script>

<template>
  <div
    role="slider"
    :aria-label="label"
    :aria-valuemin="0"
    :aria-valuemax="max"
    :aria-valuenow="model"
    :aria-valuetext="`${model} of ${max}`"
    :aria-readonly="readonly || undefined"
    :aria-disabled="disabled || undefined"
    :tabindex="interactive ? 0 : -1"
    :class="['inline-flex items-center gap-0.5 rounded-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40', disabled ? 'opacity-50' : '']"
    @keydown="onKeydown"
    @mouseleave="hover = 0"
  >
    <span v-for="star in stars" :key="star" class="relative inline-flex">
      <Star :class="[SIZE[size], 'fill-transparent text-faint']" aria-hidden="true" />
      <span class="pointer-events-none absolute inset-y-0 left-0 overflow-hidden" :style="{ width: fillPct(star) }">
        <Star :class="[SIZE[size], 'max-w-none fill-warning text-warning']" aria-hidden="true" />
      </span>
      <template v-if="interactive">
        <button
          v-if="allowHalf"
          type="button"
          tabindex="-1"
          aria-hidden="true"
          :class="['absolute inset-y-0 left-0 w-1/2', interactive ? 'cursor-pointer' : '']"
          @mouseenter="hover = star - 0.5"
          @click="set(star - 0.5)"
        ></button>
        <button
          type="button"
          tabindex="-1"
          aria-hidden="true"
          :class="[allowHalf ? 'right-0 w-1/2' : 'inset-x-0', 'absolute inset-y-0', interactive ? 'cursor-pointer' : '']"
          @mouseenter="hover = star"
          @click="set(star)"
        ></button>
      </template>
    </span>
  </div>
</template>
