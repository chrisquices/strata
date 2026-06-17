<script setup lang="ts">
import type { PropType } from 'vue';
// Formats a byte count on a binary (1024) scale.
// variant: short ("2.4 MB") | compact ("2.4M") | detailed ("2,576,384 bytes").
import { computed } from 'vue';
import { formatFileSize } from '../Shared/utils.js';

const props = defineProps({
  bytes: { type: [Number, String], default: 0 },
  variant: { type: String as PropType<'short' | 'compact' | 'detailed'>, default: 'short', validator: (value: string) => ['short', 'compact', 'detailed'].includes(value) },
});
const text = computed(() => formatFileSize(props.bytes, props.variant));
</script>

<template>
  <span class="tabular-nums">{{ text }}</span>
</template>
