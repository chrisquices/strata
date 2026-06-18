<script setup lang="ts">
// Truncates long text in the middle, keeping the start and the last `endLength`
// characters (e.g. file paths). The default mode canvas-measures the text and
// binary-searches the largest head that fits, re-running via ResizeObserver.
// `optimize` swaps in a cheaper pure-CSS approximation (no measuring). aria-label
// always carries the full string so screen readers read it, not the clipped text.
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  text: { type: String, default: '' },
  endLength: { type: Number, default: 8 },
  optimize: { type: Boolean, default: false },
});

const head = computed(() =>
  props.endLength >= props.text.length ? props.text : props.text.slice(0, props.text.length - props.endLength),
);
const tailText = computed(() =>
  props.endLength >= props.text.length ? '' : props.text.slice(props.text.length - props.endLength),
);

const element = ref(null);
const measured = ref(props.text);

function fontOf(node) {
  const style = getComputedStyle(node);
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

let context;
function widthOf(string, font) {
  if (!context) context = document.createElement('canvas').getContext('2d');
  context.font = font;
  return context.measureText(string).width;
}

function recompute() {
  const el = element.value;
  if (!el) return;
  const available = el.clientWidth;
  if (props.endLength >= props.text.length) { measured.value = props.text; return; }
  const font = fontOf(el);
  if (widthOf(props.text, font) <= available) { measured.value = props.text; return; }
  const end = props.text.slice(props.text.length - props.endLength);
  let low = 0, high = props.text.length - props.endLength, best = 0;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if (widthOf(props.text.slice(0, middle) + '…' + end, font) <= available) { best = middle; low = middle + 1; }
    else high = middle - 1;
  }
  measured.value = props.text.slice(0, best) + '…' + end;
}

let observer = null;
let active = false;
function teardown() { if (observer) { observer.disconnect(); observer = null; } active = false; }
function setup() {
  teardown();
  if (props.optimize || !element.value) return;
  recompute();
  observer = new ResizeObserver(recompute);
  observer.observe(element.value);
  active = true;
  if (document.fonts?.ready) document.fonts.ready.then(() => { if (active) recompute(); });
}

onMounted(setup);
onBeforeUnmount(teardown);
watch(() => [props.text, props.endLength, props.optimize], () => nextTick(setup));
</script>

<template>
  <span ref="element" :title="text" :aria-label="text" class="block min-w-0 max-w-full overflow-hidden whitespace-nowrap">
    <span v-if="optimize" class="flex min-w-0">
      <span class="min-w-0 truncate">{{ head }}</span>
      <span class="flex-none whitespace-pre">{{ tailText }}</span>
    </span>
    <template v-else>{{ measured }}</template>
  </span>
</template>
