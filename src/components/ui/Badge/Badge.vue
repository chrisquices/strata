<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'warning'>,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'].includes(value),
  },
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
  radius: {
    type: String as PropType<'sm' | 'md' | 'lg' | 'full'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg', 'full'].includes(value),
  },
  outline: {type: Boolean, default: false},
  dot: {type: Boolean, default: false},
});

// A badge is a static label, so it carries none of Button's interactive chrome:
// no transitions, hover, active, focus ring, or disabled handling.
const baseClass = 'inline-flex justify-center max-w-full items-center overflow-hidden font-medium whitespace-nowrap uppercase tracking-widest tabular-nums';

const radiusClasses = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full'};

const sizeTextClasses = {
  sm: 'h-tag-small px-tag-x-small text-2xs',
  md: 'h-tag px-tag-x text-xs',
  lg: 'h-tag-large px-tag-x-large text-sm',
};

// Filled mirrors Button's resting state — Button's hover-only fills are dropped,
// since a badge has no hover. Ghost therefore stays transparent, like Button at rest.
const filledClasses = {
  primary: 'bg-foreground text-background',
  secondary: 'bg-surface text-foreground border border-border',
  ghost: 'bg-transparent text-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
};

const outlinedClasses = {
  primary: 'bg-transparent text-foreground border border-foreground',
  secondary: 'bg-transparent text-foreground border border-border',
  ghost: 'bg-transparent text-foreground', // Ghost has no chrome to outline, so its outline form mirrors the filled ghost.
  destructive: 'bg-transparent text-destructive border border-destructive',
  success: 'bg-transparent text-success border border-success',
  warning: 'bg-transparent text-warning border border-warning',
};

// Dot colors contrast the badge background: dotFilledClasses shows on the solid/tinted
// fill; dotOutlinedClasses uses the variant accent against the transparent outline.
const dotFilledClasses = {
  primary: 'bg-background',
  secondary: 'bg-foreground',
  ghost: 'bg-foreground',
  destructive: 'bg-destructive-foreground',
  success: 'bg-success-foreground',
  warning: 'bg-warning-foreground',
};

const dotOutlinedClasses = {
  primary: 'bg-foreground',
  secondary: 'bg-foreground',
  ghost: 'bg-foreground',
  destructive: 'bg-destructive',
  success: 'bg-success',
  warning: 'bg-warning',
};

const variantClass = computed(() => props.outline ? outlinedClasses[props.variant] : filledClasses[props.variant]);

const sizeClass = computed(() => sizeTextClasses[props.size]);

const radiusClass = computed(() => radiusClasses[props.radius]);

const dotColor = computed(() => props.outline ? dotOutlinedClasses[props.variant] : dotFilledClasses[props.variant]);
</script>

<template>
  <span v-bind="$attrs" :class="cn(baseClass, variantClass, sizeClass, radiusClass, $attrs.class)">
    <span class="inline-flex min-w-0 items-center gap-2">
      <span v-if="dot" :class="['size-1.5 shrink-0 rounded-full', dotColor]" aria-hidden="true"></span>
      <span class="min-w-0 truncate"><slot/></span>
    </span>
  </span>
</template>
