<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <div v-bind="$attrs"
       :class="cn('flex items-center gap-cluster-large border-t border-border px-container py-container', $attrs.class)">
    <slot/>
  </div>
</template>
