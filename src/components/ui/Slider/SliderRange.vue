<script setup lang="ts">
import { inject } from 'vue';
import { SliderRange } from 'reka-ui';
const style = inject('sliderStyle', { trackClass: 'h-1.5', thumbClass: 'size-indicator top-1/2 -mt-[calc(var(--spacing-indicator)/2)]' });
</script>

<template>
  <SliderRange :class="['absolute rounded-full bg-foreground', style.trackClass]" />
</template>
