<script lang="ts">
// Module-scoped counter for unique error-message ids (aria-describedby targets).
let uid = 0;
</script>

<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, computed, inject, onBeforeUnmount, useAttrs } from 'vue';
import { Eye, EyeOff, Clipboard, Check } from '@lucide/vue';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';

defineOptions({ inheritAttrs: false });

// Single-line text input (text/password/email/url/search/tel) with sizes, validation,
// password reveal/copy, and InputGroup support. Use Textarea for multi-line.
// Attrs (id/name/autocomplete/…) fall through to the <input>, so labels associate normally.
const props = defineProps({
  type: { type: String, default: 'text' },
  size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md', validator: (value: string) => ['sm', 'md', 'lg'].includes(value) },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  error: { type: String, default: '' },
});
const value = defineModel<string>({ default: '' });

const attrs = useAttrs();
const groupContext = inject('inputGroup', null);
const isGrouped = computed(() => !!groupContext);
// Inside a group, inherit the group's size/invalid; a lone Input uses its own props.
const effectiveSize = computed(() => (groupContext ? (groupContext.size ?? props.size) : props.size));
const isInvalid = computed(() => props.invalid || !!props.error || !!groupContext?.invalid);

// Link the error message to the input for screen readers, preserving any caller-supplied one.
const errorId = `strata-input-error-${++uid}`;
const describedById = computed(() => {
  const ids = [];
  if (attrs['aria-describedby']) ids.push(attrs['aria-describedby']);
  if (!isGrouped.value && props.error) ids.push(errorId);
  return ids.length ? ids.join(' ') : undefined;
});

const sharedBase =
  'bg-input text-foreground placeholder:text-faint transition-colors duration-100 ' +
  'disabled:opacity-50 disabled:pointer-events-none read-only:bg-surface read-only:text-muted';
const borderedBase =
  sharedBase +
  ' rounded-medium border focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const groupedBase = sharedBase + ' border-0 rounded-none focus-visible:outline-none';
const base = computed(() => (isGrouped.value ? groupedBase : borderedBase));

const sizeClass = { sm: 'h-control-small px-2 text-xs', md: 'h-control px-2 text-sm', lg: 'h-control-large px-2.5 text-base' };
const stateClass = computed(() =>
  isGrouped.value
    ? ''
    : isInvalid.value
      ? 'border-destructive focus-visible:ring-destructive/40'
      : 'border-border hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-foreground/30'
);

const isPassword = computed(() => props.type === 'password');
const revealed = ref(false);
const copied = ref(false);
let copyTimer = null;
const resolvedInputType = computed(() => (isPassword.value && revealed.value ? 'text' : props.type));
async function copyValue() {
  try {
    await navigator.clipboard.writeText(String(value.value ?? ''));
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => (copied.value = false), 1500);
  } catch (e) { /* clipboard unavailable */ }
}
const RevealIcon = computed(() => (revealed.value ? EyeOff : Eye));
const CopyIcon = computed(() => (copied.value ? Check : Clipboard));
onBeforeUnmount(() => clearTimeout(copyTimer));
</script>

<template>
  <FieldErrorTooltip :id="errorId" :message="!isGrouped ? error : ''" :class="[isGrouped ? 'flex-1' : '']">
    <input
      v-bind="$attrs"
      v-model="value"
      :type="resolvedInputType"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="isInvalid || undefined"
      :aria-describedby="describedById"
      :data-invalid="isInvalid || undefined"
      :class="['block w-full', base, isGrouped ? ['px-2 h-full', effectiveSize === 'sm' ? 'text-xs' : effectiveSize === 'lg' ? 'text-base' : 'text-sm'] : sizeClass[effectiveSize], stateClass, isPassword ? 'pr-16' : '']"
    />
    <div v-if="isPassword" class="absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
      <button
        type="button"
        :aria-label="revealed ? 'Hide password' : 'Show password'"
        :aria-pressed="revealed"
        :disabled="disabled"
        class="grid size-7 place-items-center rounded-small text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
        @click="revealed = !revealed"
      >
        <component :is="RevealIcon" class="size-icon-small" />
      </button>
      <button
        type="button"
        :aria-label="copied ? 'Copied' : 'Copy password'"
        :disabled="disabled"
        class="grid size-7 place-items-center rounded-small text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
        @click="copyValue"
      >
        <component :is="CopyIcon" :class="['size-icon-small', copied ? 'text-success' : '']" />
      </button>
    </div>
  </FieldErrorTooltip>
</template>
