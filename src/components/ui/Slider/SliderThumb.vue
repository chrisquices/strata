<script setup lang="ts">
import { inject } from 'vue';
import { SliderThumb } from 'reka-ui';

const style = inject('sliderStyle', { trackClass: 'h-1.5', thumbClass: 'size-4' });
</script>

<template>
  <SliderThumb
    :class="['block cursor-grab rounded-full border border-foreground bg-foreground shadow-panel transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 data-[disabled]:cursor-not-allowed', style.thumbClass]"
  />
</template>
