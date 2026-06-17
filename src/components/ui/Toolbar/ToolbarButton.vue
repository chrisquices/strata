<script setup lang="ts">
import { computed } from 'vue';
import { ToolbarButton } from 'reka-ui';

const props = defineProps({
  pressed: { type: Boolean, default: undefined },
  disabled: { type: Boolean, default: false },
});
const isToggle = computed(() => props.pressed !== undefined);
</script>

<template>
  <ToolbarButton
    :disabled="disabled"
    :aria-pressed="isToggle ? pressed : undefined"
    :class="[
      'inline-flex h-control-small max-w-[12rem] items-center justify-center gap-1.5 overflow-hidden rounded-small px-2.5 text-sm transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 select-none',
      isToggle && pressed ? 'bg-foreground text-background' : 'text-muted hover:bg-border hover:text-foreground',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default',
    ]"
  >
    <slot />
  </ToolbarButton>
</template>
