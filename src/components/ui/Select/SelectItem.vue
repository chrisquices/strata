<script setup lang="ts">
import { Check } from '@lucide/vue';
import { SelectItem, SelectItemText, SelectItemIndicator } from 'reka-ui';

defineProps({
  value: { required: true },
  label: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <SelectItem
    :value="value"
    :disabled="disabled"
    class="flex h-control w-full cursor-default items-center gap-2 rounded-medium px-2 text-sm text-foreground transition-colors duration-fast select-none focus-visible:outline-none hover:bg-border data-[highlighted]:bg-border data-[state=checked]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint"
  >
    <SelectItemText class="flex-1 truncate text-left"><slot>{{ label }}</slot></SelectItemText>
    <SelectItemIndicator>
      <Check class="size-icon-small shrink-0 text-foreground" />
    </SelectItemIndicator>
  </SelectItem>
</template>
