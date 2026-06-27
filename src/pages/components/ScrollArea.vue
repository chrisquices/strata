<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import ScrollArea from '@ui/ScrollArea/ScrollArea.vue';
import ScrollAreaViewport from '@ui/ScrollArea/ScrollAreaViewport.vue';
import ScrollAreaScrollbar from '@ui/ScrollArea/ScrollAreaScrollbar.vue';
import ScrollAreaThumb from '@ui/ScrollArea/ScrollAreaThumb.vue';
import ScrollAreaCorner from '@ui/ScrollArea/ScrollAreaCorner.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const rows = Array.from({length: 25}, function (value, index) {
  return `Item ${index + 1}`;
});
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Scroll Area</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A custom scrollbar over native scrolling, built on reka — the bar appears on hover
      by default.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Hover the panel to reveal the scrollbar.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ScrollArea class="h-48 w-64 rounded-large border border-border bg-surface">
          <ScrollAreaViewport>
            <div class="p-3">
              <p v-for="row in rows" :key="row" class="py-1 text-sm text-muted">{{ row }}</p>
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb/>
          </ScrollAreaScrollbar>
        </ScrollArea>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Always visible -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Always visible</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With type set to always, the scrollbar stays visible instead of fading in on
        hover.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ScrollArea type="always" class="h-48 w-64 rounded-large border border-border bg-surface">
          <ScrollAreaViewport>
            <div class="p-3">
              <p v-for="row in rows" :key="row" class="py-1 text-sm text-muted">{{ row }}</p>
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb/>
          </ScrollAreaScrollbar>
        </ScrollArea>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Both axes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Both axes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>When content overflows in both directions, add a scrollbar per orientation and a
        corner where they meet.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ScrollArea type="always" class="h-48 w-64 rounded-large border border-border bg-surface">
          <ScrollAreaViewport>
            <div class="w-max p-3">
              <p v-for="row in rows" :key="row" class="whitespace-nowrap py-1 text-sm text-muted">{{ row }} · status
                active · owner unassigned · updated recently · priority normal</p>
            </div>
          </ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical">
            <ScrollAreaThumb/>
          </ScrollAreaScrollbar>
          <ScrollAreaScrollbar orientation="horizontal">
            <ScrollAreaThumb/>
          </ScrollAreaScrollbar>
          <ScrollAreaCorner/>
        </ScrollArea>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
