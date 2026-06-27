<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import MonthRangePicker from '@ui/MonthRangePicker/MonthRangePicker.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const range = ref({ start: '2026-03-01', end: '2026-08-01' });
const empty = ref({ start: '', end: '' });
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Month Range Picker</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>An inline month range grid built on reka. Click a start then an end month to select a span. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is a <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">{ start, end }</code> object of ISO date strings.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Pre-filled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Pre-filled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Pre-filled with a range. Selected: <strong class="text-foreground">{{ range.start || '…' }} → {{ range.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <MonthRangePicker v-model="range" />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Empty -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Empty</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>No initial selection. Selected: <strong class="text-foreground">{{ empty.start || '…' }} → {{ empty.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <MonthRangePicker v-model="empty" />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Readonly -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Readonly</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The grid is visible but does not accept changes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <MonthRangePicker v-model="range" readonly />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <MonthRangePicker v-model="range" disabled />
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
