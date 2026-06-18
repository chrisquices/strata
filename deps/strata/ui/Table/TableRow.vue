<script setup lang="ts">
// <tr> for a Table. Built-in hover highlight; pass `selected` for the selected-row UI (sets the
// styling + aria-selected). Selection logic is the consumer's — this is presentation only.
defineProps({ selected: { type: Boolean, default: false } });
</script>

<template>
  <tr
    :data-state="selected ? 'selected' : undefined"
    :aria-selected="selected || undefined"
    class="border-b border-border transition-colors hover:bg-border/40 data-[state=selected]:bg-border/60"
  >
    <slot />
  </tr>
</template>
