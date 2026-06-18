<script setup lang="ts">
import { provide } from 'vue';
import { StepperRoot } from 'reka-ui';

defineProps({ linear: { type: Boolean, default: true } });
const step = defineModel<number>('step', { default: 1 });
const emit = defineEmits<{ cancel: []; complete: [] }>();

// reka counts steps and drives navigation; cancel/complete aren't reka concepts,
// so provide them for StepperFooter.
provide('stepperKit', { onCancel: () => emit('cancel'), onComplete: () => emit('complete') });
</script>

<template>
  <StepperRoot v-model="step" :linear="linear" class="flex flex-col">
    <slot />
  </StepperRoot>
</template>
