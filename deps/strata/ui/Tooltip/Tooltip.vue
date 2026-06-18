<script setup lang="ts">
// Hover/focus tooltip. Compose: Tooltip > TooltipTrigger + TooltipContent.
// Bundles reka's TooltipProvider so a lone <Tooltip> works without app-level setup.
import { TooltipProvider, TooltipRoot } from 'reka-ui';

defineProps({ delay: { type: Number, default: 300 } });
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot>
      <slot />
    </TooltipRoot>
  </TooltipProvider>
</template>
