<script setup lang="ts">
import { TabsTrigger } from 'reka-ui';

const props = defineProps({
  value: { type: String, required: true },
  disabled: { type: Boolean, default: false },
});
</script>

<template>
  <TabsTrigger
    :value="value"
    :disabled="disabled"
    :class="[
      'inline-flex h-control-small shrink-0 items-center gap-2 overflow-hidden border-transparent px-4 text-sm text-muted transition-colors duration-fast select-none hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 data-[state=active]:border-foreground data-[state=active]:font-medium data-[state=active]:text-foreground',
      'data-[orientation=horizontal]:-mb-px data-[orientation=horizontal]:max-w-[14rem] data-[orientation=horizontal]:border-b-medium data-[orientation=vertical]:-mr-px data-[orientation=vertical]:w-full data-[orientation=vertical]:justify-start data-[orientation=vertical]:border-r-medium',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default',
    ]"
  >
    <span class="min-w-0 truncate"><slot /></span>
  </TabsTrigger>
</template>
