<script setup lang="ts">
import {AlertDialogPortal, AlertDialogOverlay, AlertDialogContent} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay class="strata-overlay-fade fixed inset-0 z-modal bg-overlay/60 backdrop-blur-sm"/>
    <AlertDialogContent
        v-bind="$attrs"
        :disable-outside-pointer-events="true /* Omitting this sends false to reka and re-enables outside pointer events. */"
        :class="cn('strata-menu-pop fixed bottom-0 left-1/2 z-modal flex max-h-[calc(100dvh-var(--spacing-overlay)-var(--spacing-overlay))] w-[calc(100%-var(--spacing-overlay)-var(--spacing-overlay))] max-w-md -translate-x-1/2 flex-col overflow-hidden rounded-large rounded-b-none border border-border bg-surface text-foreground shadow-overlay focus-visible:outline-none sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:rounded-b-large', $attrs.class)"
    >
      <slot/>
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
