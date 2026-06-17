<script setup lang="ts">
// Mount once near the app root, then trigger toasts imperatively:
//   import { toast } from '@ui';  toast.success('Saved');
// Built on reka's Toast — it owns timing, swipe-to-dismiss, focus management, and screen-reader
// announcements. The `toast()` store (./toast) feeds the queue; this renders + styles each one.
import { computed } from 'vue';
import type { PropType } from 'vue';
import { CircleCheck, TriangleAlert, CircleX, Info, X } from '@lucide/vue';
import {
  ToastProvider, ToastViewport, ToastRoot,
  ToastTitle, ToastDescription, ToastAction, ToastClose,
} from 'reka-ui';
import { toasts, remove, type ToastVariant } from './toast';

type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
type SwipeDirection = 'right' | 'left' | 'up' | 'down';

const props = defineProps({
  closeLabel: { type: String, default: 'Dismiss' },
  // Screen-reader prefix announced before each toast (reka ToastProvider).
  label: { type: String, default: 'Notification' },
  // Accessible name for the toast region; reka substitutes {hotkey} (the focus key, e.g. F8).
  viewportLabel: { type: String, default: 'Notifications ({hotkey})' },
  // Default auto-dismiss delay (ms) for all toasts; override per toast via toast({ duration }).
  duration: { type: Number, default: 3000 },
  position: {
    type: String as PropType<ToastPosition>,
    default: 'bottom-right',
    validator: (value: string) =>
      ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'].includes(value),
  },
  // Swipe-to-dismiss direction. Omit to derive a sensible default from `position`.
  swipeDirection: {
    type: String as PropType<SwipeDirection>,
    default: undefined,
    validator: (value: string) => ['right', 'left', 'up', 'down'].includes(value),
  },
});

// Viewport edge placement + which end of the column the newest toast sits at.
const PLACEMENT: Record<ToastPosition, string> = {
  'top-left': 'top-0 left-0 items-start',
  'top-center': 'top-0 left-1/2 -translate-x-1/2 items-center',
  'top-right': 'top-0 right-0 items-end',
  'bottom-left': 'bottom-0 left-0 items-start',
  'bottom-center': 'bottom-0 left-1/2 -translate-x-1/2 items-center',
  'bottom-right': 'bottom-0 right-0 items-end',
};
// Slide/animation axis per edge (drives the strata-toast--* keyframes in app.css).
const AXIS: Record<ToastPosition, string> = {
  'top-left': 'strata-toast--left',
  'top-center': 'strata-toast--up',
  'top-right': 'strata-toast--right',
  'bottom-left': 'strata-toast--left',
  'bottom-center': 'strata-toast--down',
  'bottom-right': 'strata-toast--right',
};
const SWIPE: Record<ToastPosition, SwipeDirection> = {
  'top-left': 'left',
  'top-center': 'up',
  'top-right': 'right',
  'bottom-left': 'left',
  'bottom-center': 'down',
  'bottom-right': 'right',
};

const viewportClass = computed(() => [
  PLACEMENT[props.position],
  // Top edges stack newest-on-top; bottom edges stack newest-at-bottom (nearest the edge).
  props.position.startsWith('top') ? 'flex-col-reverse' : 'flex-col',
]);
const toastAxisClass = computed(() => AXIS[props.position]);
const effectiveSwipe = computed<SwipeDirection>(() => props.swipeDirection ?? SWIPE[props.position]);

const icons = { default: Info, success: CircleCheck, warning: TriangleAlert, destructive: CircleX };
const accent: Record<ToastVariant, string> = {
  default: 'text-foreground',
  success: 'text-success',
  warning: 'text-warning',
  destructive: 'text-destructive',
};

// Sync reka's controlled open state, then drop the toast after its close animation finishes.
function onOpenChange(id: number, open: boolean) {
  const record = toasts.find(t => t.id === id);
  if (record) record.open = open;
  if (!open) window.setTimeout(() => remove(id), 200);
}
</script>

