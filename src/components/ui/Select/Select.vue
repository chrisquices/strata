<script setup lang="ts">
import { SelectRoot } from 'reka-ui';

defineProps({
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const model = defineModel<string | number>();
</script>

<template>
  <SelectRoot v-model="model" :name="name" :required="required" :disabled="disabled">
    <slot />
  </SelectRoot>
</template>
