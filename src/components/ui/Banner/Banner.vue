<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, provide, ref } from 'vue';
import { X } from '@lucide/vue';

const props = defineProps({
  variant: {
    type: String as PropType<'secondary' | 'success' | 'warning' | 'destructive'>,
    default: 'secondary',
    validator: function (value: string) {
      return ['secondary', 'success', 'warning', 'destructive'].includes(value);
    },
  },
  role: {
    type: String as PropType<'status' | 'alert' | 'none'>,
    default: 'status',
    validator: function (value: string) {
      return ['status', 'alert', 'none'].includes(value);
    },
  },
  dismissible: { type: Boolean, default: false },
  dismissLabel: { type: String, default: 'Dismiss' },
});

const emit = defineEmits<{ dismiss: [] }>();
const visible = ref(true);

const variantClass = {
  secondary: 'border-border bg-surface text-foreground',
  success: 'border-success/30 bg-success/5 text-success',
  warning: 'border-warning/30 bg-warning/5 text-warning',
  destructive: 'border-destructive/30 bg-destructive/5 text-destructive',
};
const cls = computed(function () {
  return variantClass[props.variant] ?? variantClass.secondary;
});

provide('bannerVariant', computed(function () {
  return props.variant;
}));

function dismiss() {
  if (!visible.value) return;
  visible.value = false;
}
</script>

<template>
  <Transition name="strata-banner" appear @after-leave="emit('dismiss')">
    <div v-if="visible" :role="role === 'none' ? undefined : role" :class="['flex gap-3 rounded-large border p-4', cls]">
      <slot />
      <button
        v-if="dismissible"
        type="button"
        :aria-label="dismissLabel"
        class="-m-1.5 grid size-8 shrink-0 place-items-center self-start rounded-small opacity-70 transition-opacity duration-100 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        @click="dismiss"
      >
        <X class="size-icon-small" aria-hidden="true" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.strata-banner-enter-active,
.strata-banner-leave-active {
  transition: opacity 100ms ease-out;
}

.strata-banner-enter-from,
.strata-banner-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .strata-banner-enter-active,
  .strata-banner-leave-active {
    transition: none;
  }
}
</style>
