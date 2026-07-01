<script setup lang="ts">
import {HoverCardRoot} from 'reka-ui';

defineProps({delay: {type: Number, default: 300}});
</script>

<template>
  <HoverCardRoot :open-delay="delay">
    <slot/>
  </HoverCardRoot>
</template>
