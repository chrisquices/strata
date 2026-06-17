<script setup lang="ts">
import Caption from '../Caption/Caption.vue';
defineProps({ label: { type: String, default: undefined } });
</script>

<template>
  <div class="flex flex-col">
    <Caption v-if="label" as="div" class="h-control px-4 flex items-center">{{ label }}</Caption>
    <slot />
  </div>
</template>
