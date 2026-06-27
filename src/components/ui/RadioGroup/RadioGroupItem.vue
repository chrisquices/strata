<script setup lang="ts">
import {RadioGroupIndicator, RadioGroupItem} from 'reka-ui';

defineProps({value: {type: [String, Number], required: true}, disabled: {type: Boolean, default: false}});
</script>

<template>
  <RadioGroupItem
      :value="value"
      :disabled="disabled"
      :class="'group flex cursor-default items-center gap-2 text-sm text-foreground transition-colors focus-visible:outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-50'"
  >
    <span
        class="flex size-control-indicator shrink-0 items-center justify-center rounded-full border-medium border-muted transition-colors duration-100 group-data-[state=checked]:border-foreground group-data-[state=unchecked]:group-hover:border-foreground/50 group-focus-visible:ring-2 group-focus-visible:ring-foreground/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background">
      <RadioGroupIndicator class="size-1.5 rounded-full bg-foreground"/>
    </span>
    <span v-if="$slots.default"><slot/></span>
  </RadioGroupItem>
</template>
