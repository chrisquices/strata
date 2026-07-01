<script setup lang="ts">
import {AvatarImage} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

// reka resolves load status by assigning `src` to a detached Image() the
// moment this mounts, so the network fetch is always eager — `loading="lazy"`
// on the rendered element only deduplicates against that probe's cache entry.
// Kept as a cache hint; do not expect viewport-lazy behavior from it.
const props = defineProps({
  src: {type: String, required: true},
  alt: {type: String, default: ''}
});
</script>

<template>
  <AvatarImage
      v-bind="$attrs"
      :src="props.src"
      :alt="props.alt"
      loading="lazy"
      decoding="async"
      referrer-policy="no-referrer"
      :class="cn('aspect-square h-full w-full object-cover', $attrs.class)"
  />
</template>
