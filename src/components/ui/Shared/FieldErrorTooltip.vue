<script setup lang="ts">
defineOptions({ inheritAttrs: false });
defineProps({
  message: { type: String, default: '' },
  id: { type: String, default: undefined },
});
</script>

<template>
  <div v-bind="$attrs" class="field-error-tooltip relative">
    <slot />
    <span
      v-if="message"
      :id="id"
      role="tooltip"
      class="field-error-tooltip-content pointer-events-none absolute bottom-full right-0 z-tooltip mb-2 max-w-xs w-max rounded-medium bg-destructive px-2 py-1 text-xs text-pretty text-destructive-foreground shadow-panel transition-all duration-100"
    >
      {{ message }}
    </span>
  </div>
</template>

<style scoped>
.field-error-tooltip-content {
  opacity: 0;
  transform: translateY(0.25rem);
}

.field-error-tooltip:hover > .field-error-tooltip-content,
.field-error-tooltip:focus-within > .field-error-tooltip-content {
  opacity: 1;
  transform: translateY(0);
}
</style>
