<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <p v-bind="$attrs" :class="cn('text-sm text-muted', $attrs.class)">
    <slot/>
  </p>
</template>
