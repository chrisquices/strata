<script setup lang="ts">
import {AvatarImage} from 'reka-ui';

// reka resolves load status by assigning `src` to a detached Image() the
// moment this mounts, so the network fetch is always eager — `loading="lazy"`
// on the rendered element only deduplicates against that probe's cache entry.
// Kept as a cache hint; do not expect viewport-lazy behavior from it.
defineProps({src: {type: String, required: true}, alt: {type: String, default: ''}});
</script>

<template>
  <AvatarImage
      :src="src"
      :alt="alt"
      loading="lazy"
      decoding="async"
      referrer-policy="no-referrer"
      class="aspect-square h-full w-full object-cover"
  />
</template>
