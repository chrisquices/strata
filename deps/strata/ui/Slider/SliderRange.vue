<script setup lang="ts">
import { inject } from 'vue';
import { SliderRange } from 'reka-ui';
const style = inject('sliderStyle', { trackClass: 'h-1.5', thumbClass: 'size-4' });
</script>

<template>
  <SliderRange :class="['absolute rounded-full bg-foreground', style.trackClass]" />
</template>
