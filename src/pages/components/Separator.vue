<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Separator from '@ui/Separator/Separator.vue';

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
    <ComponentHeaderTitle>Separator</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A thin divider line, horizontal or vertical, built on reka's Separator.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Horizontal -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Horizontal</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A full-width horizontal rule between stacked blocks of content.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm text-sm text-muted">
          <p>Section one.</p>
          <Separator class="my-3"/>
          <p>Section two.</p>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Vertical -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Vertical</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A full-height vertical rule between inline items; the parent provides the
        height.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex h-6 items-center gap-3 text-sm text-muted">
          <span>Home</span>
          <Separator orientation="vertical"/>
          <span>Docs</span>
          <Separator orientation="vertical"/>
          <span>About</span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
