<script setup lang="ts">
// App shell. The full-width Topbar sits on its own line at the very top — above the sidebar and
// content. Below it, a centered max-w-7xl box holds the row: NavSidebar (route-aware) | routed
// content. Fixed viewport height; each pane
// scrolls internally.
import { RouterView } from 'vue-router';
import Topbar from './shell/Topbar.vue';
import NavSidebar from './shell/NavSidebar.vue';
</script>

<template>
  <div class="strata-shell flex h-screen flex-col overflow-hidden bg-background text-foreground">
    <Topbar />
    <div class="relative mx-auto flex min-h-0 w-full max-w-7xl flex-1">
      <NavSidebar />
      <div class="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <RouterView />
      </div>
    </div>
  </div>
</template>
