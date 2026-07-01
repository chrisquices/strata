<script setup lang="ts">
// A set of related checkboxes sharing one v-model (an array of the checked items' values).
// Compose: CheckboxGroup > CheckboxGroupItem. reka manages the array + roving-focus arrow nav;
// `name` emits one hidden input per checked value for form submission.
import type {PropType} from 'vue';
import {computed} from 'vue';
import {CheckboxGroupRoot} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  disabled: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  orientation: {
    type: String as PropType<'vertical' | 'horizontal'>,
    default: 'vertical',
    validator: (value: string) => ['vertical', 'horizontal'].includes(value)
  },
  rovingFocus: {type: Boolean, default: true}, // Arrow-key navigation between items with a single tab stop (reka default). Off = each item is tabbable.
  loop: {type: Boolean, default: false}, // Wrap focus at the group boundaries when navigating with arrows.
});

const model = defineModel<(string | number)[]>();

const baseClass = computed(() => (props.orientation === 'horizontal' ? 'flex flex-row flex-wrap gap-x-6 gap-y-cluster-small' : 'flex flex-col gap-cluster-large'));
</script>

<template>
  <CheckboxGroupRoot
      v-bind="$attrs"
      v-model="model"
      :disabled="props.disabled"
      :name="props.name"
      :required="props.required"
      :orientation="props.orientation"
      :roving-focus="props.rovingFocus"
      :loop="props.loop"
      :class="cn(baseClass, $attrs.class)"
  >
    <slot/>
  </CheckboxGroupRoot>
</template>
