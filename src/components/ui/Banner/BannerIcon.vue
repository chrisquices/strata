<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <span v-bind="$attrs" aria-hidden="true" :class="cn('shrink-0 flex items-center justify-center px-cluster-small', $attrs.class)">
    <slot/>
  </span>
</template>
