<script setup lang="ts">
import type { PropType } from 'vue';
import { ListboxItem, ListboxItemIndicator } from 'reka-ui';
import { Check } from '@lucide/vue';

defineProps({ value: { type: [String, Number] as PropType<string | number>, required: true }, disabled: { type: Boolean, default: false } });
</script>

<template>
  <ListboxItem
    :value="value"
    :disabled="disabled"
    class="flex cursor-default items-center gap-2 rounded-medium px-2 py-1.5 text-sm text-foreground transition-colors duration-100 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/40 data-[highlighted]:bg-border data-[state=checked]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-50"
  >
    <span class="min-w-0 flex-1 truncate"><slot /></span>
    <ListboxItemIndicator class="flex shrink-0">
      <Check class="size-icon-small text-foreground" aria-hidden="true" />
    </ListboxItemIndicator>
  </ListboxItem>
</template>
