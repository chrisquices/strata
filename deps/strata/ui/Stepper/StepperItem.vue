<script setup lang="ts">
import { StepperItem, StepperTrigger, StepperIndicator, StepperTitle, StepperDescription } from 'reka-ui';
import { Check } from '@lucide/vue';

defineProps({
  step: { required: true, type: Number },
  title: { type: String, default: '' },
  description: { type: String, default: '' },
});

// reka's StepperItem slot exposes state: 'active' | 'completed' | 'inactive'.
const indicatorClass = (state) =>
  state === 'active' || state === 'completed' ? 'bg-foreground text-background' : 'border border-border text-faint';
const titleClass = (state) =>
  state === 'active' ? 'text-foreground font-medium' : state === 'completed' ? 'text-muted' : 'text-faint';
const descriptionClass = (state) => (state === 'active' ? 'text-muted' : 'text-faint');
</script>

<template>
  <StepperItem v-slot="{ state }" :step="step" class="group">
    <StepperTrigger
      class="flex w-full gap-3 rounded-small text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-default"
    >
      <div class="flex flex-col items-center">
        <StepperIndicator
          :class="['flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors duration-200', indicatorClass(state)]"
        >
          <Check v-if="state === 'completed'" class="size-icon-small" aria-hidden="true" />
          <template v-else>{{ step }}</template>
        </StepperIndicator>
        <div class="mt-1.5 w-px flex-1 bg-border group-last:hidden"></div>
      </div>
      <div class="min-w-0 pb-6 group-last:pb-0">
        <StepperTitle :class="['block text-sm leading-tight transition-colors duration-200', titleClass(state)]">{{ title }}</StepperTitle>
        <StepperDescription
          v-if="description"
          :class="['mt-0.5 block text-xs leading-tight transition-colors duration-200', descriptionClass(state)]"
        >{{ description }}</StepperDescription>
      </div>
    </StepperTrigger>
  </StepperItem>
</template>
