<script setup lang="ts">
import type { PropType } from 'vue';
import { Separator } from 'reka-ui';

const props = defineProps({
  orientation: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
    validator: (value: string) => ['horizontal', 'vertical'].includes(value),
  },
  decorative: { type: Boolean, default: true },
});
</script>

<template>
  <Separator
    :orientation="orientation"
    :decorative="decorative"
    :class="['shrink-0 bg-border', orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full']"
  />
</template>
