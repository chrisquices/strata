<script setup lang="ts">
import type { PropType } from 'vue';
import { ListboxVirtualizer } from 'reka-ui';

defineProps({
  options: { type: Array as PropType<unknown[]>, default: function () { return []; } },
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
