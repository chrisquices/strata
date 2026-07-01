<script setup lang="ts">
import type {PropType} from 'vue';
import {inject, computed} from 'vue';
import {cn} from '../utils';

defineProps({
  side: {
    type: String as PropType<'start' | 'end'>,
    default: 'start',
    validator: function (value: string) {
      return ['start', 'end'].includes(value);
    }
  }
});

const groupContext = inject('inputGroup', null);
const textClass = computed(function () {
  if (!groupContext) return 'text-sm';
  const size = groupContext.size;
  if (size === 'sm') return 'text-xs';
  if (size === 'lg') return 'text-base';
  return 'text-sm';
});
</script>

<template>
  <span
      :class="cn('flex shrink-0 items-center bg-surface px-control-x text-muted', textClass, side === 'end' ? 'border-l' : 'border-r', 'border-border', $attrs.class)">
    <slot/>
  </span>
</template>
