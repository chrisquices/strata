<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import DatePicker from '@ui/DatePicker/DatePicker.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const date = ref('2026-06-14');
const bounded = ref('');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Date Picker</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A segmented date field with a popover calendar. Type into the segments or pick a day. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Pick a date. Selected: <strong class="text-foreground">{{ date || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-60" data-demo="basic"><DatePicker v-model="date" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Bounded to June 2026. Selected: <strong class="text-foreground">{{ bounded || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-60" data-demo="bounded"><DatePicker v-model="bounded" min-value="2026-06-01" max-value="2026-06-30" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-60" data-demo="disabled"><DatePicker v-model="date" disabled /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
