<script setup lang="ts">
import {TooltipProvider, TooltipRoot} from 'reka-ui';

// Hover/focus tooltip. Compose: Tooltip > TooltipTrigger + TooltipContent.
// Bundles reka's TooltipProvider so a lone <Tooltip> works without app-level setup.
defineProps({delay: {type: Number, default: 0}});
</script>

<template>
  <TooltipProvider :delay-duration="delay">
    <TooltipRoot>
      <slot/>
    </TooltipRoot>
  </TooltipProvider>
</template>
