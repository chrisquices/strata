<script setup lang="ts">
// One event in a <Timeline>: a dot marker and slotted content. Place a
// <TimelineTime> first for the timestamp. `dot`: outline | filled | ring.
// The connector line down to the next item is hidden on the last item via
// group-last:hidden.
import type {PropType} from 'vue';

defineProps({
  dot: {
    type: String as PropType<'outline' | 'filled' | 'ring'>,
    default: 'outline',
    validator: function (value: string) {
      return ['outline', 'filled', 'ring'].includes(value);
    },
  },
});

const dotBase = 'size-1.5 rounded-full shrink-0';
const dotClass = {
  outline: `${dotBase} border-medium border-border bg-background`,
  filled: `${dotBase} bg-foreground`,
  ring: `${dotBase} bg-foreground ring-2 ring-foreground/20`,
};
</script>

<template>
  <li class="group flex gap-4">
    <div class="flex flex-col items-center pt-2">
      <div :class="dotClass[dot]"></div>
      <div class="mt-2 w-px flex-1 bg-border group-last:hidden"></div>
    </div>
    <div class="min-w-0 pb-6 group-last:pb-0">
      <slot/>
    </div>
  </li>
</template>
