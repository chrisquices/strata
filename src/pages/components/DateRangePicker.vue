<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import DateRangePicker from '@ui/DateRangePicker/DateRangePicker.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const range = ref({ start: '2026-06-10', end: '2026-06-17' });
const empty = ref({ start: '', end: '' });
const triggerOnly = ref({ start: '2026-06-10', end: '2026-06-17' });
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Date Range Picker</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Start/end segmented fields with a calendar button. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is a <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">{ start, end }</code> object of ISO date strings.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Pre-filled. Range: <strong class="text-foreground">{{ range.start || '…' }} → {{ range.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="prefilled"><DateRangePicker v-model="range" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Empty. Range: <strong class="text-foreground">{{ empty.start || '…' }} → {{ empty.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="empty"><DateRangePicker v-model="empty" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Click-only summary. Range: <strong class="text-foreground">{{ triggerOnly.start || '…' }} → {{ triggerOnly.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72" data-demo="trigger-only"><DateRangePicker v-model="triggerOnly" :editable="false" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
