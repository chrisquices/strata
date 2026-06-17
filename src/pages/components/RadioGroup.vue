<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import RadioGroup from '@ui/RadioGroup/RadioGroup.vue';
import RadioGroupItem from '@ui/RadioGroup/RadioGroupItem.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const plan = ref('pro');
const size = ref('md');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Radio Group</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A set of mutually exclusive options; arrow keys move between them.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Pick one. Selected: {{ plan }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic">
          <RadioGroup v-model="plan">
            <RadioGroupItem value="free">Free</RadioGroupItem>
            <RadioGroupItem value="pro">Pro</RadioGroupItem>
            <RadioGroupItem value="team" disabled>Team (coming soon)</RadioGroupItem>
          </RadioGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Horizontal orientation. Selected: {{ size }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="horizontal">
          <RadioGroup v-model="size" orientation="horizontal">
            <RadioGroupItem value="sm">Small</RadioGroupItem>
            <RadioGroupItem value="md">Medium</RadioGroupItem>
            <RadioGroupItem value="lg">Large</RadioGroupItem>
          </RadioGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
