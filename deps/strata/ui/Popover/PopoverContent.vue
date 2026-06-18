<script setup lang="ts">
import type { PropType } from 'vue';
import { PopoverPortal, PopoverContent } from 'reka-ui';

defineOptions({ inheritAttrs: false });
defineProps({
  side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom', validator: (value: string) => ['top', 'right', 'bottom', 'left'].includes(value) },
  align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start', validator: (value: string) => ['start', 'center', 'end'].includes(value) },
  sideOffset: { type: Number, default: 8 },
});
</script>

<template>
  <PopoverPortal>
    <PopoverContent
      v-bind="$attrs"
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      style="transform-origin: var(--reka-popover-content-transform-origin);"
      class="strata-menu-pop z-popover max-h-[var(--reka-popover-content-available-height)] overflow-y-auto rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
    >
      <slot />
    </PopoverContent>
  </PopoverPortal>
</template>
