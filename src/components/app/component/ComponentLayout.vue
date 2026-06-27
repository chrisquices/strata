<script setup lang="ts">
// Shared content layout for every Components page. App.vue provides the site-wide shell and scroll
// container, so pages only own their content.
import ComponentContent from './ComponentContent.vue';
import ComponentTailwindSafelist from './ComponentTailwindSafelist.vue';
</script>

<template>
<!--  <ComponentTailwindSafelist/>-->
  <ComponentContent>
    <slot/>
  </ComponentContent>
</template>
