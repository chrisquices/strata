<script setup lang="ts">
import type { PropType } from 'vue';
const props = defineProps({
  variant: {
    type: String as PropType<'primary' | 'success' | 'warning' | 'destructive' | 'muted'>,
    default: 'primary',
    validator: (value: string) => ['primary', 'success', 'warning', 'destructive', 'muted'].includes(value),
  },
  pulse: { type: Boolean, default: false },
  label: { type: String, default: '' },
});

const dotColor = {
  primary: 'bg-foreground',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  muted: 'bg-muted',
};
const pulseColor = {
  primary: 'bg-foreground/40',
  success: 'bg-success/40',
  warning: 'bg-warning/40',
  destructive: 'bg-destructive/40',
  muted: 'bg-muted/40',
};
</script>

<template>
  <span
    :role="label ? 'status' : 'presentation'"
    :aria-label="label || undefined"
    class="relative inline-flex shrink-0 items-center justify-center size-2"
  >
    <span :class="['absolute inset-0 rounded-full', dotColor[variant]]"></span>
    <span v-if="pulse" :class="['pulse-ring absolute rounded-full size-3', pulseColor[variant]]"></span>
  </span>
</template>

<style scoped>
.pulse-ring {
  animation: status-dot-pulse 1.5s ease-out infinite;
}
@keyframes status-dot-pulse {
  0% { opacity: 0.8; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.8); }
}
@media (prefers-reduced-motion: reduce) {
  .pulse-ring {
    animation: none;
    opacity: 0.4;
    transform: scale(1.4);
  }
}
</style>
