<script setup lang="ts">
import {ContextMenuPortal, ContextMenuContent} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <ContextMenuPortal>
    <ContextMenuContent
        v-bind="$attrs"
        style="transform-origin: var(--reka-context-menu-content-transform-origin);"
        :class="cn('strata-menu-pop z-popover min-w-44 max-w-xs max-h-[var(--reka-context-menu-content-available-height)] overflow-y-auto rounded-large border border-border bg-surface p-1 shadow-panel focus-visible:outline-none', $attrs.class)"
    >
      <slot/>
    </ContextMenuContent>
  </ContextMenuPortal>
</template>
