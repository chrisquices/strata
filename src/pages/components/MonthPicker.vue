<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import MonthPicker from '@ui/MonthPicker/MonthPicker.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const month = ref('2026-06-01');
const empty = ref('');
const clickable = ref('2026-10-01');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Month Picker</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Input-like month pickers built on reka, with a popover grid and optional whole-field trigger. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Pre-filled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Pre-filled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Pre-filled. Selected: <strong class="text-foreground">{{ month || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="month" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Empty -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Empty</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Empty. Selected: <strong class="text-foreground">{{ empty || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="empty" /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Clickable -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Clickable</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Whole field opens the picker. Selected: <strong class="text-foreground">{{ clickable || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="clickable" clickable /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Size -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Size</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Three sizes: sm, md (default), and lg.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-72 flex-col gap-2">
          <MonthPicker v-model="month" size="sm" />
          <MonthPicker v-model="month" />
          <MonthPicker v-model="month" size="lg" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Invalid -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Invalid</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Destructive border and focus ring when invalid.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="empty" invalid /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Readonly -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Readonly</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The picker opens but does not accept changes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="month" readonly /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72"><MonthPicker v-model="month" disabled /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
