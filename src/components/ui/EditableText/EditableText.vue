<script setup lang="ts">
import type { PropType } from 'vue';
// Rename-in-place text, built on reka's Editable. Focus/click to edit, Enter or blur commits,
// Escape cancels. v-model:value holds the text; @submit fires with the committed value.
import { EditableRoot, EditableArea, EditablePreview, EditableInput } from 'reka-ui';

const props = defineProps({
  placeholder: { type: String, default: 'Untitled' },
  disabled: { type: Boolean, default: false },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
});
const value = defineModel<string>('value', { default: '' });
const emit = defineEmits<{ submit: [value: string] }>();

const sizeClass = {
  sm: 'h-control-small px-1.5 text-xs',
  md: 'h-control px-2 text-sm',
  lg: 'h-control-large px-2.5 text-base',
};
</script>

<template>
  <EditableRoot
    v-model="value"
    :placeholder="placeholder"
    :disabled="disabled"
    submit-mode="both"
    select-on-focus
    class="block w-full"
    @submit="emit('submit', $event)"
  >
    <EditableArea class="block w-full">
      <EditablePreview
        :class="['flex w-full items-center truncate rounded-medium border border-transparent text-left text-foreground transition-colors data-[empty]:text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text hover:border-border hover:bg-surface', sizeClass[size]]"
      />
      <EditableInput
        :class="['block w-full rounded-medium border border-border bg-input text-foreground transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', sizeClass[size]]"
      />
    </EditableArea>
  </EditableRoot>
</template>
