<script setup lang="ts">
import type { PropType } from 'vue';
import { computed } from 'vue';

const props = defineProps({
  data: { type: Array, default: () => [] },
  variant: {
    type: String as PropType<'primary' | 'success' | 'warning' | 'destructive' | 'muted'>,
    default: 'primary',
    validator: (value: string) => ['primary', 'success', 'warning', 'destructive', 'muted'].includes(value),
  },
  fill: { type: Boolean, default: false },
  label: { type: String, default: undefined },
});

const strokeColor = {
  primary: 'stroke-foreground',
  success: 'stroke-success',
  warning: 'stroke-warning',
  destructive: 'stroke-destructive',
  muted: 'stroke-muted',
};
const fillColor = {
  primary: 'fill-foreground/10',
  success: 'fill-success/10',
  warning: 'fill-warning/10',
  destructive: 'fill-destructive/10',
  muted: 'fill-muted/10',
};

// The svg uses preserveAspectRatio="none" to stretch the viewBox to its box;
// vector-effect="non-scaling-stroke" on the line keeps the stroke width constant despite that.
const PAD = 0.1;
const viewBoxWidth = 100;
const viewBoxHeight = 32;

const points = computed(() => {
  const data = props.data;
  if (!data || data.length < 2) return '';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padded = range * PAD;
  const yMin = min - padded;
  const yMax = max + padded;
  const yRange = yMax - yMin;
  const step = viewBoxWidth / (data.length - 1);
  return data
    .map((value, index) => {
      const x = index * step;
      const y = viewBoxHeight - ((value - yMin) / yRange) * viewBoxHeight;
      return `${x},${y}`;
    })
    .join(' ');
});

const fillPoints = computed(() =>
  points.value ? `${points.value} ${viewBoxWidth},${viewBoxHeight} 0,${viewBoxHeight}` : '',
);
</script>

<template>
  <svg
    v-if="data && data.length >= 2"
    :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
    preserveAspectRatio="none"
    class="w-16 h-5"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
  >
    <polygon v-if="fill && fillPoints" :points="fillPoints" :class="fillColor[variant]" stroke="none" />
    <polyline
      :points="points"
      fill="none"
      :class="strokeColor[variant]"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      vector-effect="non-scaling-stroke"
    />
  </svg>
</template>
