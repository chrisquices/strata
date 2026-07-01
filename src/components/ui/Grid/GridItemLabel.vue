<script setup lang="ts">
import type {PropType} from 'vue';
import {computed, ref} from 'vue';
import TruncateMiddle from '../TruncateMiddle/TruncateMiddle.vue';

const props = defineProps({
  name: {type: String, default: ''},
  variant: {
    type: String as PropType<'overlay' | 'below'>,
    default: 'overlay',
    validator: function (value: string) {
      return ['overlay', 'below'].includes(value);
    },
  },
  truncate: {
    type: [Boolean, String] as PropType<boolean | 'middle' | 'end'>,
    default: false,
    validator: function (value: boolean | string) {
      return typeof value === 'boolean' || ['middle', 'end'].includes(value);
    },
  },
});

const element = ref<HTMLElement>();
const variantClass = computed(function () {
  if (props.variant === 'overlay') {
    return 'pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-overlay/85 via-overlay/35 to-transparent px-surface-small pb-surface-small pt-section text-white';
  }

  return 'relative z-20 border-t border-border px-surface-small py-surface-small text-foreground';
});
const truncateMode = computed(function () {
  return props.truncate === true ? 'middle' : props.truncate || false;
});

defineExpose({element});
</script>

<template>
  <div
      ref="element"
      data-grid-item-label
      :data-variant="variant"
      :class="['min-w-0 text-xs font-medium', variantClass]"
  >
    <slot>
      <TruncateMiddle v-if="truncateMode === 'middle'">
        {{ name }}
      </TruncateMiddle>
      <span v-else-if="truncateMode === 'end'" class="block truncate">{{ name }}</span>
      <span v-else class="block break-words">{{ name }}</span>
    </slot>
  </div>
</template>
