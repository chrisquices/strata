<script setup lang="ts">

// Loading placeholder. Size it with utility classes, e.g. <Skeleton class="h-4 w-32" />.
// reka has no Skeleton primitive (it's purely presentational), so this is a styled element.
// Pulse respects prefers-reduced-motion. Decorative — mark the loading region with aria-busy.
import type { PropType } from 'vue';

type Rounded = 'none' | 'small' | 'medium' | 'large' | 'full';

const props = defineProps({
  rounded: {
    type: String as PropType<Rounded>,
    default: 'medium',
    validator: function (value: string) { return ['none', 'small', 'medium', 'large', 'full'].includes(value); },
  },
});
const radiusClass: Record<Rounded, string> = { none: '', small: 'rounded-small', medium: 'rounded-medium', large: 'rounded-large', full: 'rounded-full' };
</script>

<template>
  <div :class="['animate-pulse bg-border/50 motion-reduce:animate-none', radiusClass[props.rounded]]" aria-hidden="true"></div>
</template>
