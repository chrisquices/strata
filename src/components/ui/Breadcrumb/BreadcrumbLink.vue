<script setup lang="ts">
import type { PropType } from 'vue';
defineProps({
  as: {
    type: [String, Object] as PropType<'a' | object>,
    default: 'a',
    validator: (value: unknown) => typeof value === 'object' || value === 'a',
  },
});
const base =
    'inline-flex items-center gap-1.5 rounded-small text-muted transition-colors duration-fast ' +
    'hover:text-foreground focus-visible:outline-none focus-visible:text-foreground ' +
    'focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
</script>

<template>
  <component :is="as" :class="base">
    <slot/>
  </component>
</template>
