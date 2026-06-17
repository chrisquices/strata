<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Combobox from '@ui/Combobox/Combobox.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const countries = [
  { label: 'Americas', options: [
    { value: 'ar', label: 'Argentina' },
    { value: 'br', label: 'Brazil' },
    { value: 'ca', label: 'Canada' },
    { value: 'us', label: 'United States' },
  ] },
  { label: 'Asia', options: [
    { value: 'jp', label: 'Japan' },
    { value: 'kr', label: 'South Korea' },
  ] },
];

const country = ref();
const preselected = ref('jp');
const picked = ref(['br', 'jp']);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Combobox</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A searchable single-choice picker — data-driven like a native select. Type to filter; the chosen label fills the input.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Type to filter; selecting shows the label, not the value. Selected: {{ country ?? '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-56" data-demo="basic">
          <Combobox v-model="country" :options="countries" placeholder="Search countries…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Pre-selected — the label shows on load, not the raw value. Selected: {{ preselected }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-56" data-demo="preselected">
          <Combobox v-model="preselected" :options="countries" placeholder="Search countries…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Multi-select (<code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">multiple</code>) — selections show as removable chips. Selected: {{ picked.join(', ') || '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-56" data-demo="multiple">
          <Combobox v-model="picked" :options="countries" multiple placeholder="Add countries…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
