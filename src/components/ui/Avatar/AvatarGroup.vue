<script setup lang="ts">
import { computed } from 'vue';
import Root from './Avatar.vue';
import Fallback from './AvatarFallback.vue';
import Image from './AvatarImage.vue';

const props = defineProps({
  items: { type: Array, default: () => [] },
  // A max of 0 or less disables the cap and renders every item.
  max: { type: Number, default: 4 },
  size: { type: String, default: 'sm' },
});

const visibleItems = computed(() => (props.max > 0 ? props.items.slice(0, props.max) : props.items));
const overflow = computed(() => Math.max(0, props.items.length - visibleItems.value.length));

function initials(name) {
  return (
    (name || '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      // [...part] not part[0]: keeps a full first character (e.g. emoji) intact
      .map((part) => [...part][0])
      .join('')
      .toUpperCase() || '?'
  );
}
</script>

<template>
  <div class="flex -space-x-2">
    <Root v-for="(item, index) in visibleItems" :key="`${item.name}-${index}`" :size="size" class="ring-2 ring-background">
      <Image v-if="item.src" :src="item.src" :alt="item.name" />
      <Fallback>{{ initials(item.name) }}</Fallback>
    </Root>
    <Root v-if="overflow > 0" :size="size" class="ring-2 ring-background">
      <Fallback>+{{ overflow }}</Fallback>
    </Root>
  </div>
</template>
