<script setup lang="ts">
defineProps({ label: { type: String, default: '' } });
</script>

<template>
  <div class="flex items-baseline justify-between gap-3 px-4 py-1.5 text-sm">
    <span class="shrink-0 text-muted">{{ label }}</span>
    <span class="truncate text-right text-foreground"><slot /></span>
  </div>
</template>
