<script lang="ts">
// Module-scoped counter for unique error-message ids (aria-describedby targets).
let uid = 0;
</script>

<script setup lang="ts">
// Multi-line text field. Attrs (id/name/…) fall through to the <textarea>, so labels
// associate normally. `autoResize` grows the box with content via CSS field-sizing.
import { computed, useAttrs, ref, onMounted, nextTick, watch } from 'vue';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  rows: { type: Number, default: 4 },
  placeholder: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
  readonly: { type: Boolean, default: false },
  invalid: { type: Boolean, default: false },
  error: { type: String, default: '' },
  autoResize: { type: Boolean, default: false },
});
const value = defineModel<string>({ default: '' });
const attrs = useAttrs();
const isInvalid = computed(() => props.invalid || !!props.error);

// autoResize uses CSS field-sizing where supported (Chromium); fall back to JS height-sync
// elsewhere (Safari/Firefox) so the box still grows with content.
const el = ref(null);
const cssFieldSizing = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');
function grow() {
  if (!props.autoResize || cssFieldSizing || !el.value) return;
  el.value.style.height = 'auto';
  el.value.style.height = `${el.value.scrollHeight}px`;
}
onMounted(grow);
watch(value, () => nextTick(grow));

// Link the error message to the textarea for screen readers, preserving any caller-supplied one.
const errorId = `strata-textarea-error-${++uid}`;
const describedById = computed(() => {
  const ids = [];
  if (attrs['aria-describedby']) ids.push(attrs['aria-describedby']);
  if (props.error) ids.push(errorId);
  return ids.length ? ids.join(' ') : undefined;
});

const base =
  'bg-input text-foreground placeholder:text-faint transition-colors duration-fast ' +
  'disabled:opacity-50 disabled:pointer-events-none read-only:bg-surface read-only:text-muted ' +
  'rounded-medium border focus-visible:outline-none focus-visible:ring-2 ' +
  'focus-visible:ring-offset-2 focus-visible:ring-offset-background';
const stateClass = computed(() =>
  isInvalid.value
    ? 'border-destructive focus-visible:ring-destructive/40'
    : 'border-border hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-foreground/30'
);
</script>

<template>
  <FieldErrorTooltip :id="errorId" :message="error">
    <textarea
      ref="el"
      v-bind="$attrs"
      v-model="value"
      :rows="rows"
      @input="grow"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :aria-invalid="isInvalid || undefined"
      :aria-describedby="describedById"
      :data-invalid="isInvalid || undefined"
      :class="['block w-full resize-none px-2 py-1 text-sm', autoResize ? 'field-sizing-content' : '', base, stateClass]"
    ></textarea>
  </FieldErrorTooltip>
</template>
