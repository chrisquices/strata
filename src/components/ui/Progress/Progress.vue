<script setup lang="ts">
// Task-completion bar built on reka's Progress. Pass `value` for determinate; omit it for an
// indeterminate (loading) state. Pair with ProgressIndicator as the filled bar. reka's ProgressRoot
// owns value/max/state and provides them to ProgressIndicator, so no extra context is needed here.
import {ProgressRoot} from 'reka-ui';

const props = defineProps({
  value: {type: Number, default: undefined},
  max: {type: Number, default: 100},
});
</script>

<template>
  <ProgressRoot
      :model-value="props.value === undefined ? null : props.value"
      :max="props.max"
      class="relative h-2 w-full overflow-hidden rounded-full bg-border"
  >
    <slot/>
  </ProgressRoot>
</template>
