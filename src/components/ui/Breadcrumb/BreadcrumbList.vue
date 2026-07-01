<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <ol v-bind="$attrs" :class="cn('flex flex-wrap items-center gap-cluster-small text-sm', $attrs.class)">
    <slot/>
  </ol>
</template>
