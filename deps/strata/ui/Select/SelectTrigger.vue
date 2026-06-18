<script setup lang="ts">
import { inject } from 'vue';
import { ChevronDown } from '@lucide/vue';
import { SelectTrigger, SelectValue } from 'reka-ui';

const meta = inject('selectMeta', {});
</script>

<template>
  <SelectTrigger
    class="group flex h-control w-full items-center justify-between gap-2 rounded-medium border border-border bg-input px-3 text-sm transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
  >
    <SelectValue :placeholder="meta.placeholder" class="flex-1 truncate text-left text-foreground" />
    <ChevronDown class="size-icon-small shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
  </SelectTrigger>
</template>
