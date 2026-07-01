<script setup lang="ts">
import { SelectRoot } from 'reka-ui';

const props = defineProps({
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const model = defineModel<string | number>();
</script>

<template>
  <SelectRoot v-model="model" :name="props.name" :required="props.required" :disabled="props.disabled">
    <slot />
  </SelectRoot>
</template>
