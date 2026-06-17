<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Skeleton from '@ui/Skeleton/Skeleton.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Skeleton</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A pulsing placeholder for content that's loading. Size it with utility classes; pulse respects reduced-motion.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Text lines and shapes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="shapes">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-1/2" />
          <Skeleton rounded="large" class="h-24 w-full" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>A loading list row — avatar + two lines.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm items-center gap-3" data-demo="row" aria-busy="true">
          <Skeleton rounded="full" class="size-10 shrink-0" />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton class="h-3.5 w-1/3" />
            <Skeleton class="h-3 w-2/3" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
