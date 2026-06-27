<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import Slider from '@ui/Slider/Slider.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const volume = ref(40);
const range = ref([25, 75]);
const small = ref(60);
const medium = ref(50);
const large = ref(70);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Slider</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A range input built on reka — single value or a two-thumb range, with sizes.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Single value -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Single value</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Backed by a single number; the model updates live as you drag. Value: {{ volume }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Slider v-model="volume" :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Range -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Range</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>An array model renders one thumb per value for selecting a span. Value: {{ range.join('–') }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Slider v-model="range" :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Small, medium, and large set the track thickness and thumb diameter; medium is the default.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex max-w-sm flex-col gap-6">
          <Slider v-model="small" size="sm" :min="0" :max="100" />
          <Slider v-model="medium" size="md" :min="0" :max="100" />
          <Slider v-model="large" size="lg" :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A disabled slider fades to half opacity and ignores pointer and keyboard input.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Slider :model-value="50" disabled :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
