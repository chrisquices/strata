<script setup lang="ts">
import { DropdownMenuLabel } from 'reka-ui';

defineProps({ icon: { default: undefined } });
</script>

<template>
  <DropdownMenuLabel class="-mx-1 -mt-1 mb-1 flex items-center gap-2.5 border-b border-border px-3 py-3">
    <span v-if="icon" class="grid size-icon-medium shrink-0 place-items-center text-faint" aria-hidden="true">
      <component :is="icon" class="size-icon-medium" />
    </span>
    <span class="min-w-0 flex-1 truncate text-xs font-medium text-foreground"><slot /></span>
  </DropdownMenuLabel>
</template>
