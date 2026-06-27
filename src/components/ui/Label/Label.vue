<script setup lang="ts">
import {Label} from 'reka-ui';

// `for` is a reserved word, so the template references it as $props.for.
defineProps({
  for: {type: String, default: undefined},
  disabled: {type: Boolean, default: false},
});
const base = 'inline-flex items-center gap-2 text-sm font-medium leading-none select-none';
</script>

<template>
  <Label :for="$props.for" :data-disabled="disabled || undefined"
         :class="[base, disabled ? 'text-muted cursor-not-allowed' : 'text-foreground']">
    <slot/>
  </Label>
</template>
