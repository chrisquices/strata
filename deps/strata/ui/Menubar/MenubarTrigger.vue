<script setup lang="ts">
import { MenubarTrigger } from 'reka-ui';
</script>

<template>
  <MenubarTrigger
    class="flex h-control-small items-center rounded-medium px-2.5 text-xs font-medium transition-colors duration-100 select-none text-muted hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 data-[state=open]:bg-border data-[state=open]:text-foreground"
  >
    <slot />
  </MenubarTrigger>
</template>
