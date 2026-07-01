<script setup lang="ts">
import {DropdownMenuLabel} from 'reka-ui';

defineProps({icon: {default: undefined}});
</script>

<template>
  <DropdownMenuLabel
      class="flex h-control items-center gap-cluster-small rounded-medium px-control-x text-sm text-faint">
    <span v-if="icon" class="grid size-icon shrink-0 place-items-center text-current" aria-hidden="true">
      <component :is="icon" class="size-icon"/>
    </span>
    <span class="min-w-0 flex-1 truncate"><slot/></span>
  </DropdownMenuLabel>
</template>
