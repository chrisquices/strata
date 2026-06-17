<script lang="ts">
// Module scope: defineProps is hoisted and can't see <script setup> consts.
const allowedElements = ['span', 'div', 'p', 'dt', 'label', 'legend', 'figcaption', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
</script>

<script setup lang="ts">
import type { PropType } from 'vue';
import {computed} from 'vue';

const props = defineProps({
  tone: {
    type: String as PropType<'faint' | 'muted' | 'foreground' | 'inherit'>,
    default: 'faint',
    validator: (value: string) => ['faint', 'muted', 'foreground', 'inherit'].includes(value),
  },
  as: {
    type: String,
    default: 'span',
    validator: (value: string) => allowedElements.includes(value),
  },
});

// The validator only warns; this clamp guarantees an unknown `as` can never
// render an arbitrary element.
const renderedTag = computed(() => (allowedElements.includes(props.as) ? props.as : 'span'));

const base = 'text-xs uppercase tracking-widest font-medium';
const toneClass = {
  faint: 'text-faint',
  muted: 'text-muted',
  foreground: 'text-foreground',
  inherit: '',
};
</script>

<template>
  <component :is="renderedTag" :class="[base, toneClass[tone]]">
    <slot/>
  </component>
</template>
