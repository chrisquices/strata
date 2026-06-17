<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';

import Pagination from '@ui/Pagination/Pagination.vue';
import PaginationContent from '@ui/Pagination/PaginationContent.vue';
import PaginationRange from '@ui/Pagination/PaginationRange.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const page = ref(1);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Pagination</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      Page navigation built on reka — previous/next, numbered pages with ellipses, and a results range.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Current page: {{ page }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-3" data-demo="default">
          <Pagination v-slot="{ range }" v-model:page="page" :count="195" :per-page="10">
            <PaginationContent />
            <PaginationRange :range="range" />
          </Pagination>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
