<script setup lang="ts">
// A single resizable pane. Sizes are in `sizeUnit` (default '%'): defaultSize/minSize/maxSize.
// Set `collapsible` (+ optional collapsedSize) to allow collapsing. The default slot receives reka's
// panel state and helpers: { isCollapsed, isExpanded, collapse, expand, resize }. The same imperative
// API (collapse/expand/resize/getSize + isCollapsed/isExpanded refs) is exposed via a template ref.
import {computed, ref} from 'vue';
import type {PropType} from 'vue';
import {SplitterPanel} from 'reka-ui';

defineProps({
  id: {type: String, default: undefined},
  defaultSize: {type: Number, default: undefined},
  minSize: {type: Number, default: undefined},
  maxSize: {type: Number, default: undefined},
  collapsible: {type: Boolean, default: false},
  collapsedSize: {type: Number, default: undefined},
  sizeUnit: {
    type: String as PropType<'%' | 'px'>,
    default: undefined,
    validator: (value: string) => ['%', 'px'].includes(value)
  },
  order: {type: Number, default: undefined},
});
// prevSize is undefined on the first resize notification (reka has no prior size yet).
const emit = defineEmits<{ resize: [size: number, prevSize: number | undefined]; collapse: []; expand: [] }>();

// reka's panel instance exposes the imperative + reactive collapse API; forward it through this wrapper.
type RekaPanel = {
  collapse: () => void;
  expand: () => void;
  resize: (size: number) => void;
  getSize: () => number;
  isCollapsed: boolean;
  isExpanded: boolean;
};
const panel = ref<RekaPanel | null>(null);
defineExpose({
  collapse: () => panel.value?.collapse(),
  expand: () => panel.value?.expand(),
  resize: (size: number) => panel.value?.resize(size),
  getSize: () => panel.value?.getSize(),
  isCollapsed: computed(() => panel.value?.isCollapsed ?? false),
  isExpanded: computed(() => panel.value?.isExpanded ?? true),
});
</script>

<template>
  <SplitterPanel
      ref="panel"
      v-slot="slotProps"
      :id="id"
      :default-size="defaultSize"
      :min-size="minSize"
      :max-size="maxSize"
      :collapsible="collapsible"
      :collapsed-size="collapsedSize"
      :size-unit="sizeUnit"
      :order="order"
      class="min-h-0 min-w-0 overflow-hidden"
      @resize="(size, prevSize) => emit('resize', size, prevSize)"
      @collapse="emit('collapse')"
      @expand="emit('expand')"
  >
    <slot v-bind="slotProps"/>
  </SplitterPanel>
</template>
