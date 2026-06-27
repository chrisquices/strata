<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import Progress from '@ui/Progress/Progress.vue';
import ProgressIndicator from '@ui/Progress/ProgressIndicator.vue';
import Slider from '@ui/Slider/Slider.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const value = ref(60);

const completedSteps = 3;
const totalSteps = 5;
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Progress</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Shows completion of a task. Omit the value for an indeterminate state.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Determinate -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Determinate</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A known value fills the bar — currently {{ value }}%. Drag the slider to change it.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-80 flex-col gap-4">
          <Progress :value="value">
            <ProgressIndicator/>
          </Progress>
          <div class="w-48">
            <Slider v-model="value"/>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Indeterminate -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Indeterminate</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Omit the value and the bar loops to signal ongoing work of unknown length.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80">
          <Progress>
            <ProgressIndicator/>
          </Progress>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Custom maximum -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Custom maximum</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Set max to scale the value to any range — here {{ completedSteps }} of {{ totalSteps }} steps complete.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80">
          <Progress :value="completedSteps" :max="totalSteps">
            <ProgressIndicator/>
          </Progress>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
