<script setup lang="ts">
import type { PropType } from 'vue';
// Styled wrapper over reka's ScrollAreaRoot. Compose with ScrollAreaViewport plus
// ScrollAreaScrollbar/ScrollAreaThumb (and ScrollAreaCorner when both axes scroll).
// `type` controls when bars appear: hover | scroll | auto | always.
// `hideDelay` is the ms before hover/scroll bars fade out.
import { ScrollAreaRoot } from 'reka-ui';

defineProps({
  type: {
    type: String as PropType<'hover' | 'scroll' | 'auto' | 'always'>,
    default: 'hover',
    validator: (value: string) => ['hover', 'scroll', 'auto', 'always'].includes(value),
  },
  hideDelay: { type: Number, default: 600 },
});
</script>

<template>
  <ScrollAreaRoot :type="type" :scroll-hide-delay="hideDelay" class="relative overflow-hidden">
    <slot />
  </ScrollAreaRoot>
</template>
