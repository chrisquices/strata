<script lang="ts">
// Module-scoped counter for unique error-message ids (aria-describedby targets).
let uid = 0;
</script>

<script setup lang="ts">
import type { PropType } from 'vue';
import { inject, computed, watch, useAttrs } from 'vue';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';

// Wrapper root, so forward attrs (id/name/aria-*) onto the input explicitly —
// needed so FieldLabel's `for` can target this input.
defineOptions({ inheritAttrs: false });

const props = defineProps({
  type: { type: String, default: 'text' },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  error: { type: String, default: '' },
  placeholder: { type: String, default: undefined },
});
const value = defineModel<string>({ default: '' });

const attrs = useAttrs();
const field = inject('field', null);
const isInvalid = computed(() => props.invalid || !!props.error);

// Link the error message to the input for screen readers, preserving any caller-supplied one.
const errorId = `strata-field-error-${++uid}`;
const describedById = computed(() => {
  const ids = [];
  if (attrs['aria-describedby']) ids.push(attrs['aria-describedby']);
  if (props.error) ids.push(errorId);
  return ids.length ? ids.join(' ') : undefined;
});

watch(value, (v) => {
  if (field) field.hasValue.value = v != null && v !== '';
}, { immediate: true });

function handleFocus() { if (field) field.focused.value = true; }
function handleBlur() { if (field) field.focused.value = false; }

const base =
  'block w-full rounded-medium bg-input text-foreground border transition-colors duration-100 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:opacity-50 disabled:pointer-events-none read-only:text-muted';
const sizeClass = { sm: 'h-control-small px-2.5 text-xs', md: 'h-control px-3 text-sm', lg: 'h-control-large px-3.5 text-base' };
const stateClass = computed(() =>
  isInvalid.value
    ? 'border-destructive focus-visible:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-foreground/30'
);
</script>

<template>
  <FieldErrorTooltip :id="errorId" :message="error">
    <input
      v-bind="$attrs"
      v-model="value"
      :type="type"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="isInvalid || undefined"
      :aria-describedby="describedById"
      :data-invalid="isInvalid || undefined"
      :class="[base, sizeClass[size], stateClass]"
      @focus="handleFocus"
      @blur="handleBlur"
    />
  </FieldErrorTooltip>
</template>
