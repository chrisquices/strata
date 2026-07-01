<script setup lang="ts">
import type {PropType} from 'vue';
import {HoverCardPortal, HoverCardContent} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

defineProps({
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
    validator: function (value: string) {
      return ['top', 'right', 'bottom', 'left'].includes(value);
    }
  },
  align: {
    type: String as PropType<'start' | 'center' | 'end'>,
    default: 'start',
    validator: function (value: string) {
      return ['start', 'center', 'end'].includes(value);
    }
  },
  sideOffset: {type: Number, default: 8},
});

</script>

<template>
  <HoverCardPortal>
    <HoverCardContent
        v-bind="$attrs"
        :side="side"
        :align="align"
        :side-offset="sideOffset"
        style="transform-origin: var(--reka-hover-card-content-transform-origin);"
        :class="cn('strata-menu-pop z-popover rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none', $attrs.class)"
    >
      <slot/>
    </HoverCardContent>
  </HoverCardPortal>
</template>
