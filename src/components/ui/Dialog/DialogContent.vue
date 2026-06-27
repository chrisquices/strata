<script setup lang="ts">
import {X} from '@lucide/vue';
import {DialogPortal, DialogOverlay, DialogContent, DialogClose} from 'reka-ui';

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
        class="strata-menu-pop fixed left-1/2 top-1/2 z-modal flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-large border border-border bg-surface text-foreground shadow-overlay focus-visible:outline-none"
    >
      <slot/>
      <DialogClose
          v-if="showClose"
          :aria-label="closeLabel"
          class="absolute right-4 top-4 inline-flex size-icon-large items-center justify-center rounded-medium text-muted transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        <X class="size-icon-medium"/>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
