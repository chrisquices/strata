<script setup lang="ts">
import type { PropType } from 'vue';
// A grouped set of toggles — type "single" (segmented control) or "multiple". v-model holds the
// active value(s). Passes size/variant to ToggleGroupItem via context; `disabled` disables the group.
import { reactive, computed, provide } from 'vue';
import { ToggleGroupRoot } from 'reka-ui';

const props = defineProps({
  type: { type: String as PropType<'single' | 'multiple'>, default: 'single', validator: (value: string) => ['single', 'multiple'].includes(value) },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  variant: { type: String as PropType<'primary' | 'secondary'>, default: 'primary', validator: (value: string) => ['primary', 'secondary'].includes(value) },
  bordered: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false },
});
const model = defineModel<string | string[]>();

provide('toggleGroupStyle', reactive({
  size: computed(() => props.size),
  variant: computed(() => props.variant),
}));
</script>

<template>
  <ToggleGroupRoot
    v-model="model"
    :type="type"
    :disabled="disabled"
    :class="[
      'inline-flex items-center gap-px rounded-medium',
      bordered ? 'border border-border bg-surface p-px' : '',
      size === 'sm' ? 'h-control-small' : size === 'lg' ? 'h-control-large' : 'h-control',
    ]"
  >
    <slot />
  </ToggleGroupRoot>
</template>
