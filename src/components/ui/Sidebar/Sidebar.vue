<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  side: { type: String as PropType<'left' | 'right'>, default: 'left', validator: (value: string) => ['left', 'right'].includes(value) },
  collapsed: { type: Boolean, default: false },
});
</script>

<template>
  <aside
    :data-collapsed="collapsed || undefined"
    :class="[
      'group/sidebar flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-sidebar transition-[width] duration-300 md:max-h-none md:border-b-0',
      collapsed ? 'md:w-14' : 'md:w-72 md:overflow-visible',
      side === 'right' ? 'md:border-l' : 'md:border-r',
    ]"
  >
    <nav class="flex-1 overflow-y-auto">
      <slot />
    </nav>
  </aside>
</template>
