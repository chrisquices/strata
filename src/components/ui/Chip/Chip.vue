<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {X} from '@lucide/vue';
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
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  },
  radius: {
    type: String as PropType<'sm' | 'md' | 'lg' | 'full'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg', 'full'].includes(value)
  },
  outline: {type: Boolean, default: false},
  icon: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false},
  dismissible: {type: Boolean, default: false},
});

const emit = defineEmits<{ dismiss: [] }>();

const baseClass = 'relative inline-flex max-w-full items-center justify-center overflow-hidden font-medium whitespace-nowrap uppercase tracking-widest tabular-nums select-none transition-colors duration-100';

const radiusClasses = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full'};

const sizeTextClasses = {
  sm: 'h-tag-small px-tag-x-small text-2xs',
  md: 'h-tag px-tag-x text-xs',
  lg: 'h-tag-large px-tag-x-large text-sm',
};

const sizeIconClasses = {
  sm: 'h-tag-small aspect-square',
  md: 'h-tag aspect-square',
  lg: 'h-tag-large aspect-square',
};

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

const dismissFilledClasses = {
  primary: 'hover:bg-background/20',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/20',
  destructive: 'hover:bg-destructive-foreground/20',
  success: 'hover:bg-success-foreground/20',
  warning: 'hover:bg-warning-foreground/20',
};

const dismissOutlinedClasses = {
  primary: 'hover:bg-foreground/10',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/10',
  destructive: 'hover:bg-destructive/20',
  success: 'hover:bg-success/20',
  warning: 'hover:bg-warning/20',
};

const variantClass = computed(() => props.outline ? outlinedClasses[props.variant] : filledClasses[props.variant]);

const sizeClass = computed(() => props.icon ? sizeIconClasses[props.size] : sizeTextClasses[props.size]);

const radiusClass = computed(() => radiusClasses[props.radius]);

const dimmedClass = computed(() => props.disabled ? 'pointer-events-none opacity-50' : '');

const contentClass = computed(() => props.icon ? 'inline-flex min-w-0 items-center justify-center' : 'inline-flex min-w-0 items-center justify-center gap-cluster-small truncate');

const dismissHover = computed(() => props.outline ? dismissOutlinedClasses[props.variant] : dismissFilledClasses[props.variant]);

const dismissSize = computed(() => props.size === 'sm' ? 'size-icon-extra-small' : props.size === 'lg' ? 'size-icon' : 'size-icon-small');

function dismiss(event: MouseEvent) {
  event.stopPropagation();

  if (props.disabled) {
    event.preventDefault();
    return;
  }

  emit('dismiss');
}
</script>

<template>
  <span
      v-bind="$attrs"
      :aria-disabled="props.disabled || undefined"
      :class="cn(baseClass, variantClass, sizeClass, radiusClass, dimmedClass, $attrs.class)"
      :data-disabled="props.disabled || undefined"
  >
    <span :class="contentClass">
      <slot/>
    </span>
    <button
        v-if="props.dismissible"
        type="button"
        aria-label="Remove"
        :disabled="props.disabled"
        :class="['-mr-1 ml-1 inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', dismissSize, props.disabled ? 'pointer-events-none' : dismissHover]"
        @click="dismiss"
    >
      <X class="size-icon-extra-small" aria-hidden="true"/>
    </button>
  </span>
</template>
