<script setup lang="ts">
// Pass a single focusable element (e.g. a Button). reka merges the trigger behavior
// onto it via as-child, so the tooltip is reachable by both hover and keyboard focus.
import { TooltipTrigger } from 'reka-ui';
</script>

<template>
  <TooltipTrigger as-child>
    <slot />
  </TooltipTrigger>
</template>
