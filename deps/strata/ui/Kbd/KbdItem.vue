<script setup lang="ts">
defineProps({ label: { type: String, default: undefined } });
</script>

<template>
  <kbd :aria-label="label" class="inline-flex items-center gap-0.5 rounded-small border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-muted">
    <slot />
  </kbd>
</template>
