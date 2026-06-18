<script setup lang="ts">
import { MenubarMenu } from 'reka-ui';
defineProps({ value: { default: undefined } });
</script>

<template>
  <MenubarMenu :value="value">
    <slot />
  </MenubarMenu>
</template>
