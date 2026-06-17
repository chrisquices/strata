<script setup lang="ts">
import { computed } from 'vue';
import type { PropType } from 'vue';
import { TrendingUp, TrendingDown } from '@lucide/vue';

const props = defineProps({
  value: { type: [String, Number], default: '0' },
  label: { type: String, default: '' },
  trend: { type: String as PropType<'up' | 'down'>, default: undefined, validator: (value: string | undefined) => value === undefined || ['up', 'down'].includes(value) },
  delta: { type: String, default: '' },
});

const TrendIcon = computed(() => (props.trend === 'up' ? TrendingUp : TrendingDown));
const trendColor = computed(() =>
  props.trend === 'up' ? 'text-success' : props.trend === 'down' ? 'text-destructive' : 'text-muted',
);
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="flex items-end justify-between gap-4">
      <span class="text-2xl font-semibold tabular-nums text-foreground leading-none tracking-tight">{{ value }}</span>
      <span v-if="trend && delta" :class="['flex items-center gap-1 text-xs font-medium pb-0.5 shrink-0', trendColor]">
        <component :is="TrendIcon" class="size-icon-small" aria-hidden="true" />
        <span class="sr-only">{{ trend === 'up' ? 'trending up' : 'trending down' }}</span>
        {{ delta }}
      </span>
    </div>
    <span v-if="label" class="text-xs text-muted">{{ label }}</span>
  </div>
</template>
