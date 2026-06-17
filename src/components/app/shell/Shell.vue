<script setup lang="ts">
// Page content container — fills the area below the full-width topbar (between the sidebars) and
// scrolls internally. The topbar and sidebars now live in App.vue; pages only own their content.
// `active`/`fill` are accepted for backward compatibility but no longer used.
defineProps({ active: { default: '' }, fill: { type: Boolean, default: false } });
</script>

<template>
  <div class="min-w-0 flex-1 overflow-y-auto">
    <slot />
  </div>
</template>
