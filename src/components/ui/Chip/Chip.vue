<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {X} from '@lucide/vue';

const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost' | 'destructive' | 'success' | 'warning'>,
    default: 'primary',
    validator: function (value: string) {
      return ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'].includes(value);
    },
  },
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  radius: {
    type: String as PropType<'sm' | 'md' | 'lg' | 'full'>,
    default: 'md',
    validator: function (value: string) {
      return ['sm', 'md', 'lg', 'full'].includes(value);
    }
  },
  outline: {type: Boolean, default: false},
  icon: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false},
  dismissible: {type: Boolean, default: false},
});
const emit = defineEmits<{ dismiss: [] }>();

const base =
    'relative inline-flex max-w-full items-center justify-center overflow-hidden font-medium whitespace-nowrap uppercase tracking-widest tabular-nums select-none ' +
    'transition-colors duration-100';

const radiusClasses = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full'};
const sizeText = {
  sm: 'h-tag-small px-tag-x text-2xs',
  md: 'h-tag px-tag-x text-xs',
  lg: 'h-tag-large px-tag-x text-sm',
};
const sizeIcon = {
  sm: 'h-tag-small aspect-square',
  md: 'h-tag aspect-square',
  lg: 'h-tag-large aspect-square',
};
const filled = {
  primary: 'bg-foreground text-background',
  secondary: 'bg-surface text-foreground border border-border',
  ghost: 'bg-transparent text-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  success: 'bg-success text-success-foreground',
  warning: 'bg-warning text-warning-foreground',
};
const outlined = {
  primary: 'bg-transparent text-foreground border border-foreground',
  secondary: 'bg-transparent text-foreground border border-border',

  // Ghost has no chrome to outline, so its outline form mirrors the filled ghost.
  ghost: 'bg-transparent text-foreground',
  destructive: 'bg-transparent text-destructive border border-destructive',
  success: 'bg-transparent text-success border border-success',
  warning: 'bg-transparent text-warning border border-warning',
};
const dismissFilled = {
  primary: 'hover:bg-background/20',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/20',
  destructive: 'hover:bg-destructive-foreground/20',
  success: 'hover:bg-success-foreground/20',
  warning: 'hover:bg-warning-foreground/20',
};
const dismissOutlined = {
  primary: 'hover:bg-foreground/10',
  secondary: 'hover:bg-foreground/10',
  ghost: 'hover:bg-foreground/10',
  destructive: 'hover:bg-destructive/20',
  success: 'hover:bg-success/20',
  warning: 'hover:bg-warning/20',
};

const variantClass = computed(function () {
  return props.outline ? outlined[props.variant] : filled[props.variant];
});
const sizeClass = computed(function () {
  return props.icon ? sizeIcon[props.size] : sizeText[props.size];
});
const radiusClass = computed(function () {
  return radiusClasses[props.radius];
});
const dimmedClass = computed(function () {
  return props.disabled ? 'pointer-events-none opacity-50' : '';
});
const contentClass = computed(function () {
  return props.icon ? 'inline-flex min-w-0 items-center justify-center' : 'inline-flex min-w-0 items-center justify-center gap-2 truncate';
});
const dismissHover = computed(function () {
  return props.outline ? dismissOutlined[props.variant] : dismissFilled[props.variant];
});
const dismissSize = computed(function () {
  return props.size === 'sm' ? 'size-3' : props.size === 'lg' ? 'size-4' : 'size-3.5';
});

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
      :aria-disabled="disabled || undefined"
      :class="[base, variantClass, sizeClass, radiusClass, dimmedClass]"
      :data-disabled="disabled || undefined"
  >
    <span :class="contentClass">
      <slot/>
    </span>
    <button
        v-if="dismissible"
        type="button"
        aria-label="Remove"
        :disabled="disabled"
        :class="['-mr-1 ml-1 inline-flex shrink-0 items-center justify-center rounded-full transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', dismissSize, disabled ? 'pointer-events-none' : dismissHover]"
        @click="dismiss"
    >
      <X class="size-icon-extra-small" aria-hidden="true"/>
    </button>
  </span>
</template>
