<script setup lang="ts">
import {computed, inject} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

// Tint follows the banner: muted on the default variant, inherits the variant color otherwise.
const variant = inject('bannerVariant', null);

const toneClass = computed(() => (variant?.value ?? 'secondary') === 'secondary' ? 'text-muted' : '');
</script>

<template>
  <p v-bind="$attrs" :class="cn('text-xs', toneClass, $attrs.class)">
    <slot/>
  </p>
</template>
