<script setup lang="ts">
// Container for grouped actions with roving focus (one tab stop, arrow keys move between controls).
// Compose with ToolbarButton / ToolbarGroup / ToolbarSeparator.
import { ToolbarRoot } from 'reka-ui';
defineProps({ bordered: { type: Boolean, default: true } });
</script>

<template>
  <ToolbarRoot :class="['flex items-center gap-1', bordered ? 'h-control rounded-medium border border-border bg-surface px-1' : '']">
    <slot />
  </ToolbarRoot>
</template>
