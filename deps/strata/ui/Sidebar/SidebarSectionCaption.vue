<script setup lang="ts">
import Caption from '../Caption/Caption.vue';
</script>

<template>
  <Caption as="div" class="h-control px-4 flex items-center tracking-widest text-faint group-data-[collapsed]/sidebar:invisible">
    <slot/>
  </Caption>
</template>
