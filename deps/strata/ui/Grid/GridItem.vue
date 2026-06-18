<script setup lang="ts">
import type { PropType, Ref } from 'vue';
import { computed, inject, ref, useAttrs } from 'vue';
import { Primitive } from 'reka-ui';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  as: {
    type: String as PropType<'div' | 'article' | 'button' | 'a'>,
    default: undefined,
    validator: (value: string) => ['div', 'article', 'button', 'a'].includes(value),
  },
  asChild: { type: Boolean, default: false },
  interactive: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
});

const attrs = useAttrs();
const element = ref<HTMLElement>();
const gridVirtualized = inject<Ref<boolean> | undefined>('strataGridVirtualized', undefined);
const inert = computed(() => props.disabled || props.loading);
const resolvedAs = computed(() => props.as ?? (attrs.href != null ? 'a' : props.interactive ? 'button' : 'div'));
const forwardedAttrs = computed(() => {
  const next = { ...attrs };
  if (resolvedAs.value === 'a' && inert.value) delete next.href;
  return next;
});

const interactiveClass = computed(() => props.interactive
  ? 'cursor-pointer transition-[border-color,box-shadow,transform] duration-100 hover:border-foreground/30 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  : '');
const inertClass = computed(() => inert.value ? 'cursor-not-allowed opacity-50' : '');
const positionClass = computed(() => gridVirtualized?.value ? 'absolute left-0 top-0' : 'relative');

function suppressClickWhenInert(event: MouseEvent) {
  if (!inert.value) return;
  event.preventDefault();
  event.stopImmediatePropagation();
}

function suppressKeysWhenInert(event: KeyboardEvent) {
  if (inert.value && (event.key === 'Enter' || event.key === ' ')) event.preventDefault();
}

defineExpose({ element });
</script>

<template>
  <Primitive
    v-bind="forwardedAttrs"
    ref="element"
    data-grid-item
    :as="resolvedAs"
    :as-child="asChild"
    :type="!asChild && resolvedAs === 'button' ? 'button' : undefined"
    :disabled="!asChild && resolvedAs === 'button' && disabled ? true : undefined"
    :tabindex="!asChild && resolvedAs === 'a' && inert ? 0 : undefined"
    :aria-disabled="resolvedAs === 'button' ? (loading && !disabled ? 'true' : undefined) : inert ? 'true' : undefined"
    :aria-busy="loading || undefined"
    :data-interactive="interactive || undefined"
    :data-disabled="disabled || undefined"
    :data-loading="loading || undefined"
    :class="[
      'group/grid-item block min-w-0 w-full overflow-hidden rounded-large border border-border bg-surface p-0 text-left text-foreground',
      positionClass,
      interactiveClass,
      inertClass,
    ]"
    @click.capture="suppressClickWhenInert"
    @keydown.capture="suppressKeysWhenInert"
  >
    <slot />
  </Primitive>
</template>
