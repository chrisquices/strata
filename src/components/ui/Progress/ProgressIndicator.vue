<script setup lang="ts">
// The filled bar. Wraps reka's ProgressIndicator (so it carries reka's data-state/value/max) and
// reads the root context for the width. With no value it falls back to an indeterminate sweep.
import {computed} from 'vue';
import {ProgressIndicator, injectProgressRootContext} from 'reka-ui';

const context = injectProgressRootContext();

const percentage = computed(function () {
  const value = context.modelValue.value;
  if (value === undefined || value === null) {
    return undefined;
  }
  return Math.min(100, Math.max(0, (value / context.max.value) * 100));
});
</script>

<template>
  <ProgressIndicator as-child>
    <div
        v-if="percentage !== undefined"
        class="h-full rounded-full bg-foreground transition-all duration-300"
        :style="{ width: percentage + '%' }"
    ></div>
    <div v-else class="strata-progress-indeterminate h-full w-1/3 rounded-full bg-foreground opacity-60"></div>
  </ProgressIndicator>
</template>

<style scoped>
@keyframes strata-progress-indeterminate {
  from {
    translate: -110% 0;
  }
  to {
    translate: 320% 0;
  }
}

.strata-progress-indeterminate {
  animation: strata-progress-indeterminate 1.5s ease-in-out infinite;
}
</style>
