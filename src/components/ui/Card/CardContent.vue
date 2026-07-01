<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<!-- first:pt-container: restores top padding when there's no CardHeader above. -->
<template>
  <div v-bind="$attrs" :class="cn('px-container pb-container first:pt-container overflow-y-auto', $attrs.class)">
    <slot/>
  </div>
</template>
