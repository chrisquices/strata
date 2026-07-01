<script setup lang="ts">
import {AlertDialogTitle} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  as: {default: 'h2'}
});
</script>

<template>
  <AlertDialogTitle v-bind="$attrs" :as="props.as" :class="cn('text-base text-foreground', $attrs.class)">
    <slot/>
  </AlertDialogTitle>
</template>
