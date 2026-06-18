<script setup lang="ts">
import { ChevronRight } from '@lucide/vue';
defineProps({ label: { default: '' }, count: { default: 0 }, open: { type: Boolean, default: false } });
const emit = defineEmits(['toggle']);
</script>

<template>
  <button
    type="button"
    :aria-expanded="open"
    class="group flex h-control w-full items-center gap-1.5 pl-3 pr-4 text-xs font-medium uppercase tracking-wider text-faint transition-colors hover:text-foreground focus-visible:outline-none focus-visible:bg-surface"
    @click="emit('toggle')"
  >
    <ChevronRight :class="['size-icon-small shrink-0 transition-transform duration-200', open ? 'rotate-90' : '']" />
    <span class="flex-1 truncate text-left">{{ label }}</span>
    <span class="shrink-0 tabular-nums normal-case tracking-normal text-faint/80">{{ count }}</span>
  </button>
  <div class="grid" :style="{ gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows var(--duration-200) ease-out' }">
    <div class="overflow-hidden">
      <slot />
    </div>
  </div>
</template>
