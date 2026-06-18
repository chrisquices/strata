<script setup lang="ts">
// Wrap in a BreadcrumbItem — this is a span, not an <li> like Separator.
import {MoreHorizontal} from '@lucide/vue';
</script>

<template>
  <span class="inline-flex items-center text-faint">
    <span aria-hidden="true" class="inline-flex">
      <MoreHorizontal class="size-icon-small"/>
    </span>
    <span class="sr-only">More</span>
  </span>
</template>
