<script setup lang="ts"></script>

<!-- Outer <kbd> group; nest one or more KbdItem keys inside (standard markup for key combos). -->
<template>
  <kbd class="inline-flex items-center gap-1">
    <slot />
  </kbd>
</template>
