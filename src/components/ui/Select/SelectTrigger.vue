<script setup lang="ts">
import { ChevronDown } from '@lucide/vue';
import { SelectTrigger, SelectValue } from 'reka-ui';
</script>

<template>
  <SelectTrigger
    class="group flex h-control w-full items-center justify-between gap-2 rounded-medium border border-border bg-input py-1.5 px-control-x text-sm transition-colors hover:border-foreground/30 focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
  >
    <SelectValue v-slot="{ selectedLabel }" class="flex-1 truncate text-left text-foreground">
      <span v-if="selectedLabel.length" class="truncate">
        {{ selectedLabel.join(', ') }}
      </span>
      <span v-else class="truncate text-faint">
        <slot>
          Select an option
        </slot>
      </span>
    </SelectValue>
    <span class="group flex size-[calc(var(--spacing-control)-2px)] shrink-0 items-center justify-center -mr-control-x">
      <ChevronDown class="size-icon-small shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
    </span>
  </SelectTrigger>
</template>
