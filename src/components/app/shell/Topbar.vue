<script setup lang="ts">
// Full-width top app bar — its own line at the very top of the app, above the sidebars and content.
// Just the centered brand; section navigation lives in the left sidebar's switcher.
import BrandMark from '../../ui/BrandMark/BrandMark.vue';
import Caption from '../../ui/Caption/Caption.vue';
</script>

<template>
  <header class="strata-chrome shrink-0 border-b border-border bg-topbar/90 backdrop-blur">
    <div class="flex h-chrome-bar items-center justify-center px-6">
      <RouterLink to="/" class="flex items-center gap-3 rounded-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30">
        <BrandMark src="/assets/img/logo.png" alt="Strata logo" />
        <Caption tone="foreground">Strata</Caption>
        <BrandMark src="/assets/img/logo.png" alt="Strata logo" />
      </RouterLink>
    </div>
  </header>
</template>
