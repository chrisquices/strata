<script setup lang="ts">
import type {PropType} from 'vue';
import {DialogPortal, DialogOverlay, DialogContent} from 'reka-ui';

defineOptions({inheritAttrs: false});
defineProps({
  side: {
    type: String as PropType<'right' | 'left' | 'bottom' | 'top'>,
    default: 'right',
    validator: function (value: string) {
      return ['right', 'left', 'bottom', 'top'].includes(value);
    },
  },
});

// strata-sheet-{side} matches the slide-in/out keyframes in the <style> block below; keep the names in sync.
const positionClass = {
  right: 'inset-y-0 right-0 h-full w-80 max-w-full border-l',
  left: 'inset-y-0 left-0 h-full w-80 max-w-full border-r',
  bottom: 'inset-x-0 bottom-0 w-full rounded-t-large border-t',
  top: 'inset-x-0 top-0 w-full rounded-b-large border-b',
};
</script>

<template>
  <DialogPortal>
    <DialogOverlay class="strata-overlay-fade fixed inset-0 z-modal bg-overlay/60"/>
    <DialogContent
        v-bind="$attrs"
        :class="[
        'fixed z-modal overflow-y-auto bg-surface border-border focus-visible:outline-none',
        `strata-sheet-${side in positionClass ? side : 'right'}`,
        positionClass[side] ?? positionClass.right,
      ]"
    >
      <slot/>
    </DialogContent>
  </DialogPortal>
</template>

<style>

/* Edge slides, keyed off data-state per side (strata-sheet-{side}). Co-located here — only this
   component uses these. Non-scoped: the class sits on reka's DialogContent root, which a scope
   hash wouldn't tag. (The backdrop's strata-overlay-fade is shared, so it stays in app.css.) */
@keyframes strata-sheet-in-right {
  from {
    translate: 100% 0;
  }
}

@keyframes strata-sheet-out-right {
  to {
    translate: 100% 0;
  }
}

@keyframes strata-sheet-in-left {
  from {
    translate: -100% 0;
  }
}

@keyframes strata-sheet-out-left {
  to {
    translate: -100% 0;
  }
}

@keyframes strata-sheet-in-bottom {
  from {
    translate: 0 100%;
  }
}

@keyframes strata-sheet-out-bottom {
  to {
    translate: 0 100%;
  }
}

@keyframes strata-sheet-in-top {
  from {
    translate: 0 -100%;
  }
}

@keyframes strata-sheet-out-top {
  to {
    translate: 0 -100%;
  }
}

.strata-sheet-right[data-state='open'] {
  animation: strata-sheet-in-right 300ms ease-out;
}

.strata-sheet-right[data-state='closed'] {
  animation: strata-sheet-out-right 300ms ease-in forwards;
}

.strata-sheet-left[data-state='open'] {
  animation: strata-sheet-in-left 300ms ease-out;
}

.strata-sheet-left[data-state='closed'] {
  animation: strata-sheet-out-left 300ms ease-in forwards;
}

.strata-sheet-bottom[data-state='open'] {
  animation: strata-sheet-in-bottom 300ms ease-out;
}

.strata-sheet-bottom[data-state='closed'] {
  animation: strata-sheet-out-bottom 300ms ease-in forwards;
}

.strata-sheet-top[data-state='open'] {
  animation: strata-sheet-in-top 300ms ease-out;
}

.strata-sheet-top[data-state='closed'] {
  animation: strata-sheet-out-top 300ms ease-in forwards;
}

@media (prefers-reduced-motion: reduce) {
  [class*='strata-sheet-'][data-state='open'],
  [class*='strata-sheet-'][data-state='closed'] {
    animation: none;
  }
}
</style>
