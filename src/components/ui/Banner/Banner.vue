<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, provide } from 'vue';
import { X } from '@lucide/vue';

const props = defineProps({
  variant: {
    type: String as PropType<'secondary' | 'success' | 'warning' | 'destructive'>,
    default: 'secondary',
    validator: (value: string) => ['secondary', 'success', 'warning', 'destructive'].includes(value),
  },
  role: {
    type: String as PropType<'status' | 'alert' | 'none'>,
    default: 'status',
    validator: (value: string) => ['status', 'alert', 'none'].includes(value),
  },
  dismissible: { type: Boolean, default: false },
  dismissLabel: { type: String, default: 'Dismiss' },
});

const emit = defineEmits<{ dismiss: [] }>();

const variantClass = {
  secondary: 'border-border bg-surface text-foreground',
  success: 'border-success/30 bg-success/5 text-success',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
};
const cls = computed(() => variantClass[props.variant] ?? variantClass.secondary);

provide('bannerVariant', computed(() => props.variant));
</script>

<template>
  <div :role="role === 'none' ? undefined : role" :class="['flex gap-3 rounded-large border p-4', cls]">
    <slot />
    <button
      v-if="dismissible"
      type="button"
      :aria-label="dismissLabel"
      class="-m-1.5 grid size-7 shrink-0 place-items-center self-start rounded-small opacity-70 transition-opacity duration-fast hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      @click="emit('dismiss')"
    >
      <X class="size-icon-small" aria-hidden="true" />
    </button>
  </div>
</template>
