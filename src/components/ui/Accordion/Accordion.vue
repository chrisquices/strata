<script setup lang="ts">
import type {PropType} from 'vue';
import {AccordionRoot} from 'reka-ui';

defineProps({
  type: {
    type: String as PropType<'single' | 'multiple'>,
    default: 'single',
    validator: function (value: string) {
      return ['single', 'multiple'].includes(value);
    }
  },
  collapsible: {type: Boolean, default: false},
  defaultValue: {type: [String, Array], default: undefined},
  disabled: {type: Boolean, default: false},
  unmountOnHide: {type: Boolean, default: true},
});
const model = defineModel<string | string[]>();
</script>

<template>
  <AccordionRoot
      v-slot="{ modelValue }"
      v-model="model"
      :type="type"
      :collapsible="collapsible"
      :default-value="defaultValue"
      :disabled="disabled"
      :unmount-on-hide="unmountOnHide"
  >
    <slot :model-value="modelValue"/>
  </AccordionRoot>
</template>
