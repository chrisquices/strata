<script setup lang="ts">
import { inject, computed } from 'vue';
const props = defineProps({ for: { default: undefined } });
const field = inject('field', { focused: { value: false }, hasValue: { value: false } });
const floating = computed(() => !!(field.focused.value || field.hasValue.value));
const focused = computed(() => !!field.focused.value);

const base =
  'absolute pointer-events-none select-none transition-all duration-200 ease-out -translate-y-1/2 origin-left';
const stateClass = computed(() =>
  floating.value
    ? `top-0 left-2 px-1.5 text-xs bg-input z-10 rounded-medium ${focused.value ? 'text-foreground' : 'text-muted'}`
    : 'top-1/2 left-3 text-sm text-faint'
);
</script>

<template>
  <label :for="$props.for" :class="[base, stateClass]">
    <slot />
  </label>
</template>
