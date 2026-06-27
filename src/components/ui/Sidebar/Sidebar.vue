<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  side: { type: String as PropType<'left' | 'right' | null>, default: null, validator: function (value) { return value === null || ['left', 'right'].includes(value); } },
  collapsed: { type: Boolean, default: false },
});
</script>

<template>
  <aside
    :data-collapsed="collapsed || undefined"
    :class="[
      'group/sidebar flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden bg-sidebar transition-[width] duration-300 md:max-h-none',
      collapsed ? 'md:w-14' : 'md:w-72 md:overflow-visible',
      side ? 'border-b border-border md:border-b-0' : '',
      side === 'right' ? 'md:border-l' : '',
      side === 'left' ? 'md:border-r' : '',
    ]"
  >
    <nav class="flex-1 overflow-y-auto">
      <slot />
    </nav>
  </aside>
</template>
