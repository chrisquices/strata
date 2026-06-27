<script setup lang="ts">
import {TooltipTrigger} from 'reka-ui';

// Pass a single focusable element (e.g. a Button). reka merges the trigger behavior
// onto it via as-child, so the tooltip is reachable by both hover and keyboard focus.
</script>

<template>
  <TooltipTrigger as-child>
    <slot/>
  </TooltipTrigger>
</template>
