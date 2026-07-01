<script setup lang="ts">
import type {PropType} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  side: { type: String as PropType<'left' | 'right' | null>, default: null, validator: function (value) { return value === null || ['left', 'right'].includes(value); } },
  collapsed: { type: Boolean, default: false },
});

</script>

<template>
  <aside
    v-bind="$attrs"
    :data-collapsed="props.collapsed || undefined"
    :class="cn(
      'group/sidebar flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-300 md:max-h-none z-sidebar',
      props.collapsed ? 'md:w-14' : 'md:w-72 md:overflow-visible',
      props.side ? 'border-b border-border md:border-b-0' : '',
      props.side === 'right' ? 'md:border-l' : '',
      props.side === 'left' ? 'md:border-r' : '',
      $attrs.class,
    )"
  >
    <nav class="flex flex-1 flex-col overflow-y-auto">
      <slot />
    </nav>
  </aside>
</template>
