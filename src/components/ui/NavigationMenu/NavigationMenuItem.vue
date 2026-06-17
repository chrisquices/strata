<script setup lang="ts">
import { NavigationMenuItem } from 'reka-ui';
defineProps({ value: { default: undefined } });
</script>

<template>
  <NavigationMenuItem :value="value" class="relative">
    <slot />
  </NavigationMenuItem>
</template>
