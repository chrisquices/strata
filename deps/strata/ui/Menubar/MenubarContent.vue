<script setup lang="ts">
import type { PropType } from 'vue';
import { MenubarPortal, MenubarContent } from 'reka-ui';

defineOptions({ inheritAttrs: false });
defineProps({
  align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start', validator: (value: string) => ['start', 'center', 'end'].includes(value) },
  sideOffset: { type: Number, default: 4 },
});
</script>

<template>
  <MenubarPortal>
    <MenubarContent
      v-bind="$attrs"
      :align="align"
      :side-offset="sideOffset"
      style="transform-origin: var(--reka-menubar-content-transform-origin);"
      class="strata-menu-pop z-popover min-w-44 max-w-xs max-h-[var(--reka-menubar-content-available-height)] overflow-y-auto rounded-large border border-border bg-surface p-1 shadow-panel focus-visible:outline-none"
    >
      <slot />
    </MenubarContent>
  </MenubarPortal>
</template>
