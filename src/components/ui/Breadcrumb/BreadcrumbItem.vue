<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <li v-bind="$attrs" :class="cn('inline-flex items-center gap-cluster-small', $attrs.class)">
    <slot/>
  </li>
</template>
