<script setup lang="ts">
import { inject } from 'vue';
defineProps({ range: { default: () => ({ start: 0, end: 0 }) } });
const meta = inject('paginationMeta', { count: 0 });
</script>

<template>
  <p class="text-xs text-muted">
    Showing {{ range?.start ?? 0 }}–{{ range?.end ?? 0 }} of {{ meta?.count ?? 0 }}
  </p>
</template>
