<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import { Bold, Italic, Underline } from '@lucide/vue';
import Toggle from '@ui/Toggle/Toggle.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const primaryVariant = ref(false);
const secondaryVariant = ref(true);
const ghostVariant = ref(false);
const outlineVariant = ref(true);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Toggle</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A two-state button that stays pressed when on.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Variants -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Primary: {{ primaryVariant }} · Secondary: {{ secondaryVariant }} · Ghost: {{ ghostVariant }} · Outline: {{ outlineVariant }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Toggle v-model:pressed="primaryVariant">
            <Bold class="size-icon-small" />
            Primary
          </Toggle>
          <Toggle v-model:pressed="secondaryVariant" variant="secondary">
            <Italic class="size-icon-small" />
            Secondary
          </Toggle>
          <Toggle v-model:pressed="ghostVariant" variant="ghost">
            <Underline class="size-icon-small" />
            Ghost
          </Toggle>
          <Toggle v-model:pressed="outlineVariant" outline>
            <Underline class="size-icon-small" />
            Outline
          </Toggle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Toggle size adjusts height, spacing, and text scale while keeping the same pressed behavior.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-2">
          <Toggle size="sm" icon aria-label="Bold">
            <Bold class="size-icon-extra-small" />
          </Toggle>
          <Toggle size="sm" variant="secondary">
            Draft
          </Toggle>
          <Toggle size="lg" variant="secondary" aria-label="Underline">
            <Underline class="size-icon-medium" />
            Underline
          </Toggle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled toggles keep their pressed state visible while blocking pointer and keyboard changes.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-2">
          <Toggle pressed disabled icon aria-label="Bold">
            <Bold class="size-icon-small" />
          </Toggle>
          <Toggle disabled variant="secondary">
            Draft
          </Toggle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
