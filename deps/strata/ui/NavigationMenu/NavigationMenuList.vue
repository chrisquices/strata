<script setup lang="ts">
import { NavigationMenuList } from 'reka-ui';
</script>

<template>
  <NavigationMenuList class="flex items-center gap-1 data-[orientation=vertical]:flex-col data-[orientation=vertical]:items-stretch">
    <slot />
  </NavigationMenuList>
</template>
