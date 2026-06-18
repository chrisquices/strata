<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, provide, ref, toRef } from 'vue';

type ItemSize = 'sm' | 'md' | 'lg' | `${number}rem`;

const props = defineProps({
  virtualized: { type: Boolean, default: false },
  itemSize: {
    type: String as PropType<ItemSize>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value) || /^\d+(?:\.\d+)?rem$/.test(value),
  },
  gap: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
});

const sizeMap = {
  sm: '8rem',
  md: '12rem',
  lg: '16rem',
};

const gapClass = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
};

const resolvedItemSize = computed(() =>
  props.itemSize in sizeMap ? sizeMap[props.itemSize] : props.itemSize,
);
const layoutClass = computed(() => props.virtualized
  ? 'relative min-w-0'
  : `grid min-w-0 ${gapClass[props.gap]}`);
const layoutStyle = computed(() => props.virtualized
  ? undefined
  : { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${resolvedItemSize.value}), 1fr))` });

provide('strataGridVirtualized', toRef(props, 'virtualized'));

const element = ref<HTMLElement>();

defineExpose({ element });
</script>

<template>
  <div
    ref="element"
    data-grid
    :data-virtualized="virtualized || undefined"
    :class="layoutClass"
    :style="layoutStyle"
  >
    <slot />
  </div>
</template>
