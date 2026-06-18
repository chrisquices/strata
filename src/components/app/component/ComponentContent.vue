<script setup lang="ts"></script>

<template>
  <!-- Fills the content box height (min-h-full) as a column, so short content (e.g. an Empty state
       with m-auto) can center vertically while long content flows from the top and scrolls. -->
  <div class="mx-auto flex min-h-full w-full flex-col px-6 py-10 md:px-10 md:py-14">
    <slot />
  </div>
</template>
