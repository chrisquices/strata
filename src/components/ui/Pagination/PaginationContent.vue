<script setup lang="ts">
import { PaginationList } from 'reka-ui';
import Ellipsis from './PaginationEllipsis.vue';
import Item from './PaginationItem.vue';
import NextButton from './PaginationNextButton.vue';
import Page from './PaginationPage.vue';
import PreviousButton from './PaginationPreviousButton.vue';
</script>

<template>
  <PaginationList v-slot="{ items }" class="flex flex-row items-center gap-1" as="ul">
    <Item><PreviousButton /></Item>
    <Item v-for="(item, index) in items" :key="item.type + (item.value ?? index)">
      <Ellipsis v-if="item.type === 'ellipsis'" />
      <Page v-else :page="item" />
    </Item>
    <Item><NextButton /></Item>
  </PaginationList>
</template>
