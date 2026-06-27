<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Badge from '@ui/Badge/Badge.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Badge</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A small uppercase status label — filled or outline, with an optional contrast dot.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Filled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Filled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Filled badges use the variant color as the badge background.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Badge v-for="variant in variants" :key="variant" :variant="variant">{{ variant }}</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Outline -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Outline</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Outline badges keep the surface clear while preserving the variant tone.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Badge v-for="variant in variants" :key="variant" :variant="variant" outline>{{ variant }}</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Size changes the label height, padding, and text scale.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Radius -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Radius</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>sm / md / lg, or full (pill), matching Button.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Badge radius="sm">Small</Badge>
          <Badge radius="md">Medium</Badge>
          <Badge radius="lg">Large</Badge>
          <Badge radius="full">Full</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- With dot -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>With dot</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The dot color is chosen to contrast with the badge background.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Badge variant="success" dot>Active</Badge>
          <Badge variant="warning" dot>Pending</Badge>
          <Badge variant="destructive" dot>Failed</Badge>
          <Badge variant="success" outline dot>Active</Badge>
          <Badge variant="secondary" outline dot>Draft</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
