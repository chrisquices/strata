<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, onBeforeUnmount, ref, watchEffect } from 'vue';
import { formatTime, toIsoString } from '../Shared/utils.js';

const props = defineProps({
  value: { default: null },
  variant: {
    type: String as PropType<'relative' | 'date' | 'time' | 'datetime'>,
    default: 'relative',
    validator: (value: string) => ['relative', 'date', 'time', 'datetime'].includes(value),
  },
});

// Relative text goes stale by definition — refresh it once a minute.
const tick = ref(0);
let timer = null;
watchEffect(() => {
  if (timer) { clearInterval(timer); timer = null; }
  if (props.variant === 'relative' && props.value != null) {
    timer = setInterval(() => { tick.value++; }, 60_000);
  }
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); });

const text = computed(() => { void tick.value; return formatTime(props.value, props.variant); });
const isoString = computed(() => toIsoString(props.value));
const fullLabel = computed(() => formatTime(props.value, 'datetime'));
</script>

<template>
  <time :datetime="isoString" :title="fullLabel">{{ text }}</time>
</template>
