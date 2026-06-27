<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import {ref} from 'vue';
import TruncateMiddle from '@ui/TruncateMiddle/TruncateMiddle.vue';
import Slider from '@ui/Slider/Slider.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const filePath = '/Users/ada/Projects/strata/src/components/ui/TruncateMiddle/TruncateMiddle.vue';
const width = ref(320);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Truncate Middle</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Truncates long text in the middle, keeping the start and the last few characters. Measures to fit the width.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Measured -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Measured</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Drag the slider to resize the container. Container width: {{ width }} pixels.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4">
          <div class="w-64">
            <Slider v-model="width" :min="120" :max="560"/>
          </div>
          <div class="rounded-medium border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground"
               :style="{ width: width + 'px' }">
            <TruncateMiddle :end-length="12">
              {{ filePath }}
            </TruncateMiddle>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Optimized -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Optimized</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Optimize mode uses a pure CSS approximation without measuring.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-64 rounded-medium border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground">
          <TruncateMiddle :end-length="12" optimize>
            {{ filePath }}
          </TruncateMiddle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
