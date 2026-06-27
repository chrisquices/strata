<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';

import Pagination from '@ui/Pagination/Pagination.vue';
import PaginationContent from '@ui/Pagination/PaginationContent.vue';
import PaginationRange from '@ui/Pagination/PaginationRange.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const page = ref(1);
const siblingPage = ref(5);
const fewPage = ref(1);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Pagination</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Page navigation built on reka — previous/next, numbered pages with ellipses, and a results range.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Numbered pages with ellipsis separators and a results range below — currently on page {{ page }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Pagination v-model:page="page" :count="195" :per-page="10">
          <PaginationContent />
          <PaginationRange />
        </Pagination>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sibling count -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sibling count</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        siblingCount sets how many pages sit on each side of the current one — two here, so more numbers stay visible before the ellipsis collapses the rest.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Pagination v-model:page="siblingPage" :count="195" :per-page="10" :sibling-count="2">
          <PaginationContent />
          <PaginationRange />
        </Pagination>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Without ellipsis -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Without ellipsis</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        When every page fits within the edge and sibling pages, no ellipsis appears — three pages here.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Pagination v-model:page="fewPage" :count="30" :per-page="10">
          <PaginationContent />
          <PaginationRange />
        </Pagination>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
