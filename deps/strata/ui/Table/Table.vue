<script setup lang="ts">
// Presentational table primitives (UI only, no sorting or selection behavior included). Compose:
// Table > TableHeader/TableBody/TableFooter > TableRow > TableHead/TableCell, with optional TableCaption.
// The root scrolls horizontally on overflow.
</script>

<template>
  <div class="relative w-full overflow-x-auto">
    <table class="w-full caption-bottom border-collapse text-sm text-foreground">
      <slot />
    </table>
  </div>
</template>
