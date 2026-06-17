<script setup lang="ts">
import { computed } from 'vue';
import { injectStepperRootContext } from 'reka-ui';

const props = defineProps({ step: { required: true, type: Number } });

const root = injectStepperRootContext();
const isActive = computed(() => root.modelValue.value === props.step);
</script>

<template>
  <div v-if="isActive" role="group" :aria-label="`Step ${step}`" class="min-w-0 flex-1">
    <slot />
  </div>
</template>
