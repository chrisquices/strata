<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<!-- data-card-action is CardHeader's :has() hook for its two-column layout — don't rename it. -->
<template>
  <div v-bind="$attrs" data-card-action :class="cn('col-start-2 row-span-2 row-start-1 flex items-center gap-cluster-small self-start justify-self-end', $attrs.class)">
    <slot/>
  </div>
</template>
