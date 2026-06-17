<script setup lang="ts">
// Shared chrome for every Components page: Shell + a content slot. The section sidebar is provided
// site-wide by the top-level NavSidebar (in the centered max-w-7xl box), so pages only own content.
import Shell from '@app/shell/Shell.vue';
import ComponentContent from './ComponentContent.vue';
import ComponentTailwindSafelist from './ComponentTailwindSafelist.vue';
</script>

<template>
  <Shell active="components" fill>
    <ComponentTailwindSafelist />
    <ComponentContent>
      <slot />
    </ComponentContent>
  </Shell>
</template>
