<script lang="ts">
// Module scope: defineProps is hoisted and can't see <script setup> consts.
const allowedElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'];
</script>

<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';

// Renders a heading by default for document structure; override the level with `as`.
const props = defineProps({
  as: {
    type: String as PropType<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span'>,
    default: 'h3',
    validator: function (value: string) {
      return allowedElements.includes(value);
    }
  },
});

const renderedTag = computed(function () {
  return allowedElements.includes(props.as) ? props.as : 'h3';
});
</script>

<template>
  <component :is="renderedTag" class="text-sm font-medium text-foreground">
    <slot/>
  </component>
</template>
