<script lang="ts">
// Module scope: defineProps is hoisted and can't see <script setup> consts.
const allowedElements = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'];
</script>

<script setup lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';

const props = defineProps({
  as: { type: String as PropType<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span'>, default: 'h1', validator: (value: string) => allowedElements.includes(value) },
});

const renderedTag = computed(() => (allowedElements.includes(props.as) ? props.as : 'h1'));
</script>

<template>
  <component :is="renderedTag" class="truncate text-sm font-semibold tracking-tight text-foreground">
    <slot />
  </component>
</template>
