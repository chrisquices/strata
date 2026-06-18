<script setup lang="ts">
import { provide, reactive, computed } from 'vue';
import { PaginationRoot } from 'reka-ui';

const props = defineProps({
  count: { type: Number, default: 0 },
  perPage: { type: Number, default: 10 },
  siblingCount: { type: Number, default: 1 },
});
const page = defineModel<number>('page', { default: 1 });

const range = computed(() => ({
  start: props.count === 0 ? 0 : (page.value - 1) * props.perPage + 1,
  end: Math.min(page.value * props.perPage, props.count),
}));

provide('paginationMeta', reactive({ count: computed(() => props.count) }));
</script>

<template>
  <PaginationRoot v-model:page="page" :total="count" :items-per-page="perPage" :sibling-count="siblingCount" show-edges>
    <slot :range="range" />
  </PaginationRoot>
</template>
