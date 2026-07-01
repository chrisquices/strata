<script setup lang="ts">
import {ContextMenuSeparator} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <ContextMenuSeparator v-bind="$attrs" :class="cn('-mx-1 my-1 h-px bg-border', $attrs.class)"/>
</template>
