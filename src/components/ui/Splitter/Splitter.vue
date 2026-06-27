<script setup lang="ts">
// Resizable panels. Compose: Splitter > SplitterPanel + SplitterResizeHandle + SplitterPanel.
// reka owns drag/keyboard resize (arrows on the focused handle), min/max constraints, collapsing,
// and optional localStorage persistence (autoSaveId). Sizes are percentages that total 100.
// The group fills its parent (h-full w-full) — give the parent a height. Nest groups for grids.
import type {PropType} from 'vue';
import {SplitterGroup} from 'reka-ui';

defineProps({
  direction: {
    type: String as PropType<'horizontal' | 'vertical'>,
    default: 'horizontal',
    validator: (value: string) => ['horizontal', 'vertical'].includes(value)
  },
  // Stable group id (auto-generated if omitted) — useful for nested/multi-tab layouts and persistence.
  id: {type: String, default: undefined},
  // Persist the layout to localStorage under this stable id.
  autoSaveId: {type: String, default: undefined},
  // Pixels resized per arrow-key press on a focused handle (reka default 10).
  keyboardResizeBy: {type: Number, default: undefined},
  // Custom persistence adapter (defaults to localStorage) — e.g. sessionStorage or a mock.
  storage: {
    type: Object as PropType<{
      getItem: (name: string) => string | null;
      setItem: (name: string, value: string) => void
    }>, default: undefined
  },
});
const emit = defineEmits<{ layout: [sizes: number[]] }>();
</script>

<template>
  <SplitterGroup
      :direction="direction"
      :id="id"
      :auto-save-id="autoSaveId"
      :keyboard-resize-by="keyboardResizeBy"
      :storage="storage"
      class="flex h-full w-full data-[orientation=vertical]:flex-col"
      @layout="(sizes) => emit('layout', sizes)"
  >
    <slot/>
  </SplitterGroup>
</template>
