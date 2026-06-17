<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  side: { type: String as PropType<'left' | 'right'>, default: 'left', validator: (value: string) => ['left', 'right'].includes(value) },
});
</script>

<template>
  <aside
    :class="[
      'flex h-full min-h-0 w-full shrink-0 flex-col overflow-hidden border-b border-border bg-sidebar md:max-h-none md:w-72 md:overflow-visible md:border-b-0',
      side === 'right' ? 'md:border-l' : 'md:border-r',
    ]"
  >
    <nav class="flex-1 overflow-y-auto">
      <slot />
    </nav>
  </aside>
</template>
