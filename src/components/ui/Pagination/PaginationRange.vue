<script setup lang="ts">
import {inject} from 'vue';

const meta = inject('paginationMeta', {count: 0, range: {start: 0, end: 0}});
</script>

<template>
  <p class="text-xs text-muted">
    Showing {{ meta?.range?.start ?? 0 }} – {{ meta?.range?.end ?? 0 }} of {{ meta?.count ?? 0 }}
  </p>
</template>
