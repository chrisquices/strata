<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Separator from '@ui/Separator/Separator.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Separator</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A thin divider line, horizontal or vertical, built on reka's Separator.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Horizontal</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="max-w-sm text-sm text-muted" data-demo="horizontal">
          <p>Section one.</p>
          <Separator class="my-3" />
          <p>Section two.</p>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Vertical</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex h-6 items-center gap-3 text-sm text-muted" data-demo="vertical">
          <span>Home</span>
          <Separator orientation="vertical" />
          <span>Docs</span>
          <Separator orientation="vertical" />
          <span>About</span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
