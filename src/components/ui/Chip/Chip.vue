<script setup lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';
import { X } from '@lucide/vue';

const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost' | 'muted' | 'destructive' | 'success' | 'warning'>,
    default: 'ghost',
    validator: (value: string) => ['primary', 'secondary', 'ghost', 'muted', 'destructive', 'success', 'warning'].includes(value),
  },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  radius: { type: String as PropType<'sm' | 'md' | 'lg' | 'full'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg', 'full'].includes(value) },
  outline: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  dismissible: { type: Boolean, default: false },
});
const emit = defineEmits<{ dismiss: [] }>();

const sizeClasses = {
  sm: 'h-5 px-2 text-2xs',
  md: 'h-control-small px-2.5 text-xs',
  lg: 'h-control px-3 text-sm',
};
const radiusClasses = { sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full' };
const filled = {
  primary: 'bg-foreground text-background',
  secondary: 'bg-surface text-foreground border border-border',
  ghost: 'bg-foreground/10 text-foreground',
  muted: 'bg-transparent text-muted',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
};
const outlined = {
  primary: 'bg-transparent text-foreground border border-foreground',
  secondary: 'bg-transparent text-foreground border border-border',
  ghost: 'bg-transparent text-foreground border border-border',
  muted: 'bg-transparent text-muted border border-border',
  destructive: 'bg-transparent text-destructive border border-destructive',
  success: 'bg-transparent text-success border border-success',
  warning: 'bg-transparent text-warning border border-warning',
};
// Per-variant hover background for the remove button, contrasting each chip background.
const dismissFilled = {
  primary: 'hover:bg-background/20',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/20',
  muted: 'hover:bg-foreground/10',
  destructive: 'hover:bg-destructive-foreground/20',
  success: 'hover:bg-success-foreground/20',
  warning: 'hover:bg-warning-foreground/20',
};
const dismissOutlined = {
  primary: 'hover:bg-foreground/10',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/10',
  muted: 'hover:bg-foreground/10',
  destructive: 'hover:bg-destructive/20',
  success: 'hover:bg-success/20',
  warning: 'hover:bg-warning/20',
};

const variantClass = computed(() => (props.outline ? outlined[props.variant] : filled[props.variant]));
const sizeClass = computed(() => sizeClasses[props.size]);
const radiusClass = computed(() => radiusClasses[props.radius]);
const dismissHover = computed(() => (props.outline ? dismissOutlined[props.variant] : dismissFilled[props.variant]));
</script>

<template>
  <span :class="['inline-flex max-w-full items-center gap-1 overflow-hidden font-medium transition-colors duration-fast', sizeClass, radiusClass, variantClass, disabled ? 'opacity-50' : '']">
    <span class="min-w-0 truncate"><slot /></span>
    <button
      v-if="dismissible"
      type="button"
      aria-label="Remove"
      :disabled="disabled"
      :class="['-mr-1 inline-flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', disabled ? 'pointer-events-none' : dismissHover]"
      @click="!disabled && emit('dismiss')"
    >
      <X class="size-icon-extra-small" aria-hidden="true" />
    </button>
  </span>
</template>
