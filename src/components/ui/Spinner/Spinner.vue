<script setup lang="ts">
import type { PropType } from 'vue';

const props = defineProps({
  size: {
    type: String as PropType<'sm' | 'lg'>,
    default: undefined,
    validator: function (value: string) {
      return ['sm', 'lg'].includes(value);
    }
  },
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'warning'>,
    default: undefined,
    validator: function (value: string) {
      return ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'].includes(value);
    }
  },
});

const sizeClass = {
  sm: 'size-icon-small border',
  default: 'size-icon-medium border-medium',
  lg: 'size-icon-large border-medium',
};

const variantClass = {
  primary: 'text-foreground',
  secondary: 'text-muted',
  ghost: 'text-foreground',
  destructive: 'text-destructive',
  success: 'text-success',
  warning: 'text-warning',
};
</script>

<template>
  <span
      aria-hidden="true"
      :class="['inline-block animate-spin rounded-full border-current border-t-transparent', props.size === 'sm' ? sizeClass.sm : props.size === 'lg' ? sizeClass.lg : sizeClass.default, props.variant ? variantClass[props.variant] : '']"
  />
</template>
