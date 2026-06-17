<script setup lang="ts">
// Rich card shown on hover/focus. Compose: HoverCard > HoverCardTrigger + HoverCardContent.
// `delay` is the open delay (ms).
import { HoverCardRoot } from 'reka-ui';

defineProps({ delay: { type: Number, default: 400 } });
</script>

<template>
  <HoverCardRoot :open-delay="delay">
    <slot />
  </HoverCardRoot>
</template>
