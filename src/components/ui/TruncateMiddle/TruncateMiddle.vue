<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, onUpdated, ref, watch} from 'vue';

const props = defineProps({
  endLength: {
    type: Number,
    default: 8,
    validator: function (value: number) {
      return Number.isInteger(value) && value >= 0;
    },
  },
  optimize: {type: Boolean, default: false},
});

const element = ref<HTMLElement | null>(null);
const source = ref<HTMLElement | null>(null);
const fullText = ref('');
const measured = ref('');
const safeEndLength = computed(function () {
  const length = Number.isFinite(props.endLength) ? Math.floor(props.endLength) : 0;

  return Math.min(Math.max(length, 0), fullText.value.length);
});
const parts = computed(function () {
  if (safeEndLength.value >= fullText.value.length) {
    return {head: fullText.value, tail: ''};
  }

  return {
    head: fullText.value.slice(0, fullText.value.length - safeEndLength.value),
    tail: fullText.value.slice(fullText.value.length - safeEndLength.value),
  };
});

let context: CanvasRenderingContext2D | null = null;
let resizeObserver: ResizeObserver | null = null;

function widthOf(string: string, font: string) {
  if (!context) {
    context = document.createElement('canvas').getContext('2d');
  }

  if (!context) {
    return string.length;
  }

  context.font = font;
  return context.measureText(string).width;
}

function recompute() {
  if (!element.value) {
    return;
  }

  const available = element.value.clientWidth;
  const style = getComputedStyle(element.value);
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  if (safeEndLength.value >= fullText.value.length) {
    measured.value = fullText.value;
    return;
  }

  if (widthOf(fullText.value, font) <= available) {
    measured.value = fullText.value;
    return;
  }

  const tail = fullText.value.slice(fullText.value.length - safeEndLength.value);
  let low = 0;
  let high = fullText.value.length - safeEndLength.value;
  let best = 0;

  while (low <= high) {
    const middle = (low + high) >> 1;
    const candidate = fullText.value.slice(0, middle) + '...' + tail;

    if (widthOf(candidate, font) <= available) {
      best = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  measured.value = fullText.value.slice(0, best) + '...' + tail;
}

function teardown() {
  resizeObserver?.disconnect();
  resizeObserver = null;
}

function syncText() {
  const nextText = source.value?.textContent?.trim() || '';

  if (nextText === fullText.value) {
    return false;
  }

  fullText.value = nextText;
  return true;
}

function connect() {
  teardown();

  if (props.optimize || !element.value) {
    return;
  }

  recompute();
  resizeObserver = new ResizeObserver(recompute);
  resizeObserver.observe(element.value);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(recompute);
  }
}

function refresh() {
  syncText();
  measured.value = fullText.value;
  connect();
}

onMounted(refresh);
onBeforeUnmount(teardown);
onUpdated(function () {
  if (syncText()) {
    recompute();
  }
});
watch(function () {
  return [props.endLength, props.optimize];
}, function () {
  measured.value = fullText.value;
  connect();
});
</script>

<template>
  <span ref="element" :title="fullText" class="block min-w-0 max-w-full overflow-hidden whitespace-nowrap">
    <span ref="source" class="sr-only">
      <slot />
    </span>
    <span v-if="optimize" aria-hidden="true" class="flex min-w-0">
      <span class="min-w-0 truncate">{{ parts.head }}</span>
      <span class="flex-none whitespace-pre">{{ parts.tail }}</span>
    </span>
    <span v-else aria-hidden="true">{{ measured || fullText }}</span>
  </span>
</template>
