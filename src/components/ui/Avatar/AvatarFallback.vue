<script setup lang="ts">
import {AvatarFallback} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  delayMs: {type: Number, default: undefined}
});
</script>

<template>
  <AvatarFallback
      v-bind="$attrs"
      :delay-ms="props.delayMs"
      :class="cn('flex h-full w-full items-center justify-center bg-surface text-muted font-medium text-xs uppercase', $attrs.class)"
  >
    <slot/>
  </AvatarFallback>
</template>
