<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';

import Checkbox from '@ui/Checkbox/Checkbox.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const checked = ref(true);
const unchecked = ref(false);
const indeterminate = ref('indeterminate');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Checkbox</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A two- or three-state checkbox built on reka — checked, unchecked, and indeterminate, with a hidden form input.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- States -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>States</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Checked: {{ checked }} · Unchecked: {{ unchecked }} · Indeterminate: {{ indeterminate }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6">
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-model:checked="checked" />
            Checked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-model:checked="unchecked" />
            Unchecked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-model:checked="indeterminate" />
            Indeterminate
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Small, medium, and large scale the box and the check glyph using the indicator token scale.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6">
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox size="sm" :default-checked="true" />
            Small
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox size="md" :default-checked="true" />
            Medium
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox size="lg" :default-checked="true" />
            Large
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Disabled checkboxes keep their state visible but cannot be changed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6">
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <Checkbox disabled :default-checked="true" />
            Disabled checked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <Checkbox disabled />
            Disabled unchecked
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
