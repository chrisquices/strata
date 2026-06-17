<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Calendar from '@ui/Calendar/Calendar.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const date = ref('2026-06-14');
const bounded = ref('');
const twoMonths = ref('');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Calendar</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A month calendar built on reka. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string; arrow keys move days and Page Up/Down change months.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Single date. Selected: <strong class="text-foreground">{{ date || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="single"><Calendar v-model="date" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Bounded to June 2026 (min/max). Selected: <strong class="text-foreground">{{ bounded || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="bounded"><Calendar v-model="bounded" min-value="2026-06-05" max-value="2026-06-24" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Two months. Selected: <strong class="text-foreground">{{ twoMonths || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="two-months"><Calendar v-model="twoMonths" :number-of-months="2" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
