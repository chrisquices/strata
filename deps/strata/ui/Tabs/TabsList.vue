<script setup lang="ts">
import { TabsList } from 'reka-ui';
</script>

<template>
  <TabsList class="flex border-border data-[orientation=horizontal]:border-b data-[orientation=vertical]:shrink-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-r">
    <slot />
  </TabsList>
</template>
