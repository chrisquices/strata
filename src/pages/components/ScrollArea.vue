<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import ScrollArea from '@ui/ScrollArea/ScrollArea.vue';
import ScrollAreaViewport from '@ui/ScrollArea/ScrollAreaViewport.vue';
import ScrollAreaScrollbar from '@ui/ScrollArea/ScrollAreaScrollbar.vue';
import ScrollAreaThumb from '@ui/ScrollArea/ScrollAreaThumb.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const rows = Array.from({ length: 25 }, (_, i) => `Item ${i + 1}`);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Scroll Area</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A custom scrollbar over native scrolling, built on reka — the bar appears on hover by default.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Hover the panel to reveal the scrollbar.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="scroll">
          <ScrollArea class="h-48 w-64 rounded-large border border-border bg-surface">
            <ScrollAreaViewport>
              <div class="p-3">
                <p v-for="r in rows" :key="r" class="py-1 text-sm text-muted">{{ r }}</p>
              </div>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar orientation="vertical">
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
          </ScrollArea>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
