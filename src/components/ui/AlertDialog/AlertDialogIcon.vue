<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <div v-bind="$attrs" aria-hidden="true"
       :class="cn('mx-auto mb-cluster-small grid place-items-center text-muted', $attrs.class)">
    <slot/>
  </div>
</template>
