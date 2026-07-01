<script setup lang="ts">
import {Label} from 'reka-ui';

const props = defineProps({
  for: {type: String, default: undefined},
  disabled: {type: Boolean, default: false},
});
const baseClass = 'inline-flex items-center gap-cluster-small align-middle text-sm leading-none select-none';
</script>

<template>
  <Label :for="props.for" :data-disabled="props.disabled || undefined"
         :class="[baseClass, props.disabled ? 'text-muted cursor-not-allowed' : 'text-foreground']">
    <slot/>
  </Label>
</template>
