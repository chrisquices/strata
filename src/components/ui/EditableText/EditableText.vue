<script setup lang="ts">
import type {PropType} from 'vue';
import {EditableRoot, EditableArea, EditablePreview, EditableInput} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  placeholder: {type: String, default: 'Untitled'},
  disabled: {type: Boolean, default: false},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: function (value) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
});
const value = defineModel<string>({default: ''});
const emit = defineEmits<{ submit: [value: string] }>();

const previewSizeClass = {
  sm: 'h-control-small px-0 text-xs [--editable-text-padding:var(--spacing-control-x-small)]',
  md: 'h-control px-0 text-sm [--editable-text-padding:var(--spacing-control-x)]',
  lg: 'h-control-large px-0 text-base [--editable-text-padding:var(--spacing-control-x-large)]'
};

const inputSizeClass = {
  sm: 'h-control-small px-control-x-small text-xs [--editable-text-padding:var(--spacing-control-x-small)]',
  md: 'h-control px-control-x text-sm [--editable-text-padding:var(--spacing-control-x)]',
  lg: 'h-control-large px-control-x-large text-base [--editable-text-padding:var(--spacing-control-x-large)]'
};
</script>

<template>
  <EditableRoot
      v-bind="$attrs"
      v-model="value"
      :placeholder="props.placeholder"
      :disabled="props.disabled"
      submit-mode="both"
      select-on-focus
      :class="cn('block w-full', $attrs.class)"
      @submit="emit('submit', $event)"
  >
    <EditableArea class="block w-full">
      <EditablePreview
          :class="['strata-editable-text-preview flex w-full items-center rounded-medium border border-transparent text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30', props.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-text', previewSizeClass[props.size]]"
      >
        <span :class="['min-w-0 truncate', value ? 'text-foreground' : 'text-faint']">{{ value || props.placeholder }}</span>
      </EditablePreview>
      <EditableInput
          :class="['strata-editable-text-input block w-full rounded-medium border border-border bg-input text-foreground placeholder:text-faint transition-colors duration-100 hover:border-foreground/30 focus-visible:border-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none read-only:bg-surface read-only:text-muted', inputSizeClass[props.size]]"
      />
    </EditableArea>
  </EditableRoot>
</template>

<style>
/* Preview and input are separate reka elements, so animate padding as each one mounts. */
@keyframes strata-editable-text-input-padding {
  from {
    padding-inline: 0;
  }
  to {
    padding-inline: var(--editable-text-padding);
  }
}

@keyframes strata-editable-text-preview-padding {
  from {
    padding-inline: var(--editable-text-padding);
  }
  to {
    padding-inline: 0;
  }
}

.strata-editable-text-preview {
  animation: strata-editable-text-preview-padding 140ms ease-out;
}

.strata-editable-text-input {
  animation: strata-editable-text-input-padding 140ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .strata-editable-text-preview,
  .strata-editable-text-input {
    animation: none;
  }
}
</style>
