<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <div v-bind="$attrs"
       :class="cn('flex flex-col-reverse gap-cluster-large px-overlay pb-overlay pt-stack sm:flex-row sm:justify-end', $attrs.class)">
    <slot/>
  </div>
</template>
