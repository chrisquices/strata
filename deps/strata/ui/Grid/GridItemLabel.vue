<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, ref } from 'vue';
import TruncateMiddle from '../TruncateMiddle/TruncateMiddle.vue';

const props = defineProps({
  name: { type: String, default: '' },
  variant: {
    type: String as PropType<'overlay' | 'below'>,
    default: 'overlay',
    validator: (value: string) => ['overlay', 'below'].includes(value),
  },
  truncate: {
    type: [Boolean, String] as PropType<boolean | 'middle' | 'end'>,
    default: false,
    validator: (value: boolean | string) => typeof value === 'boolean' || ['middle', 'end'].includes(value),
  },
});

const element = ref<HTMLElement>();
const variantClass = computed(() => props.variant === 'overlay'
  ? 'pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-overlay/85 via-overlay/35 to-transparent px-3 pb-2 pt-10 text-white'
  : 'relative z-20 border-t border-border px-3 py-2.5 text-foreground');
const truncateMode = computed(() => props.truncate === true ? 'middle' : props.truncate || false);

defineExpose({ element });
</script>

<template>
  <div
    ref="element"
    data-grid-item-label
    :data-variant="variant"
    :class="['min-w-0 text-xs font-medium', variantClass]"
  >
    <slot>
      <TruncateMiddle v-if="truncateMode === 'middle'" :text="name" />
      <span v-else-if="truncateMode === 'end'" class="block truncate">{{ name }}</span>
      <span v-else class="block break-words">{{ name }}</span>
    </slot>
  </div>
</template>
