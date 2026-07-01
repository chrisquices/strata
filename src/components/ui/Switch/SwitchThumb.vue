<script setup lang="ts">
import type { PropType } from 'vue';
import { SwitchThumb } from 'reka-ui';

const props = defineProps({
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
});

const sizeClass = {sm: 'size-indicator-small', md: 'size-indicator', lg: 'size-indicator-large'};

const translateClass = {sm: 'data-[state=checked]:translate-x-3', md: 'data-[state=checked]:translate-x-4', lg: 'data-[state=checked]:translate-x-5'};
</script>

<template>
  <SwitchThumb
      :class="['pointer-events-none block rounded-full bg-background shadow-panel transition-transform duration-100 data-[state=unchecked]:translate-x-0', sizeClass[props.size], translateClass[props.size]]"
  />
</template>
