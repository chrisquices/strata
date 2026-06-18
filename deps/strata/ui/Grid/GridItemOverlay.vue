<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, ref } from 'vue';

const props = defineProps({
  variant: {
    type: String as PropType<'transparent' | 'scrim'>,
    default: 'transparent',
    validator: (value: string) => ['transparent', 'scrim'].includes(value),
  },
  visibility: {
    type: String as PropType<'always' | 'hover'>,
    default: 'always',
    validator: (value: string) => ['always', 'hover'].includes(value),
  },
});

const element = ref<HTMLElement>();
const variantClass = computed(() => props.variant === 'scrim' ? 'bg-overlay/25' : '');
const visibilityClass = computed(() => props.visibility === 'hover'
  ? 'opacity-0 transition-opacity duration-100 group-hover/grid-item:opacity-100 group-focus-within/grid-item:opacity-100'
  : '');

defineExpose({ element });
</script>

<template>
  <div
    ref="element"
    data-grid-item-overlay
    :data-visibility="visibility"
    :class="['pointer-events-none absolute inset-0 z-10', variantClass, visibilityClass]"
  >
    <slot />
  </div>
</template>
