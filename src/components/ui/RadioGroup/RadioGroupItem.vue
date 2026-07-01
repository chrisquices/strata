<script setup lang="ts">
import type {PropType} from 'vue';
import {RadioGroupIndicator, RadioGroupItem} from 'reka-ui';

const props = defineProps({
  value: {type: [String, Number], required: true},
  disabled: {type: Boolean, default: false},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
});

const sizeClass = {sm: 'size-indicator-small', md: 'size-indicator', lg: 'size-indicator-large'};

const dotSizeClass = {sm: 'size-1', md: 'size-1.5', lg: 'size-2'};
</script>

<template>
  <RadioGroupItem
      :value="props.value"
      :disabled="props.disabled"
      :class="'group flex cursor-default items-center gap-cluster-small text-sm text-foreground transition-colors focus-visible:outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:text-faint data-[disabled]:opacity-50'"
  >
    <span
        :class="['flex shrink-0 items-center justify-center rounded-full border-medium border-muted transition-colors duration-100 group-data-[state=checked]:border-foreground group-data-[state=unchecked]:group-hover:border-foreground/50 group-focus-visible:ring-2 group-focus-visible:ring-foreground/30 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background', sizeClass[props.size]]">
      <RadioGroupIndicator :class="[dotSizeClass[props.size], 'rounded-full bg-foreground']"/>
    </span>
    <span v-if="$slots.default"><slot/></span>
  </RadioGroupItem>
</template>
