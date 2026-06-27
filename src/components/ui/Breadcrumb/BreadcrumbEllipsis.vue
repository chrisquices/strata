<script setup lang="ts">
import {MoreHorizontal} from '@lucide/vue';
</script>

<template>
  <li class="inline-flex items-center text-faint">
    <span aria-hidden="true" class="inline-flex">
      <MoreHorizontal class="size-icon-small"/>
    </span>
    <span class="sr-only">More</span>
  </li>
</template>
