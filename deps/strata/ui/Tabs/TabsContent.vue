<script setup lang="ts">
import { TabsContent } from 'reka-ui';

defineProps({ value: { type: String, required: true } });
</script>

<template>
  <TabsContent
    :value="value"
    class="rounded-small focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 data-[orientation=vertical]:min-w-0 data-[orientation=vertical]:flex-1"
  >
    <slot />
  </TabsContent>
</template>
