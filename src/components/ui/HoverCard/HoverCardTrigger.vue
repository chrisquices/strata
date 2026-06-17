<script setup lang="ts">
// Pass a single focusable element (e.g. a Button). reka merges the trigger behavior
// onto it via as-child, so the card is reachable by both hover and keyboard focus.
import { HoverCardTrigger } from 'reka-ui';
</script>

<template>
  <HoverCardTrigger as-child>
    <slot />
  </HoverCardTrigger>
</template>
