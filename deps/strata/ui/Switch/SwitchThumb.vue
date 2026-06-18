<script setup lang="ts">
import { SwitchThumb } from 'reka-ui';
</script>

<template>
  <SwitchThumb
    class="pointer-events-none block size-control-indicator rounded-full bg-background shadow-panel transition-transform duration-100 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
  />
</template>
