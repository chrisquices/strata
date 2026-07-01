<script setup lang="ts">
const props = defineProps({
  disabled: { type: Boolean, default: false },
});

const baseClass = 'm-0 mb-form-small inline-flex items-center gap-cluster-small text-sm font-medium leading-none select-none';
</script>

<template>
  <legend :data-disabled="props.disabled || undefined" :class="[baseClass, props.disabled ? 'text-muted cursor-not-allowed' : 'text-foreground']">
    <slot />
  </legend>
</template>
