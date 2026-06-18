<script setup lang="ts">
// Virtual scroller for large Listboxes — renders only visible items. Pass `options` and render each
// via the default slot (you receive { option, virtualItem, virtualizer }); put a <ListboxItem> inside.
import type { PropType } from 'vue';
import { ListboxVirtualizer } from 'reka-ui';

defineProps({
  options: { type: Array as PropType<unknown[]>, default: () => [] },
  estimateSize: { type: Number, default: 32 },
  overscan: { type: Number, default: 12 },
  textContent: { type: Function as PropType<(option: unknown) => string>, default: undefined },
});
</script>

<template>
  <ListboxVirtualizer :options="options" :estimate-size="estimateSize" :overscan="overscan" :text-content="textContent">
    <template #default="slotProps">
      <slot v-bind="slotProps" />
    </template>
  </ListboxVirtualizer>
</template>
