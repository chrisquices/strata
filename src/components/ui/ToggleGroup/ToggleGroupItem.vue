<script setup lang="ts">
import { inject, computed } from 'vue';
import { ToggleGroupItem } from 'reka-ui';

const props = defineProps({ value: { required: true }, disabled: { type: Boolean, default: false } });
const style = inject('toggleGroupStyle', { size: 'md', variant: 'primary' });

const sizeClass = computed(() => ({ sm: 'px-2.5 text-xs', md: 'px-3 text-sm', lg: 'px-3.5 text-base' }[style.size] ?? 'px-3 text-sm'));
const stateClass = computed(() =>
  style.variant === 'secondary'
    ? 'border border-transparent text-muted hover:text-foreground hover:bg-border data-[state=on]:border-border data-[state=on]:bg-surface data-[state=on]:text-foreground'
    : 'text-muted hover:text-foreground hover:bg-border data-[state=on]:bg-foreground data-[state=on]:text-background'
);
</script>

<template>
  <ToggleGroupItem
    :value="value"
    :disabled="disabled"
    :class="[
      'inline-flex h-full items-center justify-center gap-1.5 rounded-small transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 select-none',
      sizeClass,
      stateClass,
      'cursor-default data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
    ]"
  >
    <slot />
  </ToggleGroupItem>
</template>
