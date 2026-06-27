<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import { ref } from 'vue';
import DatePicker from '@ui/DatePicker/DatePicker.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const date = ref('2026-06-14');
const bounded = ref('');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Date Picker</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A segmented date field with a popover calendar. Type into the segments or pick a day. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Pick a date. Selected: <strong class="text-foreground">{{ date || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <DatePicker v-model="date" class="w-60" />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Bounded -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Bounded</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Bounded to June 2026. Selected: <strong class="text-foreground">{{ bounded || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <DatePicker
            v-model="bounded"
            min-value="2026-06-01"
            max-value="2026-06-30"
            class="w-60"
        />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <DatePicker v-model="date" disabled class="w-60" />
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
