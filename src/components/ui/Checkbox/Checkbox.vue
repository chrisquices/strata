<script setup lang="ts">
import type {PropType} from 'vue';
import {CheckboxIndicator, CheckboxRoot} from 'reka-ui';
import {Check, Minus} from '@lucide/vue';

defineProps({
  disabled: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  value: {type: [String, Number], default: undefined},
  defaultChecked: {
    type: [Boolean, String] as PropType<boolean | 'indeterminate'>,
    default: undefined,
    validator: function (value: unknown) {
      return typeof value === 'boolean' || value === 'indeterminate';
    },
  },
});

// No model default: stays undefined while unbound so reka runs uncontrolled and honors defaultChecked.
const checked = defineModel<boolean | 'indeterminate'>('checked');
</script>

<template>
  <CheckboxRoot
      v-slot="{ state }"
      v-model="checked"
      :default-value="defaultChecked"
      :disabled="disabled"
      :name="name"
      :required="required"
      :value="value"
      :class="['group inline-flex focus-visible:outline-none', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default']"
  >
    <span class="flex size-control-indicator shrink-0 items-center justify-center rounded-small border border-border bg-background transition-colors duration-100 group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=indeterminate]:border-foreground group-data-[state=indeterminate]:bg-foreground group-data-[state=unchecked]:group-hover:border-foreground/50 group-focus-visible:ring-2 group-focus-visible:ring-foreground/30">
      <CheckboxIndicator class="flex items-center justify-center text-background">
        <Minus v-if="state === 'indeterminate'" class="size-icon-small" aria-hidden="true"/>
        <Check v-else class="size-icon-small" aria-hidden="true"/>
      </CheckboxIndicator>
    </span>
    <span v-if="$slots.default"><slot :state="state"/></span>
  </CheckboxRoot>
</template>
