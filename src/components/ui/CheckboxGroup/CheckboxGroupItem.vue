<script setup lang="ts">
// One checkbox within a CheckboxGroup. `value` is what this item contributes to the group's array
// (must be unique within the group). State is owned by the group — no per-item v-model.
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui';
import { Check } from '@lucide/vue';

defineProps({ value: { required: true }, disabled: { type: Boolean, default: false } });
</script>

<template>
  <CheckboxRoot
    :value="value"
    :disabled="disabled"
    :class="'group flex cursor-default items-center gap-2.5 text-sm text-foreground transition-colors focus-visible:outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-50'"
  >
    <span class="flex size-control-indicator shrink-0 items-center justify-center rounded-small border border-border bg-background transition-colors duration-fast group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=unchecked]:group-hover:border-foreground/50 group-focus-visible:ring-2 group-focus-visible:ring-foreground/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background">
      <CheckboxIndicator class="flex">
        <Check class="size-icon-small text-background" aria-hidden="true" />
      </CheckboxIndicator>
    </span>
    <span v-if="$slots.default"><slot /></span>
  </CheckboxRoot>
</template>
