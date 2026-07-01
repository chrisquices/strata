<script setup lang="ts">
import { provide, reactive, computed } from 'vue';
import { PaginationRoot } from 'reka-ui';

const props = defineProps({
  count: { type: Number, default: 0 },
  perPage: { type: Number, default: 10 },
  siblingCount: { type: Number, default: 1 },
});
const page = defineModel<number>('page', { default: 1 });

const range = computed(function () {
  return {
    start: props.count === 0 ? 0 : (page.value - 1) * props.perPage + 1,
    end: Math.min(page.value * props.perPage, props.count),
  };
});

provide('paginationMeta', reactive({
  count: computed(function () {
    return props.count;
  }),
  range,
}));
</script>

<template>
  <PaginationRoot v-model:page="page" :total="props.count" :items-per-page="props.perPage" :sibling-count="props.siblingCount" show-edges class="space-y-stack-small">
    <slot :range="range" />
  </PaginationRoot>
</template>
