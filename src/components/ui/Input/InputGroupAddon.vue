<script setup lang="ts">
import type { PropType } from 'vue';
// A non-editable label or icon attached to an InputGroup. `side`: 'start' (default) | 'end'.
defineProps({ side: { type: String as PropType<'start' | 'end'>, default: 'start', validator: (value: string) => ['start', 'end'].includes(value) } });
</script>

<template>
  <span :class="['flex shrink-0 items-center bg-surface px-3 text-sm text-muted', side === 'end' ? 'border-l' : 'border-r', 'border-border']">
    <slot />
  </span>
</template>
