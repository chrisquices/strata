<script setup lang="ts">
// <tfoot> for a Table — for totals/summary rows.
</script>

<template>
  <tfoot class="border-t border-border bg-surface/60 font-medium [&>tr:last-child]:border-b-0">
    <slot />
  </tfoot>
</template>
