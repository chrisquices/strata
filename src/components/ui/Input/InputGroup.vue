<script setup lang="ts">
import type { PropType } from 'vue';
// Wraps an Input plus InputGroupAddon(s) into one bordered row. Provides its size/invalid
// to the child Input via inject('inputGroup') — set them here, not on the inner Input.
import { reactive, computed, provide } from 'vue';

const props = defineProps({
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  invalid: { type: Boolean, default: false },
});

provide('inputGroup', reactive({
  size: computed(() => props.size),
  invalid: computed(() => props.invalid),
}));

const sizeClass = { sm: 'h-control-small text-xs', md: 'h-control text-sm', lg: 'h-control-large text-base' };
const borderClass = computed(() =>
  props.invalid
    ? 'border-destructive focus-within:ring-2 focus-within:ring-destructive/40'
    : 'border-border focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30'
);
</script>

<template>
  <div :class="['flex overflow-hidden rounded-medium border transition-colors duration-fast', borderClass, sizeClass[size] ?? sizeClass.md]">
    <slot />
  </div>
</template>
