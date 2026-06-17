<script setup lang="ts">
import type { PropType } from 'vue';
import { TooltipPortal, TooltipContent } from 'reka-ui';

defineOptions({ inheritAttrs: false });
defineProps({
  side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'top', validator: (value: string) => ['top', 'right', 'bottom', 'left'].includes(value) },
  sideOffset: { type: Number, default: 8 },
});
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="$attrs"
      :side="side"
      :side-offset="sideOffset"
      class="strata-overlay-fade pointer-events-none z-tooltip max-w-64 rounded-medium bg-foreground px-2 py-1 text-xs text-pretty text-background shadow-panel"
    >
      <slot />
    </TooltipContent>
  </TooltipPortal>
</template>
