<script setup lang="ts">
import type { PropType } from 'vue';
import { NavigationMenuRoot } from 'reka-ui';

const model = defineModel<string>({ default: '' });
defineProps({
  orientation: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
    validator: (value: string) => ['horizontal', 'vertical'].includes(value),
  },
});
</script>

<template>
  <NavigationMenuRoot v-model="model" :orientation="orientation" class="relative">
    <slot />
  </NavigationMenuRoot>
</template>
