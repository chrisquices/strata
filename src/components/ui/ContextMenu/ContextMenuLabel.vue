<script setup lang="ts">
import {ContextMenuLabel} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({icon: {default: undefined}});
</script>

<template>
  <ContextMenuLabel
      v-bind="$attrs"
      :class="cn('flex h-control items-center gap-cluster-small rounded-medium px-control-x-small text-sm text-faint', $attrs.class)">
    <span v-if="props.icon" class="grid size-icon shrink-0 place-items-center text-current" aria-hidden="true">
      <component :is="props.icon" class="size-icon"/>
    </span>
    <span class="min-w-0 flex-1 truncate"><slot/></span>
  </ContextMenuLabel>
</template>
