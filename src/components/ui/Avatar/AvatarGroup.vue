<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import Root from './Avatar.vue';
import Fallback from './AvatarFallback.vue';
import Image from './AvatarImage.vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  items: {
    type: Array as PropType<{ name?: string; src?: string }[]>, default: () => []
  },
  max: {type: Number, default: 4}, // A max of 0 or less disables the cap and renders every item. max is the total tile budget: when items overflow it, the last slot becomes the +N tile.
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value)
  },
  delayMs: {type: Number, default: undefined},
});

const visibleItems = computed(function () {
  const count = props.max > 0 && props.items.length > props.max
      ? props.max - 1
      : props.items.length;

  return props.items.slice(0, count);
});

const spacingClass = {sm: '-space-x-1', md: '-space-x-2', lg: '-space-x-3'};

const overflow = computed(() => props.items.length - visibleItems.value.length);

function initials(name = '') {
  return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => [...part][0])
      .join('')
      .toUpperCase() || '?';
}
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex', spacingClass[props.size], $attrs.class)">
    <Root v-for="(item, index) in visibleItems" :key="`${item.name}-${index}`" :size="props.size"
          class="ring-2 ring-border">

      <Image v-if="item.src" :src="item.src" :alt="item.name"/>

      <Fallback :delay-ms="props.delayMs">{{ initials(item.name) }}</Fallback>

    </Root>

    <Root v-if="overflow > 0" :size="props.size" class="ring-2 ring-border">
      <Fallback>+{{ overflow }}</Fallback>
    </Root>
  </div>
</template>
