<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import TruncateMiddle from '@ui/TruncateMiddle/TruncateMiddle.vue';
import Slider from '@ui/Slider/Slider.vue';
import SliderRange from '@ui/Slider/SliderRange.vue';
import SliderThumb from '@ui/Slider/SliderThumb.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const path = '/Users/ada/Projects/strata/src/components/ui/TruncateMiddle/TruncateMiddle.vue';
const width = ref(320);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Truncate Middle</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      Truncates long text in the middle, keeping the start and the last few characters (e.g. file paths). Measures to fit the width.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Drag the slider to resize the container. Container width: {{ width }}px</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4" data-demo="measured">
          <div class="w-64">
            <Slider v-model="width" :min="120" :max="560">
              <SliderRange />
              <SliderThumb />
            </Slider>
          </div>
          <div class="rounded-medium border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground" :style="{ width: width + 'px' }">
            <TruncateMiddle :text="path" :end-length="12" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>optimize mode uses a pure-CSS approximation (no measuring).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72 rounded-medium border border-border bg-surface px-3 py-2 font-mono text-xs text-foreground" data-demo="optimize">
          <TruncateMiddle :text="path" :end-length="12" optimize />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
