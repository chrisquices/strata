<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import YearPicker from '@ui/YearPicker/YearPicker.vue';
import YearRangePicker from '@ui/YearRangePicker/YearRangePicker.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const year = ref('2026-01-01');
const empty = ref('');
const clickable = ref('2032-01-01');
const range = ref({ start: '2024-01-01', end: '2028-01-01' });
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Year Picker</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Input-like year pickers built on reka, with a popover grid and optional whole-field trigger. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Pre-filled. Selected: <strong class="text-foreground">{{ year || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="prefilled"><YearPicker v-model="year" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Empty. Selected: <strong class="text-foreground">{{ empty || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="empty"><YearPicker v-model="empty" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Whole field opens the picker. Selected: <strong class="text-foreground">{{ clickable || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="clickable"><YearPicker v-model="clickable" clickable /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Range. Selected: <strong class="text-foreground">{{ range.start || '…' }} → {{ range.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="range"><YearRangePicker v-model="range" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="disabled"><YearPicker v-model="year" disabled /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
