<script setup lang="ts">
import {MoreHorizontal} from '@lucide/vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <li v-bind="$attrs" :class="cn('inline-flex items-center text-faint', $attrs.class)">
    <span aria-hidden="true" class="inline-flex">
      <MoreHorizontal class="size-icon-small"/>
    </span>
    <span class="sr-only">More</span>
  </li>
</template>
