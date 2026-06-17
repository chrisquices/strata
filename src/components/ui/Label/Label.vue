<script setup lang="ts">
import { computed } from 'vue';
import { Label } from 'reka-ui';
// `for` is a reserved word, so the template references it as $props.for.
const props = defineProps({
  for: { default: undefined },
  disabled: { type: Boolean, default: false },
});
const base = 'inline-flex items-center gap-2 text-sm font-medium leading-none select-none';
const stateClass = computed(() => (props.disabled ? 'text-muted cursor-not-allowed' : 'text-foreground'));
</script>

<template>
  <Label :for="$props.for" :data-disabled="disabled || undefined" :class="[base, stateClass]">
    <slot />
  </Label>
</template>
