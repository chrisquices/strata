<script setup lang="ts">
import {X} from '@lucide/vue';
import {DialogPortal, DialogOverlay, DialogContent, DialogClose} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

defineProps({
  showClose: {type: Boolean, default: true},
  closeLabel: {type: String, default: 'Close'},
});
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="strata-overlay-fade fixed inset-0 z-modal bg-overlay/60 backdrop-blur-sm"/>
    <!-- No disable-outside-pointer-events: a Dialog is dismissable by outside click (unlike AlertDialog). -->
    <DialogContent
        v-bind="$attrs"
        :class="cn('strata-menu-pop fixed left-1/2 top-1/2 z-modal flex max-h-[calc(100dvh-var(--spacing-overlay)-var(--spacing-overlay))] w-[calc(100%-var(--spacing-overlay)-var(--spacing-overlay))] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-large border border-border bg-surface text-foreground shadow-overlay focus-visible:outline-none', $attrs.class)"
    >
      <slot/>
      <DialogClose
          v-if="showClose"
          :aria-label="closeLabel"
          class="absolute right-overlay-small top-overlay-small inline-flex size-icon-large items-center justify-center rounded-medium text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        <X class="size-icon"/>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
