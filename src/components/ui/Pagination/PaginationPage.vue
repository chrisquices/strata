<script setup lang="ts">
import { PaginationListItem } from 'reka-ui';
defineProps({ page: { required: true, type: Object } });

const base =
  'inline-flex h-control aspect-square items-center justify-center rounded-medium text-sm font-medium text-muted transition-colors duration-fast hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[selected]:border data-[selected]:border-border data-[selected]:bg-surface data-[selected]:text-foreground';
</script>

<template>
  <PaginationListItem :value="page.value" :aria-label="`Go to page ${page.value}`" :class="base">
    {{ page.value }}
  </PaginationListItem>
</template>
