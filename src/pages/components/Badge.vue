<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Badge from '@ui/Badge/Badge.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'muted', 'destructive', 'success', 'warning'];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Badge</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A small uppercase status label — filled or outline, with an optional contrast dot.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Filled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="filled">
          <Badge v-for="v in variants" :key="v" :variant="v">{{ v }}</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Outline</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="outline">
          <Badge v-for="v in variants" :key="v" :variant="v" outline>{{ v }}</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="sizes">
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Radius</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>sm / md / lg, or full (pill), matching Button.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="radius">
          <Badge radius="sm">Small</Badge>
          <Badge radius="md">Medium</Badge>
          <Badge radius="lg">Large</Badge>
          <Badge radius="full">Full</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>With dot</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The dot color is chosen to contrast with the badge background.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="dot">
          <Badge variant="success" dot>Active</Badge>
          <Badge variant="warning" dot>Pending</Badge>
          <Badge variant="destructive" dot>Failed</Badge>
          <Badge variant="success" outline dot>Active</Badge>
          <Badge variant="secondary" outline dot>Draft</Badge>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
