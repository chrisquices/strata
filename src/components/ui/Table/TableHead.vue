<script setup lang="ts">
// <th> header cell for a Table.
</script>

<template>
  <th scope="col"
      class="h-control-large px-control-x text-left align-middle uppercase text-xs font-medium text-faint [&:has([role=checkbox])]:pr-0">
    <slot/>
  </th>
</template>
