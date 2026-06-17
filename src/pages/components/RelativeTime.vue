<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import RelativeTime from '@ui/RelativeTime/RelativeTime.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const now = Date.now();
const moment = new Date(2026, 4, 31, 14, 41);
const relatives = [
  { caption: '50 seconds ago', value: now - 50_000 },
  { caption: '5 minutes ago', value: now - 5 * 60_000 },
  { caption: '3 hours ago', value: now - 3 * 3_600_000 },
  { caption: 'in 2 days', value: now + 2 * 86_400_000 },
];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Relative Time</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Renders a timestamp as human-friendly text in a semantic <code class="rounded-small bg-input px-1 py-0.5 font-mono text-[12px]">&lt;time&gt;</code> element. Relative text refreshes itself once a minute.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Relative (default) — auto-updating. Hover for the full date.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2 text-sm text-foreground" data-demo="relative">
          <div v-for="r in relatives" :key="r.caption" class="flex justify-between gap-6">
            <span class="text-muted">{{ r.caption }}</span>
            <RelativeTime :value="r.value" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Fixed formats from one instant.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2 text-sm text-foreground" data-demo="variants">
          <div class="flex justify-between gap-6"><span class="text-muted">date</span><RelativeTime :value="moment" variant="date" /></div>
          <div class="flex justify-between gap-6"><span class="text-muted">time</span><RelativeTime :value="moment" variant="time" /></div>
          <div class="flex justify-between gap-6"><span class="text-muted">datetime</span><RelativeTime :value="moment" variant="datetime" /></div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
