<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import StatusDot from '@ui/StatusDot/StatusDot.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const states = [
  { variant: 'success', text: 'Online' },
  { variant: 'warning', text: 'Degraded' },
  { variant: 'destructive', text: 'Offline' },
  { variant: 'muted', text: 'Idle' },
  { variant: 'primary', text: 'Unknown' },
];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Status Dot</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A small status indicator dot with tone variants and an optional pulse.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-5 text-sm text-foreground" data-demo="variants">
          <span v-for="s in states" :key="s.variant" class="inline-flex items-center gap-2">
            <StatusDot :variant="s.variant" /> {{ s.text }}
          </span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Pulse</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A pulsing ring draws attention to a live status.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-5 text-sm text-foreground" data-demo="pulse">
          <span class="inline-flex items-center gap-2"><StatusDot variant="success" pulse label="Live" /> Live</span>
          <span class="inline-flex items-center gap-2"><StatusDot variant="destructive" pulse /> Recording</span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
