<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import RangeCalendar from '@ui/RangeCalendar/RangeCalendar.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const range = ref({ start: '2026-06-09', end: '2026-06-16' });
const bounded = ref({ start: '', end: '' });
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Range Calendar</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A two-month calendar for selecting a date range. Click a start then an end; the in-progress range highlights as you hover. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is a <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">{ start, end }</code> of ISO strings.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Range: <strong class="text-foreground">{{ range.start || '…' }} → {{ range.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="range"><RangeCalendar v-model="range" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Bounded to June 2026 with <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">min-value</code> / <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">max-value</code> — dates outside the range are unavailable. Range: <strong class="text-foreground">{{ bounded.start || '…' }} → {{ bounded.end || '…' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="bounded"><RangeCalendar v-model="bounded" min-value="2026-06-01" max-value="2026-06-30" :number-of-months="1" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
