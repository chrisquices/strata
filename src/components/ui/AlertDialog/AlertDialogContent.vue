<script setup lang="ts">
import {AlertDialogPortal, AlertDialogOverlay, AlertDialogContent} from 'reka-ui';

defineOptions({inheritAttrs: false});
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay class="strata-overlay-fade fixed inset-0 z-modal bg-overlay/60 backdrop-blur-sm"/>
    <!-- Keep disable-outside-pointer-events: omitting it sends false to reka and re-enables outside pointer events. -->
    <AlertDialogContent
        v-bind="$attrs"
        disable-outside-pointer-events
        class="strata-menu-pop fixed left-1/2 top-1/2 z-modal flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-large border border-border bg-surface text-foreground shadow-overlay focus-visible:outline-none"
    >
      <slot/>
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
