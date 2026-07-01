<script setup lang="ts">
// One checkbox within a CheckboxGroup. `value` is what this item contributes to the group's array
// (must be unique within the group). State is owned by the group — no per-item v-model.
import Checkbox from '../Checkbox/Checkbox.vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  value: {type: [String, Number], required: true},
  disabled: {type: Boolean, default: false},
});
</script>

<template>
  <Checkbox
      v-bind="$attrs"
      :value="props.value"
      :disabled="props.disabled"
      :class="cn('items-center gap-2.5 text-sm text-foreground transition-colors select-none data-[disabled]:text-faint', $attrs.class)"
  >
    <slot/>
  </Checkbox>
</template>
