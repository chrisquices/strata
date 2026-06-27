<script setup lang="ts">
import {ContextMenuLabel} from 'reka-ui';

defineProps({icon: {default: undefined}});
</script>

<template>
  <ContextMenuLabel
      class="flex h-control items-center gap-2 rounded-medium px-3 text-sm font-medium text-faint">
    <span v-if="icon" class="grid size-icon-medium shrink-0 place-items-center text-current" aria-hidden="true">
      <component :is="icon" class="size-icon-medium"/>
    </span>
    <span class="min-w-0 flex-1 truncate"><slot/></span>
  </ContextMenuLabel>
</template>
