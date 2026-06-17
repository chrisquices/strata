<script setup lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';
import { ScrollAreaScrollbar } from 'reka-ui';
const props = defineProps({
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical', validator: (value: string) => ['vertical', 'horizontal'].includes(value) },
});
const vertical = computed(() => props.orientation === 'vertical');
</script>

<template>
  <ScrollAreaScrollbar
    :orientation="orientation"
    :class="['z-10 flex touch-none select-none p-0.5 transition-opacity duration-base', vertical ? 'w-2.5' : 'h-2.5 flex-col']"
  >
    <slot />
  </ScrollAreaScrollbar>
</template>
