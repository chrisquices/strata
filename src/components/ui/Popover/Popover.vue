<script setup lang="ts">
// Floating content anchored to a trigger. Compose: Popover > PopoverTrigger + PopoverContent
// (+ optional PopoverClose). v-model:open for controlled open state. Dismisses on outside-click/Escape.
import { PopoverRoot } from 'reka-ui';

defineProps({ defaultOpen: { type: Boolean, default: false } });
const open = defineModel<boolean>('open', { default: undefined });
</script>

<template>
  <PopoverRoot v-model:open="open" :default-open="defaultOpen">
    <slot />
  </PopoverRoot>
</template>
