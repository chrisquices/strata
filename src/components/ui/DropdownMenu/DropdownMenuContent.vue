<script setup lang="ts">
import type { PropType } from 'vue';
import { DropdownMenuPortal, DropdownMenuContent } from 'reka-ui';

defineOptions({ inheritAttrs: false });
defineProps({
  side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom', validator: (value: string) => ['top', 'right', 'bottom', 'left'].includes(value) },
  align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start', validator: (value: string) => ['start', 'center', 'end'].includes(value) },
  sideOffset: { type: Number, default: 4 },
});
</script>

<template>
  <DropdownMenuPortal>
    <DropdownMenuContent
      v-bind="$attrs"
      :side="side"
      :align="align"
      :side-offset="sideOffset"
      style="transform-origin: var(--reka-dropdown-menu-content-transform-origin);"
      class="strata-menu-pop z-popover min-w-44 max-w-xs max-h-[var(--reka-dropdown-menu-content-available-height)] overflow-y-auto rounded-large border border-border bg-surface p-1 shadow-panel focus-visible:outline-none"
    >
      <slot />
    </DropdownMenuContent>
  </DropdownMenuPortal>
</template>
