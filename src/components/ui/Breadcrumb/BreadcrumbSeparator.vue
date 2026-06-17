<script setup lang="ts">
import {ChevronRight} from '@lucide/vue';
</script>

<template>
  <li role="presentation" aria-hidden="true" class="inline-flex items-center text-faint">
    <slot>
      <ChevronRight class="size-icon-small rtl:rotate-180"/>
    </slot>
  </li>
</template>
