<script setup lang="ts">
import type { PropType } from 'vue';
// `alt` labels whichever rendering path is active: the img directly, or the
// wrapping span (role="img") when `icon` renders. Slot content labels itself.
defineProps({
  src: {type: String, default: undefined},
  icon: {type: [Object, Function], default: undefined},
  alt: {type: String, default: ''},
  size: {type: String as PropType<'sm' | 'md' | 'lg'>, default: 'lg', validator: (value: string) => ['sm', 'md', 'lg'].includes(value)},
});
const sizeClass = {
  sm: 'size-icon-small',
  md: 'size-icon-medium',
  lg: 'size-icon-large',
};
</script>

<template>
  <span
      :class="['inline-flex items-center justify-center shrink-0', sizeClass[size]]"
      :role="!src && icon && alt ? 'img' : undefined"
      :aria-label="!src && icon && alt ? alt : undefined"
  >
    <img v-if="src" :src="src" :alt="alt" class="size-full object-contain"/>
    <component :is="icon" v-else-if="icon" class="size-full" aria-hidden="true"/>
    <slot v-else/>
  </span>
</template>
