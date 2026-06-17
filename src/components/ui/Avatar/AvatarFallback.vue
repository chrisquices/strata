<script setup lang="ts">
import { AvatarFallback } from 'reka-ui';
defineProps({ delayMs: { type: Number, default: undefined } });
</script>

<template>
  <AvatarFallback :delay-ms="delayMs" class="flex h-full w-full items-center justify-center bg-surface text-muted font-medium text-xs uppercase">
    <slot />
  </AvatarFallback>
</template>
