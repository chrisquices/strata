<script setup lang="ts">
import { NavigationMenuContent } from 'reka-ui';
</script>

<!-- Positioned inline under its item (no NavigationMenuViewport); the parent NavigationMenuItem is relative. -->
<template>
  <NavigationMenuContent
    class="absolute left-0 top-full z-popover mt-2 min-w-64 origin-top rounded-large border border-border bg-surface p-2 shadow-panel"
  >
    <slot />
  </NavigationMenuContent>
</template>
