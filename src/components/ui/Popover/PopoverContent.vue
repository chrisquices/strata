<script setup lang="ts">
import type {PropType} from 'vue';
import {PopoverPortal, PopoverContent} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
    validator: function (value: string) {
      return ['top', 'right', 'bottom', 'left'].includes(value);
    }
  },
  align: {
    type: String as PropType<'start' | 'center' | 'end'>, default: 'center', validator: function (value: string) {
      return ['start', 'center', 'end'].includes(value);
    }
  },
  sideOffset: {type: Number, default: 8},
});

</script>

<template>
  <PopoverPortal>
    <PopoverContent
        v-bind="$attrs"
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        style="transform-origin: var(--reka-popover-content-transform-origin);"
        :class="cn('strata-menu-pop z-popover max-h-[var(--reka-popover-content-available-height)] overflow-y-auto rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none', $attrs.class)"
    >
      <slot/>
    </PopoverContent>
  </PopoverPortal>
</template>
