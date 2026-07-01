<script setup lang="ts">
import { PinInputInput } from 'reka-ui';

const props = defineProps({
  index: { type: Number, required: true },
});
</script>

<template>
  <PinInputInput
    :index="props.index"
    class="flex h-control aspect-square items-center justify-center rounded-medium border border-border bg-input text-center text-sm text-foreground transition-colors duration-100 focus-visible:border-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  />
</template>
