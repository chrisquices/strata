<script setup lang="ts"></script>

<!-- Groups multiple Kbd keys into one chord; renders the outer <kbd> (standard markup for key combos). -->
<template>
  <kbd class="inline-flex items-center gap-1">
    <slot />
  </kbd>
</template>
