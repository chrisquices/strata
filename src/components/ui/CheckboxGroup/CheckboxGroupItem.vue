<script setup lang="ts">
// One checkbox within a CheckboxGroup. `value` is what this item contributes to the group's array
// (must be unique within the group). State is owned by the group — no per-item v-model.
import Checkbox from '../Checkbox/Checkbox.vue';

defineProps({
  value: {type: [String, Number], required: true},
  disabled: {type: Boolean, default: false},
});
</script>

<template>
  <Checkbox
      :value="value"
      :disabled="disabled"
      :class="'items-center gap-2.5 text-sm text-foreground transition-colors select-none data-[disabled]:text-faint'"
  >
    <slot/>
  </Checkbox>
</template>
