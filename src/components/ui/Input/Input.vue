<script lang="ts">
let uid = 0;
</script>

<script setup lang="ts">
import type {PropType} from 'vue';
import {ref, computed, inject, watch, onBeforeUnmount, useAttrs, useSlots} from 'vue';
import {Eye, EyeOff, Clipboard, Check} from '@lucide/vue';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';

defineOptions({inheritAttrs: false});

const props = defineProps({
  type: {type: String, default: 'text'},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  placeholder: {type: String, default: ''},
  disabled: {type: Boolean, default: false},
  readonly: {type: Boolean, default: false},
  invalid: {type: Boolean, default: false},
});
const value = defineModel<string>({default: ''});

const attrs = useAttrs();
const slots = useSlots();
const groupContext = inject('inputGroup', null);
const isGrouped = computed(function () {
  return !!groupContext;
});

// Inherit the group's size/invalid when grouped; standalone uses own props.
const effectiveSize = computed(function () {
  return groupContext ? (groupContext.size ?? props.size) : props.size;
});

function extractText(vnodes: any[]): string {
  let text = '';
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = vnodes[i];
    if (typeof vnode.children === 'string') {
      text += vnode.children;
    } else if (Array.isArray(vnode.children)) {
      text += extractText(vnode.children);
    }
  }
  return text;
}

const errorText = computed(function () {
  if (!slots.default) return '';
  return extractText(slots.default()).trim();
});

const isInvalid = computed(function () {
  return props.invalid || !!errorText.value || !!groupContext?.invalid;
});

watch(errorText, function (text) {
  if (isGrouped.value && groupContext && groupContext.registerError) {
    if (text) {
      groupContext.registerError(text);
    } else {
      groupContext.clearError();
    }
  }
}, {immediate: true});

const errorId = `strata-input-error-${++uid}`;
const describedById = computed(function () {
  const ids: string[] = [];
  if (attrs['aria-describedby']) ids.push(String(attrs['aria-describedby']));
  if (!isGrouped.value && errorText.value) ids.push(errorId);
  if (isGrouped.value && errorText.value && groupContext?.errorId) ids.push(groupContext.errorId);
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
const base = computed(function () {
  return isGrouped.value ? groupedBase : borderedBase;
});

const sizeClass = {
  sm: 'h-control-small px-control-small text-xs',
  md: 'h-control px-control text-sm',
  lg: 'h-control-large px-control-large text-base'
};
const stateClass = computed(function () {
  return isGrouped.value
      ? ''
      : isInvalid.value
          ? 'border-destructive focus-visible:ring-destructive/40'
          : 'border-border hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-foreground/30';
});

const isPassword = computed(function () {
  return props.type === 'password';
});
const revealed = ref(false);
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;
const resolvedInputType = computed(function () {
  return isPassword.value && revealed.value ? 'text' : props.type;
});

async function copyValue() {
  try {
    await navigator.clipboard.writeText(String(value.value ?? ''));
    copied.value = true;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      copied.value = false;
    }, 1500);
  } catch (e) { /* clipboard unavailable */
  }
}

const RevealIcon = computed(function () {
  return revealed.value ? EyeOff : Eye;
});
const CopyIcon = computed(function () {
  return copied.value ? Check : Clipboard;
});

onBeforeUnmount(function () {
  if (groupContext && groupContext.clearError) groupContext.clearError();
  clearTimeout(copyTimer);
});
</script>

<template>
  <FieldErrorTooltip :id="errorId" :message="!isGrouped ? errorText : ''" :class="[isGrouped ? 'flex-1' : '']">
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
        <component :is="RevealIcon" class="size-icon-small"/>
      </button>
      <button
          type="button"
          :aria-label="copied ? 'Copied' : 'Copy password'"
          :disabled="disabled"
          class="grid size-7 place-items-center rounded-small text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 disabled:opacity-50"
          @click="copyValue"
      >
        <component :is="CopyIcon" :class="['size-icon-small', copied ? 'text-success' : '']"/>
      </button>
    </div>
  </FieldErrorTooltip>
</template>
