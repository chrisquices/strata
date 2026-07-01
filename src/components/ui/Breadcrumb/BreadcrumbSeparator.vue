<script setup lang="ts">
import {ChevronRight} from '@lucide/vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <li role="presentation" aria-hidden="true" v-bind="$attrs"
      :class="cn('inline-flex items-center text-faint', $attrs.class)">
    <slot>
      <ChevronRight class="size-icon-small rtl:rotate-180"/>
    </slot>
  </li>
</template>