<template>
  <ToastProvider :duration="duration" :swipe-direction="effectiveSwipe" :label="label">
    <ToastRoot
      v-for="t in toasts"
      :key="t.id"
      :open="t.open"
      :duration="t.duration === 0 ? Infinity : t.duration"
      :class="[toastAxisClass, 'pointer-events-auto flex w-full items-start gap-3 overflow-hidden rounded-large border border-border bg-surface p-4 shadow-overlay']"
      @update:open="(o) => onOpenChange(t.id, o)"
    >
      <component :is="icons[t.variant]" :class="['mt-0.5 size-icon-medium shrink-0', accent[t.variant]]" aria-hidden="true" />
      <div class="flex min-w-0 flex-1 flex-col gap-0.5">
        <ToastTitle v-if="t.title" class="truncate text-sm font-medium text-foreground">{{ t.title }}</ToastTitle>
        <ToastDescription v-if="t.description" class="text-sm text-muted [overflow-wrap:anywhere]">{{ t.description }}</ToastDescription>
      </div>
      <ToastAction
        v-if="t.action"
        :alt-text="t.action.label"
        class="shrink-0 self-center rounded-medium px-2.5 py-1 text-sm font-medium text-foreground transition-colors duration-fast hover:bg-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
        @click="t.action.onClick"
      >
        {{ t.action.label }}
      </ToastAction>
      <ToastClose
        :aria-label="closeLabel"
        class="-mr-1 -mt-1 shrink-0 rounded-medium p-1 text-muted transition-colors duration-fast hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
      >
        <X class="size-icon-small" aria-hidden="true" />
      </ToastClose>
    </ToastRoot>
    <ToastViewport
      :label="viewportLabel"
      :class="['z-toast fixed m-0 flex max-h-screen w-[calc(100vw-2rem)] max-w-sm list-none gap-2 p-4 outline-none', viewportClass]"
    />
  </ToastProvider>
</template>

<style>
/* Slide in/out per viewport edge + swipe-follow, keyed off reka's data-state/data-swipe.
   Co-located here — only this component uses these. Non-scoped: the classes sit on reka's
   ToastRoot. */
@keyframes strata-toast-in-right { from { opacity: 0; transform: translateX(100%); } }
@keyframes strata-toast-out-right { to { opacity: 0; transform: translateX(100%); } }
@keyframes strata-toast-in-left { from { opacity: 0; transform: translateX(-100%); } }
@keyframes strata-toast-out-left { to { opacity: 0; transform: translateX(-100%); } }
@keyframes strata-toast-in-up { from { opacity: 0; transform: translateY(-100%); } }
@keyframes strata-toast-out-up { to { opacity: 0; transform: translateY(-100%); } }
@keyframes strata-toast-in-down { from { opacity: 0; transform: translateY(100%); } }
@keyframes strata-toast-out-down { to { opacity: 0; transform: translateY(100%); } }

.strata-toast--right[data-state='open'] { animation: strata-toast-in-right var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1); }
.strata-toast--right[data-state='closed'],
.strata-toast--right[data-swipe='end'] { animation: strata-toast-out-right var(--duration-fast) ease-in forwards; }
.strata-toast--left[data-state='open'] { animation: strata-toast-in-left var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1); }
.strata-toast--left[data-state='closed'],
.strata-toast--left[data-swipe='end'] { animation: strata-toast-out-left var(--duration-fast) ease-in forwards; }
.strata-toast--up[data-state='open'] { animation: strata-toast-in-up var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1); }
.strata-toast--up[data-state='closed'],
.strata-toast--up[data-swipe='end'] { animation: strata-toast-out-up var(--duration-fast) ease-in forwards; }
.strata-toast--down[data-state='open'] { animation: strata-toast-in-down var(--duration-slow) cubic-bezier(0.16, 1, 0.3, 1); }
.strata-toast--down[data-state='closed'],
.strata-toast--down[data-swipe='end'] { animation: strata-toast-out-down var(--duration-fast) ease-in forwards; }

/* Swipe-follow: horizontal edges track X, vertical edges track Y */
.strata-toast--right[data-swipe='move'],
.strata-toast--left[data-swipe='move'] { transform: translateX(var(--reka-toast-swipe-move-x, 0)); }
.strata-toast--up[data-swipe='move'],
.strata-toast--down[data-swipe='move'] { transform: translateY(var(--reka-toast-swipe-move-y, 0)); }

@media (prefers-reduced-motion: reduce) {
  [class*='strata-toast--'][data-state='open'],
  [class*='strata-toast--'][data-state='closed'] {
    animation: none;
  }
}
</style>
