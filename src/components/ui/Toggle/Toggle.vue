<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {Toggle as TogglePrimitive} from 'reka-ui';

// A two-state button that stays pressed when on. v-model:pressed holds the state.
const props = defineProps({
  disabled: {type: Boolean, default: false},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  variant: {
    type: String as PropType<'primary' | 'secondary' | 'ghost'>,
    default: 'primary',
    validator: function (value: string) {
      return ['primary', 'secondary', 'ghost'].includes(value);
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
});
const pressed = defineModel<boolean>('pressed');

const base =
    'relative inline-flex items-center justify-center overflow-hidden font-medium whitespace-nowrap select-none ' +
    'transition-colors duration-100 active:translate-y-px ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
    'disabled:pointer-events-none';

const radiusClasses = {sm: 'rounded-small', md: 'rounded-medium', lg: 'rounded-large', full: 'rounded-full'};
const sizeText = {
  sm: 'h-control-small px-control-x-small text-xs',
  md: 'h-control px-control-x text-sm',
  lg: 'h-control-large px-control-large text-base',
};
const sizeIcon = {
  sm: 'h-control-small aspect-square',
  md: 'h-control aspect-square',
  lg: 'h-control-large aspect-square',
};
const filled = {
  primary: 'data-[state=on]:bg-foreground data-[state=on]:text-background data-[state=on]:hover:bg-foreground/90',
  secondary: 'data-[state=on]:bg-surface data-[state=on]:text-foreground data-[state=on]:border data-[state=on]:border-border data-[state=on]:hover:bg-background',
  ghost: 'data-[state=on]:bg-foreground/10 data-[state=on]:text-foreground data-[state=on]:hover:bg-foreground/15',
};
const outlined = {
  primary: 'bg-transparent text-foreground border border-foreground hover:bg-foreground hover:text-background',
  secondary: 'bg-transparent text-foreground border border-border hover:bg-surface',

  // Ghost has no chrome to outline, so its outline form mirrors the filled ghost.
  ghost: 'bg-transparent text-foreground hover:bg-foreground/10',
};
const unpressed = {
  primary: 'bg-transparent text-foreground hover:bg-foreground/10',
  secondary: 'bg-transparent text-foreground border border-border hover:bg-surface',
  ghost: 'bg-transparent text-foreground hover:bg-foreground/10',
};

const stateClass = computed(function () {
  return filled[props.variant];
});
const unpressedClass = computed(function () {
  return props.outline ? outlined[props.variant] : unpressed[props.variant];
});
const sizeClass = computed(function () {
  return props.icon ? sizeIcon[props.size] : sizeText[props.size];
});
const radiusClass = computed(function () {
  return radiusClasses[props.radius];
});
const dimmedClass = computed(function () {
  return props.disabled ? 'opacity-50' : '';
});
</script>

<template>
  <TogglePrimitive
      v-model="pressed"
      :disabled="disabled"
      :class="[
        base,
        sizeClass,
        radiusClass,
        unpressedClass,
        stateClass,
        dimmedClass,
      ]"
      v-slot="slotProps"
  >
    <span class="inline-flex min-w-0 items-center justify-center gap-2">
      <slot v-bind="slotProps"/>
    </span>
  </TogglePrimitive>
</template>
