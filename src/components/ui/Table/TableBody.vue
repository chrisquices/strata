<script setup lang="ts">
// <tbody> for a Table. The last row drops its border for a clean edge.
</script>

<template>
  <tbody class="[&_tr:last-child]:border-0">
    <slot />
  </tbody>
</template>
