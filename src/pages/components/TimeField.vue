<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import TimeField from '@ui/TimeField/TimeField.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const time = ref('14:30');
const twelve = ref('09:15');
const empty = ref('');
const precise = ref('14:30:15');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Time Field</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A segmented time input built on reka. Each segment is a spinbutton — arrow keys adjust, or type. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO time string ("14:30").
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        24-hour. Value: <strong class="text-foreground">{{ time || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <TimeField v-model="time" :hour-cycle="24" />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Hour cycle -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Hour cycle</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        12-hour (AM/PM) and empty. Values: <strong class="text-foreground">{{ twelve || 'none' }}</strong> · <strong class="text-foreground">{{ empty || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <TimeField v-model="twelve" :hour-cycle="12" />
          <TimeField v-model="empty" :hour-cycle="12" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Granularity -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Granularity</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">granularity</code> — hour only, and down to the second. Values: <strong class="text-foreground">{{ time || 'none' }}</strong> · <strong class="text-foreground">{{ precise || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <TimeField v-model="time" granularity="hour" :hour-cycle="24" />
          <TimeField v-model="precise" granularity="second" :hour-cycle="24" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes and disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes and disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Small and large sizes (medium is the default), plus a disabled field.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <TimeField v-model="time" size="sm" :hour-cycle="24" />
          <TimeField v-model="time" size="lg" :hour-cycle="24" />
          <TimeField v-model="time" disabled :hour-cycle="24" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Invalid -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Invalid</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">invalid</code> prop applies the error border and sets aria-invalid.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <TimeField v-model="time" invalid :hour-cycle="24" />
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
