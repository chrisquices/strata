<script setup lang="ts">
import {cn} from '../utils';

// Uses native CSS aspect-ratio rather than reka's AspectRatio. reka leans on
// the old padding-bottom trick with an extra inner element and only takes a
// numeric ratio; native aspect-ratio needs no wrapper and accepts any CSS
// value, including string forms like "16 / 9".
defineOptions({inheritAttrs: false});

const props = defineProps({
  ratio: {
    type: [String, Number],
    default: '16/9',
    validator: (value: string | number) => typeof CSS === 'undefined' || CSS.supports('aspect-ratio', String(value)),
  },
});

</script>

<template>
  <div v-bind="$attrs" :class="cn('min-h-0 w-full', $attrs.class)" :style="{ aspectRatio: props.ratio }">
    <slot/>
  </div>
</template>
