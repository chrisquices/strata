<script lang="ts">
// Module scope: defineProps is hoisted and can't see <script setup> consts.
const allowedElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'];
</script>

<script setup lang="ts">
import type { PropType } from 'vue';
import {computed} from 'vue';

const props = defineProps({
  as: {
    type: String as PropType<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span'>,
    default: 'h3',
    validator: (value: string) => allowedElements.includes(value),
  },
});

// The validator only warns; this clamp guarantees an unknown `as` can never
// render an arbitrary element.
const renderedTag = computed(() => (allowedElements.includes(props.as) ? props.as : 'h3'));
</script>

<template>
  <component :is="renderedTag" class="font-semibold leading-snug tracking-tight text-foreground">
    <slot/>
  </component>
</template>
