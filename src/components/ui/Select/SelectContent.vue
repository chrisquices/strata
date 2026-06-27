<script setup lang="ts">
import type { PropType } from 'vue';
import { SelectPortal, SelectContent, SelectViewport } from 'reka-ui';

defineOptions({ inheritAttrs: false });

defineProps({
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
    validator: function (value: string) {
      return ['top', 'right', 'bottom', 'left'].includes(value);
    }
  },
  sideOffset: { type: Number, default: 4 },
});
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="$attrs"
      :side="side"
      :side-offset="sideOffset"
      position="popper"
      class="strata-menu-pop z-popover max-h-96 min-w-[var(--reka-select-trigger-width,8rem)] overflow-hidden rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
    >
      <SelectViewport class="max-h-52 overflow-y-auto p-1">
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
