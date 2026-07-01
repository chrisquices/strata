<script setup lang="ts">
import type {PropType} from 'vue';
import {AvatarRoot} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  },
});

const sizeClass = {sm: 'size-8', md: 'size-10', lg: 'size-12'};

</script>

<template>
  <AvatarRoot
      v-bind="$attrs"
      :class="cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface border border-border align-middle select-none', sizeClass[props.size], $attrs.class)"
  >
    <slot/>
  </AvatarRoot>
</template>
