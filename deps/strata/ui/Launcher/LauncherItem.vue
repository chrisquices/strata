<script setup lang="ts">
defineProps({
  icon: { default: undefined },
  label: { type: String, default: '' },
  description: { type: String, default: '' },
});
</script>

<template>
  <button
    type="button"
    class="group flex flex-col items-center gap-3 rounded-large border border-transparent p-5 text-center transition-all duration-200 ease-out hover:-translate-y-1 hover:border-border hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
  >
    <span aria-hidden="true" class="grid size-20 place-items-center rounded-large border border-border bg-surface text-foreground shadow-raised transition-shadow duration-200 group-hover:shadow-overlay">
      <component :is="icon" v-if="icon" class="size-icon-extra-large" />
    </span>
    <span class="flex flex-col gap-0.5">
      <span class="text-sm font-medium text-foreground">{{ label }}</span>
      <span v-if="description" class="text-xs text-muted">{{ description }}</span>
    </span>
  </button>
</template>
