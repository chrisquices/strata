<script setup lang="ts">
import type {PropType} from 'vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  as: {
    type: [String, Object] as PropType<'a' | object>,
    default: 'a',
    validator: (value: unknown) => typeof value === 'object' || value === 'a',
  },
});

const baseClass = 'inline-flex items-center gap-cluster-small rounded-small text-muted transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background';
</script>

<template>
  <component :is="props.as" v-bind="$attrs" :class="cn(baseClass, $attrs.class)">
    <slot/>
  </component>
</template>
