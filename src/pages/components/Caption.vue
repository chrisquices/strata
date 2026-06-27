<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Caption from '@ui/Caption/Caption.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const tones = ['faint', 'muted', 'foreground', 'inherit'];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Caption</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A small uppercase label — tone-colored, rendered as whichever element fits the context.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Tones -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Tones</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>faint (default), muted, foreground, and inherit (takes the parent color).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2">
          <Caption v-for="tone in tones" :key="tone" :tone="tone">{{ tone }} caption</Caption>
          <div class="text-success">
            <Caption tone="inherit">inherit inside green text</Caption>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Element -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Element</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The `as` prop sets the rendered tag — span (default), p, div, label, or a heading.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2">
          <Caption tone="muted">span (default)</Caption>
          <Caption as="p" tone="muted">paragraph</Caption>
          <Caption as="div" tone="muted">div element</Caption>
          <Caption as="h3" tone="foreground">heading 3</Caption>
          <Caption as="label" tone="muted">label element</Caption>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
