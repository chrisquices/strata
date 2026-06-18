<script setup lang="ts">
import type { PropType } from 'vue';
import {computed} from 'vue';

const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost' | 'muted' | 'destructive' | 'success' | 'warning'>,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'ghost', 'muted', 'destructive', 'success', 'warning'].includes(value),
  },
  size: {type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value)},
  radius: {type: String as PropType<'sm' | 'md' | 'lg' | 'full'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg', 'full'].includes(value)},
  outline: {type: Boolean, default: false},
  dot: {type: Boolean, default: false},
});

const sizeClasses = {
  sm: 'px-2 py-0 text-2xs',
  md: 'px-2.5 py-0.5 text-xs',
  lg: 'px-3 py-1 text-sm',
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
// Dot colors contrast the badge background: dotFilled shows on the solid/tinted
// fill; dotOutlined uses the variant accent against the transparent outline.
const dotFilled = {
  primary: 'bg-background',
  secondary: 'bg-foreground',
  ghost: 'bg-foreground',
  muted: 'bg-muted',
  destructive: 'bg-destructive-foreground',
  success: 'bg-success-foreground',
  warning: 'bg-warning-foreground',
};
const dotOutlined = {
  primary: 'bg-foreground',
  secondary: 'bg-foreground',
  ghost: 'bg-foreground',
  muted: 'bg-muted',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
};

const variantClass = computed(() => (props.outline ? outlined[props.variant] : filled[props.variant]));
const sizeClass = computed(() => sizeClasses[props.size]);
const radiusClass = computed(() => radiusClasses[props.radius]);
const dotColor = computed(() => (props.outline ? dotOutlined[props.variant] : dotFilled[props.variant]));
</script>

<template>
  <span
      :class="[
      'inline-flex max-w-full items-center gap-2 overflow-hidden whitespace-nowrap font-medium uppercase tracking-widest tabular-nums',
      sizeClass,
      radiusClass,
      variantClass,
    ]"
  >
    <span v-if="dot" :class="['size-1.5 shrink-0 rounded-full', dotColor]" aria-hidden="true"></span>
    <span class="min-w-0 truncate"><slot/></span>
  </span>
</template>
