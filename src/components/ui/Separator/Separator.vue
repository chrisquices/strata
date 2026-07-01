<script setup lang="ts">
import type {PropType} from 'vue';
import {Separator} from 'reka-ui';

const props = defineProps({
  orientation: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
    validator: function (value: string) {
      return ['horizontal', 'vertical'].includes(value);
    },
  },
  decorative: {type: Boolean, default: false},
});
</script>

<template>
  <Separator
      :orientation="props.orientation"
      :decorative="props.decorative"
      :class="['shrink-0 bg-border', props.orientation === 'vertical' ? 'h-full w-px' : 'h-px w-full']"
  />
</template>
