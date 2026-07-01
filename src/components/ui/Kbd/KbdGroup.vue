<script setup lang="ts">
import {cn} from '../utils';
</script>

<!-- Groups multiple Kbd keys into one chord; renders the outer <kbd> (standard markup for key combos). -->
<template>
  <kbd :class="cn('inline-flex items-center gap-cluster-small', $attrs.class)">
    <slot/>
  </kbd>
</template>
