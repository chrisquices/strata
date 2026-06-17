<script setup lang="ts">
import type { PropType } from 'vue';
// One event in a <Timeline>: a dot marker, an optional `time`, and slotted content.
// `dot`: hollow (ring outline) | filled | ring. The connector line down to the next
// item is hidden on the last item via group-last:hidden.
defineProps({
  time: { type: String, default: '' },
  dot: {
    type: String as PropType<'hollow' | 'filled' | 'ring'>,
    default: 'hollow',
    validator: (value: string) => ['hollow', 'filled', 'ring'].includes(value),
  },
});

const dotClass = {
  hollow: 'size-1.5 rounded-full border-medium border-border bg-background shrink-0',
  filled: 'size-1.5 rounded-full bg-foreground shrink-0',
  ring: 'size-1.5 rounded-full bg-foreground shrink-0 ring-2 ring-foreground/20',
};
</script>

<template>
  <li class="group flex gap-4">
    <div class="flex flex-col items-center pt-0.5">
      <div :class="dotClass[dot] ?? dotClass.hollow"></div>
      <div class="mt-1.5 w-px flex-1 bg-border group-last:hidden"></div>
    </div>
    <div class="min-w-0 pb-6 group-last:pb-0">
      <span v-if="time" class="mb-0.5 block text-xs text-faint">{{ time }}</span>
      <slot />
    </div>
  </li>
</template>
