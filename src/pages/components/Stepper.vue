<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';

import Stepper from '@ui/Stepper/Stepper.vue';
import StepperList from '@ui/Stepper/StepperList.vue';
import StepperItem from '@ui/Stepper/StepperItem.vue';
import StepperContent from '@ui/Stepper/StepperContent.vue';
import StepperFooter from '@ui/Stepper/StepperFooter.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const step = ref(1);
const done = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Stepper</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A multi-step wizard — a step list, per-step content, and a footer with cancel / back / continue.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Current step: {{ step }}{{ done ? ' (completed!)' : '' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-2xl overflow-hidden rounded-large border border-border bg-surface" data-demo="wizard">
          <Stepper v-model:step="step" @complete="done = true" @cancel="step = 1">
            <div class="flex gap-8 p-6">
              <StepperList>
                <StepperItem :step="1" title="Account" description="Your details" />
                <StepperItem :step="2" title="Workspace" description="Team setup" />
                <StepperItem :step="3" title="Review" description="Confirm & finish" />
              </StepperList>
              <div class="min-w-0 flex-1">
                <StepperContent :step="1"><p class="text-sm text-muted">Step 1 — enter your account details.</p></StepperContent>
                <StepperContent :step="2"><p class="text-sm text-muted">Step 2 — configure your workspace.</p></StepperContent>
                <StepperContent :step="3"><p class="text-sm text-muted">Step 3 — review everything and finish.</p></StepperContent>
              </div>
            </div>
            <StepperFooter />
          </Stepper>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
