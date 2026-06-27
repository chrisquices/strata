<script setup lang="ts">
import type {PropType} from 'vue';
import {computed} from 'vue';
import Root from './Avatar.vue';
import Fallback from './AvatarFallback.vue';
import Image from './AvatarImage.vue';

const props = defineProps({
  items: {type: Array as PropType<{ name?: string; src?: string }[]>, default: function () {
    return [];
  }},

  // A max of 0 or less disables the cap and renders every item. max is the total
  // tile budget: when items overflow it, the last slot becomes the +N tile.
  max: {type: Number, default: 4},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'sm',
    validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  delayMs: {type: Number, default: undefined},
});

const visibleCount = computed(function () {
  return props.max > 0 && props.items.length > props.max
      ? props.max - 1
      : props.items.length;
});
const visibleItems = computed(function () {
  return props.items.slice(0, visibleCount.value);
});
const overflow = computed(function () {
  return props.items.length - visibleCount.value;
});

function initials(name = '') {
  const value = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return [...part][0];
      })
      .join('')
      .toUpperCase();

  return value || '?';
}
</script>

<template>
  <div class="flex -space-x-2">
    <Root v-for="(item, index) in visibleItems" :key="`${item.name}-${index}`" :size="size"
          class="ring-2 ring-background">
      <Image v-if="item.src" :src="item.src" :alt="item.name"/>
      <Fallback :delay-ms="delayMs">{{ initials(item.name) }}</Fallback>
    </Root>
    <Root v-if="overflow > 0" :size="size" class="ring-2 ring-background">
      <Fallback>+{{ overflow }}</Fallback>
    </Root>
  </div>
</template>
