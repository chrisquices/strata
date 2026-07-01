<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import Spinner from '../Spinner/Spinner.vue';
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
  icon: {type: Boolean, default: false},
  loading: {type: Boolean, default: false},
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button',
    validator: (value: string) => ['button', 'submit', 'reset'].includes(value),
  },
  disabled: {type: Boolean, default: false},
  href: {type: String, default: undefined},
});

const isLink = computed(() => props.href !== undefined);

// Loading stays focusable (no native `disabled`, which would evict focus and
// drop the button from forms). Activation is blocked by the click + keydown
// capture guards below instead.
// Inert handling in the template: a link drops its href (can't navigate) but
// keeps role + tabindex so it stays focusable/announced; a button forces
// type="button" so a loading submit can't fire the form.
const inert = computed(() => props.disabled || props.loading);

function suppressClickWhenInert(event) {
  if (inert.value) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}

function suppressKeysWhenInert(event) {
  if (inert.value && (event.key === 'Enter' || event.key === ' ')) {
    event.preventDefault();
  }
}

const baseClass = 'relative inline-flex items-center justify-center overflow-hidden whitespace-nowrap select-none transition-colors duration-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none data-loading:pointer-events-none';

const radiusClasses = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full'};

const sizeTextClasses = {
  sm: 'h-control-small px-control-x-small text-xs',
  md: 'h-control px-control-x text-sm',
  lg: 'h-control-large px-control-x-large text-base',
};

const sizeIconClasses = {
  sm: 'h-control-small aspect-square',
  md: 'h-control aspect-square',
  lg: 'h-control-large aspect-square',
};

const filledClasses = {
  primary: 'bg-foreground text-background hover:bg-foreground/90',
  secondary: 'bg-surface text-foreground border border-input-border hover:bg-background',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/10',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  success: 'bg-success text-success-foreground hover:bg-success/90',
  warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
};

const outlinedClasses = {
  primary: 'bg-transparent text-foreground border border-foreground hover:bg-foreground hover:text-background',
  secondary: 'bg-transparent text-foreground border border-border hover:bg-surface',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/10', // Ghost has no chrome to outline, so its outline form mirrors the filled ghost.
  destructive: 'bg-transparent text-destructive border border-destructive hover:bg-destructive hover:text-destructive-foreground',
  success: 'bg-transparent text-success border border-success hover:bg-success hover:text-success-foreground',
  warning: 'bg-transparent text-warning border border-warning hover:bg-warning hover:text-warning-foreground',
};

const variantClass = computed(() => props.outline ? outlinedClasses[props.variant] : filledClasses[props.variant]);

const sizeClass = computed(() => props.icon ? sizeIconClasses[props.size] : sizeTextClasses[props.size]);

const radiusClass = computed(() => radiusClasses[props.radius]);

const dimmedClass = computed(() => props.disabled && !props.loading ? 'opacity-50' : '');

const linkInertClass = computed(() => isLink.value && inert.value ? 'pointer-events-none' : '');

const spinnerSize = computed(() => props.size === 'sm' ? 'sm' : undefined);

</script>

<template>
  <component
      v-bind="$attrs"
      :is="isLink ? 'a' : 'button'"
      :href="isLink && !inert ? props.href : undefined"
      :role="isLink && inert ? 'link' : undefined"
      :tabindex="isLink && inert ? 0 : undefined"
      :type="isLink ? undefined : (inert ? 'button' : props.type)"
      :disabled="isLink ? undefined : props.disabled || undefined"
      :aria-disabled="(isLink ? inert : props.loading && !props.disabled) ? 'true' : undefined"
      :aria-busy="props.loading || undefined"
      :data-loading="props.loading || undefined"
      :class="cn(baseClass, variantClass, sizeClass, radiusClass, dimmedClass, linkInertClass, $attrs.class)"
      @click.capture="suppressClickWhenInert"
      @keydown.capture="suppressKeysWhenInert"
  >
    <span :class="['inline-flex min-w-0 items-center justify-center gap-2', props.loading ? 'opacity-0' : '']">
      <slot/>
    </span>
    <span v-if="props.loading" aria-hidden="true" class="absolute inset-0 inline-flex items-center justify-center">
      <Spinner :size="spinnerSize" />
    </span>
  </component>
</template>
