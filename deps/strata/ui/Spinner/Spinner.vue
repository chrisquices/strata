<script setup lang="ts">
import type { PropType } from 'vue';
defineProps({
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
});
const sizeClass = {
  sm: 'size-icon-small border',
  md: 'size-icon-medium border-medium',
  lg: 'size-icon-large border-medium',
};
</script>

<template>
  <span
    role="status"
    aria-label="Loading"
    :class="['inline-block animate-spin rounded-full border-current border-t-transparent', sizeClass[size] ?? sizeClass.md]"
  ></span>
</template>
