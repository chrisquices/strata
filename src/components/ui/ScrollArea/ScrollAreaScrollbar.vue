<script setup lang="ts">
import type {PropType} from 'vue';
import {ScrollAreaScrollbar} from 'reka-ui';

const props = defineProps({
  orientation: {
    type: String as PropType<'vertical' | 'horizontal'>,
    default: 'vertical',
    validator: function (value: string) {
      return ['vertical', 'horizontal'].includes(value);
    },
  },
});
</script>

<template>
  <ScrollAreaScrollbar
      :orientation="props.orientation"
      class="strata-scrollbar-fade z-10 flex touch-none select-none p-0.5 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col"
  >
    <slot/>
  </ScrollAreaScrollbar>
</template>
