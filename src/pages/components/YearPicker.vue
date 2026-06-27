<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import YearPicker from '@ui/YearPicker/YearPicker.vue';
import YearRangePicker from '@ui/YearRangePicker/YearRangePicker.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const year = ref('2026-01-01');
const empty = ref('');
const clickable = ref('2032-01-01');
const range = ref({start: '2024-01-01', end: '2028-01-01'});
const bounded = ref('2026-01-01');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Year Picker</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Input-like year pickers built on reka, with a popover grid and optional whole-field trigger. <code
        class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is an ISO date string.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Pre-filled. Selected: <strong class="text-foreground">{{ year || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="year"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Empty -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Empty</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Shows the placeholder until a year is chosen. Selected: <strong class="text-foreground">{{
          empty || 'none'
        }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="empty"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Clickable -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Clickable</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Whole field opens the picker. Selected: <strong class="text-foreground">{{ clickable || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="clickable" clickable/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Range -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Range</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A start and end year via YearRangePicker. Selected: <strong class="text-foreground">{{ range.start || '…' }} →
        {{ range.end || '…' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <YearRangePicker v-model="range"/>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Small, medium (default), and large.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-72 flex-col gap-3">
          <YearPicker v-model="year" size="sm"/>
          <YearPicker v-model="year" size="md"/>
          <YearPicker v-model="year" size="lg"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Invalid -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Invalid</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">invalid</code> prop applies the error
        border and sets aria-invalid.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="year" invalid/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Min and max -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Min and max</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Years outside <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">min-value</code>–<code
          class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">max-value</code> are disabled in the grid.
        Selected: <strong class="text-foreground">{{ bounded || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="bounded" min-value="2020-01-01" max-value="2030-01-01"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A disabled field that can't be opened.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <YearPicker v-model="year" disabled/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
