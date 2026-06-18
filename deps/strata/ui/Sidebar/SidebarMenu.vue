<script setup lang="ts">
defineProps({
  alignIcons: { type: Boolean, default: false },
});
</script>

<template>
  <ul class="strata-sidebar-menu flex flex-col" :data-align-icons="alignIcons || undefined">
    <slot />
  </ul>
</template>
