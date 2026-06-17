<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Chip from '@ui/Chip/Chip.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'muted', 'destructive', 'success', 'warning'];
const tags = ref(['design', 'vue', 'frontend', 'kit']);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Chip</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A compact tag — tone variants, filled or outline, with an optional remove button.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Filled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="filled">
          <Chip v-for="v in variants" :key="v" :variant="v">{{ v }}</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Outline</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="outline">
          <Chip v-for="v in variants" :key="v" :variant="v" outline>{{ v }}</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="sizes">
          <Chip variant="secondary" size="sm">Small</Chip>
          <Chip variant="secondary" size="md">Medium</Chip>
          <Chip variant="secondary" size="lg">Large</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Radius</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>sm / md / lg, or full (pill), matching Button and Badge.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="radius">
          <Chip variant="secondary" radius="sm">Small</Chip>
          <Chip variant="secondary" radius="md">Medium</Chip>
          <Chip variant="secondary" radius="lg">Large</Chip>
          <Chip variant="secondary" radius="full">Full</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Dismissible</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The remove button emits a dismiss event. Remaining: {{ tags.join(', ') || 'none' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="dismissible">
          <Chip
            v-for="(t, i) in tags"
            :key="t"
            variant="secondary"
            dismissible
            @dismiss="tags.splice(i, 1)"
          >{{ t }}</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2" data-demo="disabled">
          <Chip variant="secondary" disabled>disabled</Chip>
          <Chip variant="secondary" disabled dismissible>disabled</Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
