<script setup lang="ts">
import type { PropType } from 'vue';
// A two-state button that stays pressed when on. v-model:pressed holds the state.
// variant: primary | secondary. size: sm | md | lg.
import { Toggle as TogglePrimitive } from 'reka-ui';
const props = defineProps({
  disabled: { type: Boolean, default: false },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  variant: { type: String as PropType<'primary' | 'secondary'>, default: 'primary', validator: (value: string) => ['primary', 'secondary'].includes(value) },
});
const pressed = defineModel<boolean>('pressed', { default: false });
const sizeClass = {
  sm: 'h-control-small px-2.5 text-xs',
  md: 'h-control px-3 text-sm',
  lg: 'h-control-large px-3.5 text-base',
};
</script>

<template>
  <TogglePrimitive
    v-model="pressed"
    :disabled="disabled"
    :class="[
      'inline-flex items-center justify-center gap-1.5 rounded-medium transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 select-none',
      sizeClass[size],
      variant === 'secondary' ? 'border border-border' : '',
      'text-muted hover:bg-border hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default',
    ]"
  >
    <slot />
  </TogglePrimitive>
</template>
