<script setup lang="ts">
// <th> header cell for a Table.
</script>

<template>
  <th scope="col" class="h-10 px-3 text-left align-middle text-xs font-medium text-muted [&:has([role=checkbox])]:pr-0">
    <slot />
  </th>
</template>
