<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  tone: {
    type: String as PropType<'faint' | 'muted' | 'foreground' | 'inherit'>,
    default: 'faint',
    validator: (value: string) => ['faint', 'muted', 'foreground', 'inherit'].includes(value),
  },
  as: {
    type: String,
    default: 'span',
    validator: (value: string) => ['span', 'div', 'p', 'dt', 'label', 'legend', 'figcaption', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(value),
  },
});

// The validator only warns; this clamp guarantees an unknown `as` can never
// render an arbitrary element.
const renderedTag = computed(() => (['span', 'div', 'p', 'dt', 'label', 'legend', 'figcaption', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(props.as) ? props.as : 'span'));

const baseClass = 'block text-xs uppercase tracking-widest font-medium';

const toneClass = {
  faint: 'text-faint',
  muted: 'text-muted',
  foreground: 'text-foreground',
  inherit: '',
};
</script>

<template>
  <component :is="renderedTag" v-bind="$attrs" :class="cn(baseClass, toneClass[props.tone], $attrs.class)">
    <slot/>
  </component>
</template>
