<script setup lang="ts">
import type { PropType } from 'vue';
import { Check } from '@lucide/vue';
import { SelectItem, SelectItemText, SelectItemIndicator } from 'reka-ui';

defineProps({
  value: { type: [String, Number] as PropType<string | number>, required: true },
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <SelectItem
    :value="value"
    :disabled="disabled"
    class="flex h-control w-full cursor-default items-center gap-2 rounded-medium px-3 text-sm text-foreground transition-colors duration-100 select-none focus-visible:outline-none hover:bg-border data-[highlighted]:bg-border data-[state=checked]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint"
  >
    <SelectItemText class="flex-1 truncate text-left">
      <slot />
    </SelectItemText>
    <SelectItemIndicator>
      <Check class="size-icon-small shrink-0 text-foreground" />
    </SelectItemIndicator>
  </SelectItem>
</template>
