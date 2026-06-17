<script setup lang="ts">
defineProps({
  alignIcons: { type: Boolean, default: false },
});
</script>

<template>
  <ul class="strata-sidebar-menu-sub mx-3 flex flex-col border-l border-border/70 py-1 pl-3" :data-align-icons="alignIcons || undefined">
    <slot />
  </ul>
</template>
