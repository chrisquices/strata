<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import { ref } from 'vue';
import Combobox from '@ui/Combobox/Combobox.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const countries = [
  {
    label: 'Americas',
    options: [
      { value: 'ar', label: 'Argentina' },
      { value: 'br', label: 'Brazil' },
      { value: 'ca', label: 'Canada' },
      { value: 'us', label: 'United States' },
    ]
  },
  {
    label: 'Asia',
    options: [
      { value: 'jp', label: 'Japan' },
      { value: 'kr', label: 'South Korea' },
    ]
  },
];

const country = ref();
const preselected = ref('jp');
const picked = ref(['br', 'jp']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Combobox</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A searchable single-choice picker — data-driven like a native select. Type to filter; the chosen label fills the input.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Type to filter; selecting shows the label, not the value. Selected: {{ country ?? '—' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Combobox
            v-model="country"
            :options="countries"
            aria-label="Country"
            class="w-72"
        />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Pre-selected -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Pre-selected</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The label shows on load, not the raw value. Selected: {{ preselected }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Combobox
            v-model="preselected"
            :options="countries"
            aria-label="Country"
            class="w-72"
        />
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Multiple -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Multiple</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Multi-select (<code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">multiple</code>) — selections show as removable chips. Selected: {{ picked.join(', ') || '—' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Combobox
            v-model="picked"
            :options="countries"
            multiple
            aria-label="Countries"
            class="w-72"
        />
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
