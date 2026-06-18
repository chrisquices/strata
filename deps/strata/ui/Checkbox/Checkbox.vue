<script setup lang="ts">
import type { PropType } from 'vue';
import { CheckboxRoot } from 'reka-ui';

defineProps({
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  defaultChecked: {
    type: [Boolean, String] as PropType<boolean | 'indeterminate'>,
    default: undefined,
    validator: (value: unknown) => typeof value === 'boolean' || value === 'indeterminate',
  },
});
// No model default: stays undefined while unbound so reka runs uncontrolled and honors defaultChecked.
const checked = defineModel<boolean | 'indeterminate'>('checked');
</script>

<template>
  <CheckboxRoot
    v-slot="{ modelValue, state }"
    v-model="checked"
    :default-value="defaultChecked"
    :disabled="disabled"
    :name="name"
    :required="required"
    :class="['flex size-control-indicator shrink-0 items-center justify-center rounded-small border transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=indeterminate]:border-foreground data-[state=indeterminate]:bg-foreground data-[state=unchecked]:border-border data-[state=unchecked]:bg-background data-[state=unchecked]:hover:border-foreground/50', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default']"
  >
    <slot :checked="modelValue === true" :state="state" />
  </CheckboxRoot>
</template>
