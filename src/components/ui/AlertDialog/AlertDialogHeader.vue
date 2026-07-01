<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex flex-col items-center gap-stack-small px-overlay pt-overlay text-center', $attrs.class)">
    <slot/>
  </div>
</template>
