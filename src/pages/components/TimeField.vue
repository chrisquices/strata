<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import TimeField from '@ui/TimeField/TimeField.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const time = ref('14:30');
const twelve = ref('09:15');
const empty = ref('');
const precise = ref('14:30:15');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Time Field</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A segmented time input built on reka. Each segment is a spinbutton — arrow keys adjust, or type. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO time string ("14:30").</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>24-hour. Value: <strong class="text-foreground">{{ time || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic"><TimeField v-model="time" :hour-cycle="24" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>12-hour (AM/PM) and empty. Values: <strong class="text-foreground">{{ twelve || 'none' }}</strong> · <strong class="text-foreground">{{ empty || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4" data-demo="variants">
          <TimeField v-model="twelve" :hour-cycle="12" />
          <TimeField v-model="empty" :hour-cycle="12" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription><code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">granularity</code> — hour only, and down to the second. Values: <strong class="text-foreground">{{ time || 'none' }}</strong> · <strong class="text-foreground">{{ precise || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4" data-demo="granularity">
          <TimeField v-model="time" granularity="hour" :hour-cycle="24" />
          <TimeField v-model="precise" granularity="second" :hour-cycle="24" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Sizes and disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4" data-demo="states">
          <TimeField v-model="time" size="sm" :hour-cycle="24" />
          <TimeField v-model="time" size="lg" :hour-cycle="24" />
          <TimeField v-model="time" disabled :hour-cycle="24" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
