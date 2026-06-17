<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Caption from '@ui/Caption/Caption.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const tones = ['faint', 'muted', 'foreground', 'inherit'];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Caption</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A small uppercase label — tone-colored, rendered as whichever element fits the context.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Tones</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>faint (default), muted, foreground, and inherit (takes the parent color).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2" data-demo="tones">
          <Caption v-for="t in tones" :key="t" :tone="t">{{ t }} caption</Caption>
          <div class="text-success">
            <Caption tone="inherit">inherit inside green text</Caption>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Element</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The `as` prop sets the rendered tag — span (default), p, div, label, or a heading.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2" data-demo="as">
          <Caption tone="muted">span (default)</Caption>
          <Caption as="p" tone="muted">paragraph</Caption>
          <Caption as="div" tone="muted">div element</Caption>
          <Caption as="h3" tone="foreground">heading 3</Caption>
          <Caption as="label" tone="muted">label element</Caption>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
