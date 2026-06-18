<script setup lang="ts">
import { NavigationMenuTrigger } from 'reka-ui';
import { ChevronDown } from '@lucide/vue';
</script>

<template>
  <NavigationMenuTrigger
    class="group inline-flex h-control items-center gap-1 rounded-medium px-3 text-sm font-medium text-muted transition-colors duration-100 select-none hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 data-[state=open]:bg-border data-[state=open]:text-foreground"
  >
    <slot />
    <ChevronDown aria-hidden="true" class="size-icon-small text-faint transition-transform duration-100 group-data-[state=open]:rotate-180" />
  </NavigationMenuTrigger>
</template>
