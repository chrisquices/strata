<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import MonthPicker from '@ui/MonthPicker/MonthPicker.vue';
import MonthRangePicker from '@ui/MonthRangePicker/MonthRangePicker.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const month = ref('2026-06-01');
const empty = ref('');
const clickable = ref('2026-10-01');
const range = ref({ start: '2026-03-01', end: '2026-08-01' });
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Month Picker</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Input-like month pickers built on reka, with a popover grid and optional whole-field trigger. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Pre-filled. Selected: <strong class="text-foreground">{{ month || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="prefilled"><MonthPicker v-model="month" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Empty. Selected: <strong class="text-foreground">{{ empty || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="empty"><MonthPicker v-model="empty" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Whole field opens the picker. Selected: <strong class="text-foreground">{{ clickable || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="clickable"><MonthPicker v-model="clickable" clickable /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Range. Selected: <strong class="text-foreground">{{ range.start || '…' }} → {{ range.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="range"><MonthRangePicker v-model="range" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="disabled"><MonthPicker v-model="month" disabled /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
