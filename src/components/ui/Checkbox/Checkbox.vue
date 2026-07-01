<script setup lang="ts">
import type {PropType} from 'vue';
import {CheckboxIndicator, CheckboxRoot} from 'reka-ui';
import {Check, Minus} from '@lucide/vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  disabled: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  value: {type: [String, Number], default: undefined},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
  defaultChecked: {
    type: [Boolean, String] as PropType<boolean | 'indeterminate'>,
    default: undefined,
    validator: (value: unknown) => typeof value === 'boolean' || value === 'indeterminate',
  },
});

const sizeClass = {sm: 'size-indicator-small', md: 'size-indicator', lg: 'size-indicator-large'};

const iconSizeClass = {sm: 'size-icon-extra-small', md: 'size-icon-small', lg: 'size-icon'};

const roundedClass = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large'};

// No model default: stays undefined while unbound so reka runs uncontrolled and honors defaultChecked.
const checked = defineModel<boolean | 'indeterminate'>('checked');
</script>

<template>
  <CheckboxRoot
      v-bind="$attrs"
      v-slot="{ state }"
      v-model="checked"
      :default-value="props.defaultChecked"
      :disabled="props.disabled"
      :name="props.name"
      :required="props.required"
      :value="props.value"
      :class="cn('group inline-flex focus-visible:outline-none', props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default', $attrs.class)"
  >
    <span
        :class="['flex shrink-0 items-center justify-center border border-border bg-background transition-colors duration-100 group-data-[state=checked]:border-foreground group-data-[state=checked]:bg-foreground group-data-[state=indeterminate]:border-foreground group-data-[state=indeterminate]:bg-foreground group-data-[state=unchecked]:group-hover:border-foreground/50 group-focus-visible:ring-2 group-focus-visible:ring-foreground/30', sizeClass[props.size], roundedClass[props.size]]">
      <CheckboxIndicator force-mount class="flex items-center justify-center text-background">
        <Transition
            enter-active-class="transition duration-100 ease-out"
            enter-from-class="opacity-0 scale-75"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-75"
            mode="out-in"
        >
          <Minus v-if="state === 'indeterminate'" key="indeterminate" :class="iconSizeClass[props.size]" aria-hidden="true"/>
          <Check v-else-if="state === true || state === 'checked'" key="checked" :class="iconSizeClass[props.size]"
                 aria-hidden="true"/>
        </Transition>
      </CheckboxIndicator>
    </span>
    <span v-if="$slots.default"><slot :state="state"/></span>
  </CheckboxRoot>
</template>
