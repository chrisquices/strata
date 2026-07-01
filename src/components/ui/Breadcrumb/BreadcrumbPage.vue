<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <span v-bind="$attrs" aria-current="page"
        :class="cn('inline-flex min-w-0 items-center gap-cluster-small text-foreground font-medium', $attrs.class)">
    <slot/>
  </span>
</template>
