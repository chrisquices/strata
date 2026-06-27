<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
import { PaginationNext } from 'reka-ui';

defineProps({ label: { type: String, default: 'Go to next page' } });
const base =
  'inline-flex h-control items-center gap-1 rounded-medium px-3 text-sm font-medium text-muted transition-colors duration-100 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';
</script>

<template>
  <PaginationNext :aria-label="label" :class="base">
    <span class="hidden sm:inline"><slot>Next</slot></span>
    <ChevronRight class="size-icon-medium" aria-hidden="true" />
  </PaginationNext>
</template>
