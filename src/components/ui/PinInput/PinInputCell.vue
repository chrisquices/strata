<script setup lang="ts">
import { PinInputInput } from 'reka-ui';

defineProps({
  index: { type: Number, required: true },
});
</script>

<template>
  <PinInputInput
    :index="index"
    class="flex h-control w-10 items-center justify-center rounded-medium border border-border bg-input text-center text-sm text-foreground transition-colors duration-100 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30"
  />
</template>
