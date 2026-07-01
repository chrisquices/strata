<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue';
import { PaginationPrev } from 'reka-ui';

const props = defineProps({ label: { type: String, default: 'Go to previous page' } });
const baseClass =
  'inline-flex h-control items-center gap-cluster-small rounded-medium px-control-x text-sm font-medium text-muted transition-colors duration-100 hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50';
</script>

<template>
  <PaginationPrev :aria-label="props.label" :class="baseClass">
    <ChevronLeft class="size-icon" aria-hidden="true" />
    <span class="hidden sm:inline"><slot>Previous</slot></span>
  </PaginationPrev>
</template>
