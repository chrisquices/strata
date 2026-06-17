<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Rating from '@ui/Rating/Rating.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const score = ref(3);
const precise = ref(3.5);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Rating</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A star rating. Click to set (click the current value again to clear), or focus and use arrow keys / Home / End. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is a number.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Interactive. Value: <strong class="text-foreground">{{ score }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="interactive"><Rating v-model="score" label="Rate this" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Half-stars (<code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">allowHalf</code>) — click a star's left/right half, or arrow by 0.5. Value: <strong class="text-foreground">{{ precise }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="half"><Rating v-model="precise" allow-half label="Rate (half stars)" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Sizes, a custom max, read-only, and disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-3" data-demo="variants">
          <Rating v-model="score" size="sm" />
          <Rating v-model="score" size="lg" />
          <Rating :model-value="7" :max="10" readonly />
          <Rating :model-value="3" disabled />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
