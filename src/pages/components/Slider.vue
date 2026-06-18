<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Slider from '@ui/Slider/Slider.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const volume = ref(40);
const range = ref([25, 75]);
const small = ref(60);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Slider</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A range input built on reka — single value or a two-thumb range, with sizes.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Single value</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Value: {{ volume }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm" data-demo="single">
          <Slider v-model="volume" :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Range</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Value: {{ range.join('–') }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm" data-demo="range">
          <Slider v-model="range" :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Small &amp; disabled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex max-w-sm flex-col gap-6" data-demo="variants">
          <Slider v-model="small" size="sm" :min="0" :max="100" />
          <Slider :model-value="50" disabled :min="0" :max="100" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
