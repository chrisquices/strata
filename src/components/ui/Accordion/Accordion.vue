<script setup lang="ts">
import type {PropType} from 'vue';
import {AccordionRoot} from 'reka-ui';

const props = defineProps({
  type: {
    type: String as PropType<'single' | 'multiple'>,
    default: 'single',
    validator: (value: string) => ['single', 'multiple'].includes(value)
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
      :type="props.type"
      :collapsible="props.collapsible"
      :default-value="props.defaultValue"
      :disabled="props.disabled"
      :unmount-on-hide="props.unmountOnHide"
  >
    <slot :model-value="modelValue"/>
  </AccordionRoot>
</template>
