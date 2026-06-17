<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Progress from '@ui/Progress/Progress.vue';
import ProgressIndicator from '@ui/Progress/ProgressIndicator.vue';
import Slider from '@ui/Slider/Slider.vue';
import SliderRange from '@ui/Slider/SliderRange.vue';
import SliderThumb from '@ui/Slider/SliderThumb.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const value = ref(60);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Progress</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Shows completion of a task. Omit the value for an indeterminate state.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Determinate — {{ value }}%</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-80 flex-col gap-4" data-demo="determinate">
          <Progress :value="value"><ProgressIndicator /></Progress>
          <div class="w-48">
            <Slider v-model="value" :min="0" :max="100">
              <SliderRange />
              <SliderThumb />
            </Slider>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Indeterminate — no value.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80" data-demo="indeterminate">
          <Progress><ProgressIndicator /></Progress>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
