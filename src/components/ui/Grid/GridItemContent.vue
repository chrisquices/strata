<script setup lang="ts">
import type {PropType} from 'vue';
import {computed, ref, watch} from 'vue';
import {File} from '@lucide/vue';

const props = defineProps({
  type: {
    type: String as PropType<'generic' | 'image' | 'video'>,
    default: 'generic',
    validator: function (value: string) {
      return ['generic', 'image', 'video'].includes(value);
    },
  },
  src: {type: String, default: ''},
  alt: {type: String, default: ''},
  poster: {type: String, default: undefined},
  aspect: {
    type: String as PropType<'square' | 'portrait' | 'landscape' | 'wide'>,
    default: 'square',
    validator: function (value: string) {
      return ['square', 'portrait', 'landscape', 'wide'].includes(value);
    },
  },
  fit: {
    type: String as PropType<'cover' | 'contain'>,
    default: 'cover',
    validator: function (value: string) {
      return ['cover', 'contain'].includes(value);
    },
  },
  loading: {
    type: String as PropType<'lazy' | 'eager'>,
    default: 'lazy',
    validator: function (value: string) {
      return ['lazy', 'eager'].includes(value);
    },
  },
  zoomOnHover: {type: Boolean, default: false},
});

const aspectClass = {
  square: 'aspect-square',
  portrait: 'aspect-[3/4]',
  landscape: 'aspect-[4/3]',
  wide: 'aspect-video',
};

const element = ref<HTMLElement>();
const mediaFailed = ref(false);
const hasMedia = computed(function () {
  return props.type !== 'generic' && !!props.src && !mediaFailed.value;
});
const fitClass = computed(function () {
  return props.fit === 'contain' ? 'object-contain' : 'object-cover';
});
const motionClass = computed(function () {
  return props.zoomOnHover
      ? 'transition-transform duration-200 ease-out group-hover/grid-item:scale-[1.03] group-focus-within/grid-item:scale-[1.03]'
      : '';
});

watch(function () {
  return [props.type, props.src];
}, function () {
  mediaFailed.value = false;
});

defineExpose({element});
</script>

<template>
  <div
      ref="element"
      data-grid-item-content
      :class="['relative w-full overflow-hidden bg-input', aspectClass[aspect]]"
  >
    <img
        v-if="type === 'image' && hasMedia"
        :src="src"
        :alt="alt"
        :loading="loading"
        draggable="false"
        :class="['size-full', fitClass, motionClass]"
        @error="mediaFailed = true"
    >

    <video
        v-else-if="type === 'video' && hasMedia"
        :src="src"
        :poster="poster"
        :aria-label="alt || undefined"
        :aria-hidden="alt ? undefined : 'true'"
        muted
        playsinline
        preload="metadata"
        :class="['size-full', fitClass, motionClass]"
        @error="mediaFailed = true"
    />

    <div v-else class="flex size-full items-center justify-center text-muted">
      <slot name="fallback">
        <slot>
          <File class="size-icon-extra-large" aria-hidden="true"/>
        </slot>
      </slot>
    </div>
  </div>
</template>
