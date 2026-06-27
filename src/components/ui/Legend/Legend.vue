<script setup lang="ts">
defineProps({
  disabled: { type: Boolean, default: false },
});

const base = 'm-0 inline-flex items-center gap-2 text-sm font-medium leading-none select-none mb-3';
</script>

<template>
  <legend :data-disabled="disabled || undefined" :class="[base, disabled ? 'text-muted cursor-not-allowed' : 'text-foreground']">
    <slot />
  </legend>
</template>
