<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  as: {
    type: String as PropType<'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'div' | 'span'>,
    default: 'h3',
    validator: (value: string) => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'].includes(value)
  },
});

const renderedTag = computed(() => ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span'].includes(props.as) ? props.as : 'h3');
</script>

<template>
  <component :is="renderedTag" v-bind="$attrs" :class="cn('text-sm font-medium leading-snug', $attrs.class)">
    <slot/>
  </component>
</template>
