<script setup lang="ts">
import {AlertDialogDescription} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <AlertDialogDescription v-bind="$attrs" :class="cn('text-sm text-pretty text-muted px-overlay', $attrs.class)">
    <slot/>
  </AlertDialogDescription>
</template>
