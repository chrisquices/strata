<script setup lang="ts">
import type { PropType } from 'vue';

defineProps({
  as: {
    type: String as PropType<'div' | 'fieldset'>,
    default: 'div',
    validator: function (value: string) {
      return ['div', 'fieldset'].includes(value);
    },
  },
});
</script>

<template>
  <component :is="as" class="gap-3 m-0 grid min-w-0 border-0 p-0">
    <slot />
  </component>
</template>
