<script setup lang="ts">
import type {PropType} from 'vue';
import type {DropzoneInstance, DropzoneMessage, DropzoneState} from './types';
import {ref, watch} from 'vue';
import {createDropzone} from '../../../assets/js/dropzone.js';

const props = defineProps({
  accept: {type: Array as PropType<string[]>, default: undefined},
  exclude: {type: Array as PropType<string[]>, default: undefined},
  minSize: {type: Number, default: undefined},
  maxSize: {type: Number, default: undefined},
  maxFiles: {type: Number, default: undefined},
  maxTotalSize: {type: Number, default: undefined},
  multiple: {type: Boolean, default: true},
  openOnClick: {type: Boolean, default: true},
  disabled: {type: Boolean, default: false},
  dedupe: {type: Boolean, default: true},
});

const emit = defineEmits<{
  change: [state: DropzoneState];
  messages: [messages: DropzoneMessage[]];
  'drag-over-change': [dragging: boolean];
}>();

const dropzoneAdapter = {
  element: null as HTMLElement | null,
  instance: null as DropzoneInstance | null,
  dragging: ref(false),
  setElement: function (element: HTMLElement | null) {
    if (dropzoneAdapter.element === element) {
      return;
    }

    dropzoneAdapter.destroy();
    dropzoneAdapter.element = element;

    if (element) {
      dropzoneAdapter.mount();
    }
  },
  handleChange: function (state: DropzoneState) {
    emit('change', state);
  },
  handleMessages: function (messages: DropzoneMessage[]) {
    emit('messages', messages);
  },
  handleDragOverChange: function (value: boolean) {
    dropzoneAdapter.dragging.value = value;
    emit('drag-over-change', value);
  },
  createOptions: function () {
    return {
      onChange: dropzoneAdapter.handleChange,
      onMessages: dropzoneAdapter.handleMessages,
      onDragOverChange: dropzoneAdapter.handleDragOverChange,
      accept: props.accept,
      exclude: props.exclude,
      minSize: props.minSize,
      maxSize: props.maxSize,
      maxFiles: props.maxFiles,
      maxTotalSize: props.maxTotalSize,
      multiple: props.multiple,
      openOnClick: props.openOnClick,
      disabled: props.disabled,
      dedupe: props.dedupe,
    };
  },
  mount: function () {
    dropzoneAdapter.destroy();

    if (!dropzoneAdapter.element) {
      return;
    }

    dropzoneAdapter.instance = createDropzone(dropzoneAdapter.element, dropzoneAdapter.createOptions());
  },
  destroy: function () {
    if (!dropzoneAdapter.instance) {
      return;
    }

    dropzoneAdapter.instance.destroy();
    dropzoneAdapter.instance = null;
    dropzoneAdapter.dragging.value = false;
  },
  getZoneClass: function () {
    if (props.disabled) {
      return 'border-border bg-surface text-muted opacity-50';
    }

    if (dropzoneAdapter.dragging.value) {
      return 'border-foreground bg-surface text-foreground';
    }

    return 'border-border bg-background text-muted hover:border-foreground/30 hover:bg-surface';
  },
};

watch(props, dropzoneAdapter.mount, {deep: true});
</script>

<template>
  <div
      :ref="dropzoneAdapter.setElement"
      role="button"
      tabindex="0"
      aria-label="Drop files or browse"
      :class="['flex cursor-pointer flex-col items-center justify-center gap-3 rounded-large border-medium border-dashed p-8 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background', dropzoneAdapter.getZoneClass()]"
  >
    <slot/>
  </div>
</template>
