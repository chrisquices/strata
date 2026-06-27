<script setup lang="ts">
import type {PropType} from 'vue';
import {TooltipPortal, TooltipContent, TooltipArrow} from 'reka-ui';

defineOptions({inheritAttrs: false});
defineProps({
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'top',
    validator: function (value: string) {
      return ['top', 'right', 'bottom', 'left'].includes(value);
    }
  },
  sideOffset: {type: Number, default: 8},
});
</script>

<template>
  <TooltipPortal>
    <TooltipContent
        v-bind="$attrs"
        :side="side"
        :side-offset="sideOffset"
        class="strata-tooltip-fade pointer-events-none z-tooltip max-w-72 rounded-medium border border-border bg-surface px-2.5 py-1.5 text-xs leading-5 text-pretty text-foreground shadow-panel"
    >
      <slot/>
      <TooltipArrow
          class="fill-surface stroke-border"
          :width="10"
          :height="5"
      />
    </TooltipContent>
  </TooltipPortal>
</template>
