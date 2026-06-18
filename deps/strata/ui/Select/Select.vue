<script setup lang="ts">
// Single-choice dropdown built on reka's Select. Compose: Select > SelectTrigger + SelectContent > SelectItem.
// For a searchable picker, use Combobox instead.
import { provide, reactive, computed } from 'vue';
import { SelectRoot } from 'reka-ui';

const props = defineProps({
  placeholder: { type: String, default: 'Select…' },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});
const model = defineModel<string | number>();

provide('selectMeta', reactive({
  placeholder: computed(() => props.placeholder),
}));
</script>

<template>
  <SelectRoot v-model="model" :name="name" :required="required" :disabled="disabled">
    <slot />
  </SelectRoot>
</template>
