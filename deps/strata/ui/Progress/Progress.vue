<script setup lang="ts">
// Task-completion bar built on reka's Progress. Pass `value` for determinate; omit it for an
// indeterminate (loading) state. Pair with ProgressIndicator as the filled bar.
import { provide, reactive, computed } from 'vue';
import { ProgressRoot } from 'reka-ui';

const props = defineProps({
  value: { type: Number, default: undefined },
  max: { type: Number, default: 100 },
});

const percentage = computed(() =>
  props.value === undefined || props.value === null
    ? undefined
    : Math.min(100, Math.max(0, (props.value / props.max) * 100)),
);

provide('progress', reactive({
  value: computed(() => props.value),
  max: computed(() => props.max),
  percentage,
}));
</script>

<template>
  <ProgressRoot
    :model-value="value === undefined ? null : value"
    :max="max"
    class="relative h-1.5 w-full overflow-hidden rounded-full bg-border"
  >
    <slot />
  </ProgressRoot>
</template>
