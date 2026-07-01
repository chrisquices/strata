<script setup lang="ts">
import type { PropType } from 'vue';
import {cn} from '../utils';

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
  <component :is="as" :class="cn('m-0 grid min-w-0 gap-form-small border-0 p-0', $attrs.class)">
    <slot />
  </component>
</template>
