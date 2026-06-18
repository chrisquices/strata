<script setup lang="ts">
import { computed, inject } from 'vue';

// Tint follows the banner: muted on the default variant, inherits the variant color otherwise.
const variant = inject('bannerVariant', null);
const toneClass = computed(() => ((variant?.value ?? 'secondary') === 'secondary' ? 'text-muted' : ''));
</script>

<template>
  <p :class="['text-xs', toneClass]">
    <slot />
  </p>
</template>
