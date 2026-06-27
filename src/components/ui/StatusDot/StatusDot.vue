<script setup lang="ts">
import type {PropType} from 'vue';

defineProps({
  variant: {
    type: String as PropType<'primary' | 'success' | 'warning' | 'destructive' | 'muted'>,
    default: 'primary',
    validator: function (value: string) {
      return ['primary', 'success', 'warning', 'destructive', 'muted'].includes(value);
    },
  },
  pulse: {type: Boolean, default: false},
  label: {type: String, default: ''},
});

const dotColor = {
  primary: 'bg-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted',
};
const pulseColor = {
  primary: 'bg-foreground/50',
  success: 'bg-success/50',
  warning: 'bg-warning/50',
  destructive: 'bg-destructive/50',
  muted: 'bg-muted/50',
};
</script>

<template>
  <span
      :role="label ? 'img' : 'presentation'"
      :aria-label="label || undefined"
      class="relative inline-flex shrink-0 items-center justify-center size-2"
  >
    <span :class="['absolute inset-0 rounded-full', dotColor[variant]]"></span>
    <span v-if="pulse" :class="['pulse-ring absolute rounded-full size-3', pulseColor[variant]]"></span>
  </span>
</template>

<style scoped>
.pulse-ring {
  animation: status-dot-pulse 1s ease-out infinite;
}

@keyframes status-dot-pulse {
  0% {
    opacity: 1;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(2);
  }
}

@media (prefers-reduced-motion: reduce) {
  .pulse-ring {
    animation: none;
    opacity: 0.6;
    transform: scale(1);
  }
}
</style>
