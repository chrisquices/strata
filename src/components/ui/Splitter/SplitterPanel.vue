<script setup lang="ts">
// A single resizable pane. Sizes are in `sizeUnit` (default '%'): defaultSize/minSize/maxSize.
// Set `collapsible` (+ optional collapsedSize) to allow collapsing. The default slot receives reka's
// panel state and helpers: { isCollapsed, isExpanded, collapse, expand, resize }. The same imperative
// API (collapse/expand/resize/getSize + isCollapsed/isExpanded refs) is exposed via a template ref.
import {computed, ref} from 'vue';
import type {PropType} from 'vue';
import {SplitterPanel} from 'reka-ui';

const props = defineProps({
  id: {type: String, default: undefined},
  defaultSize: {type: Number, default: undefined},
  minSize: {type: Number, default: undefined},
  maxSize: {type: Number, default: undefined},
  collapsible: {type: Boolean, default: false},
  collapsedSize: {type: Number, default: undefined},
  sizeUnit: {
    type: String as PropType<'%' | 'px'>,
    default: undefined,
    validator: function (value: string) {
      return ['%', 'px'].includes(value);
    }
  },
  order: {type: Number, default: undefined},
});
// prevSize is undefined on the first resize notification (reka has no prior size yet).
const emit = defineEmits<{ resize: [size: number, prevSize: number | undefined]; collapse: []; expand: [] }>();

// reka's panel instance exposes the imperative + reactive collapse API; forward it through this wrapper.
type RekaPanel = {
  collapse(): void;
  expand(): void;
  resize(size: number): void;
  getSize(): number;
  isCollapsed: boolean;
  isExpanded: boolean;
};
const panel = ref<RekaPanel | null>(null);

function collapsePanel() {
  return panel.value?.collapse();
}

function expandPanel() {
  return panel.value?.expand();
}

function resizePanel(size: number) {
  return panel.value?.resize(size);
}

function getPanelSize() {
  return panel.value?.getSize();
}

const isCollapsed = computed(function () {
  return panel.value?.isCollapsed ?? false;
});

const isExpanded = computed(function () {
  return panel.value?.isExpanded ?? true;
});

defineExpose({
  collapse: collapsePanel,
  expand: expandPanel,
  resize: resizePanel,
  getSize: getPanelSize,
  isCollapsed: isCollapsed,
  isExpanded: isExpanded,
});

function onResize(size: number, prevSize: number | undefined) {
  emit('resize', size, prevSize);
}
</script>

<template>
  <SplitterPanel
      ref="panel"
      v-slot="slotProps"
      :id="props.id"
      :default-size="props.defaultSize"
      :min-size="props.minSize"
      :max-size="props.maxSize"
      :collapsible="props.collapsible"
      :collapsed-size="props.collapsedSize"
      :size-unit="props.sizeUnit"
      :order="props.order"
      class="min-h-0 min-w-0 overflow-hidden"
      @resize="onResize"
      @collapse="emit('collapse')"
      @expand="emit('expand')"
  >
    <slot v-bind="slotProps"/>
  </SplitterPanel>
</template>
