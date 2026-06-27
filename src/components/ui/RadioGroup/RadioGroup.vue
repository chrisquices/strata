<script setup lang="ts">
// Mutually exclusive options. Compose: RadioGroup > RadioGroupItem. v-model holds the chosen value;
// arrow keys move between items. `orientation` sets layout + arrow direction; `name` enables form submission.
import type {PropType} from 'vue';
import {computed} from 'vue';
import {RadioGroupRoot} from 'reka-ui';

const props = defineProps({
  disabled: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  orientation: {
    type: String as PropType<'vertical' | 'horizontal'>,
    default: 'vertical',
    validator: function (value: string) {
      return ['vertical', 'horizontal'].includes(value);
    }
  },

  // Wrap focus at the group boundaries when navigating with arrows.
  loop: {type: Boolean, default: true},
});
const model = defineModel<string | number>();

// Provide a sensible default layout; orientation also drives reka's arrow-key direction.
const layout = computed(function () {
  return props.orientation === 'horizontal' ? 'flex flex-row flex-wrap gap-x-6 gap-y-2' : 'flex flex-col gap-4';
});
</script>

<template>
  <RadioGroupRoot
      v-model="model"
      :disabled="disabled"
      :name="name"
      :required="required"
      :orientation="orientation"
      :loop="loop"
      :class="layout"
  >
    <slot/>
  </RadioGroupRoot>
</template>
