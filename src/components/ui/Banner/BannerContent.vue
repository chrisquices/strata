<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex-1 space-y-1', $attrs.class)">
    <slot/>
  </div>
</template>
