<script setup lang="ts">
// The draggable divider between two panels. reka makes it role=separator with aria-valuenow/min/max,
// keyboard-resizable (Tab to it, then arrow keys), and expands the pointer hit area beyond the 1px line.
// Pass `aria-label` for a descriptive name (it falls through to the separator element).
import type {PropType} from 'vue';
import {SplitterResizeHandle} from 'reka-ui';

const props = defineProps({
  id: {type: String, default: undefined},
  disabled: {type: Boolean, default: false},
  // Tab order; reka defaults to 0. Set -1 to skip the handle in the tab sequence.
  tabindex: {type: Number, default: undefined},
  // Expand the pointer hit area beyond the visual line — coarse (touch, default 15) / fine (mouse, default 5).
  hitAreaMargins: {type: Object as PropType<{ coarse?: number; fine?: number }>, default: undefined},
  // CSP nonce for reka's injected cursor styles (strict-CSP apps).
  nonce: {type: String, default: undefined},
});
const emit = defineEmits<{ dragging: [isDragging: boolean] }>();

function onDragging(isDragging: boolean) {
  emit('dragging', isDragging);
}
</script>

<template>
  <SplitterResizeHandle
      :id="props.id"
      :disabled="props.disabled"
      :tabindex="props.tabindex"
      :hit-area-margins="props.hitAreaMargins"
      :nonce="props.nonce"
      class="group relative shrink-0 bg-border outline-none transition-colors duration-200 data-[state=drag]:bg-foreground/50 data-[disabled]:cursor-default data-[disabled]:opacity-50 data-[orientation=horizontal]:h-full data-[orientation=horizontal]:w-px data-[orientation=horizontal]:cursor-col-resize data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:cursor-row-resize"
      @dragging="onDragging"
  >
    <!-- Grip affordance — brightens (and rings) on hover / keyboard focus / drag -->
    <span
        class="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/20 transition-colors duration-100 group-hover:bg-foreground/50 group-focus-visible:bg-foreground/70 group-focus-visible:ring-2 group-focus-visible:ring-foreground/50 group-data-[state=drag]:bg-foreground/70 group-data-[orientation=horizontal]:h-8 group-data-[orientation=horizontal]:w-1 group-data-[orientation=vertical]:h-1 group-data-[orientation=vertical]:w-8"
        aria-hidden="true"
    ></span>
  </SplitterResizeHandle>
</template>
