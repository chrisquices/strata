<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Skeleton from '@ui/Skeleton/Skeleton.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Skeleton</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A pulsing placeholder for content that's loading. Size it with utility classes; pulse respects reduced-motion.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Shapes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Shapes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Text lines and a block, each sized with width, height, and radius utilities.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-4 w-full" />
          <Skeleton class="h-4 w-1/2" />
          <Skeleton rounded="large" class="h-24 w-full" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- List row -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>List row</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A loading list row — a circular avatar beside two text lines.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm items-center gap-3" aria-busy="true">
          <Skeleton rounded="full" class="size-10 shrink-0" />
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton class="h-3.5 w-1/3" />
            <Skeleton class="h-3 w-2/3" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
