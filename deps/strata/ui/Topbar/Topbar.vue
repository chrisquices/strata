<script setup lang="ts">
// Application header bar; sticky by default. Compose with TopbarStart / TopbarTitle / TopbarEnd.
import { computed } from 'vue';
const props = defineProps({ sticky: { type: Boolean, default: true } });
const positionClass = computed(() => (props.sticky ? 'sticky top-0 z-sticky' : ''));
</script>

<template>
  <header :class="['h-chrome-bar px-4 md:px-6 flex items-center justify-between gap-3 border-b border-border bg-topbar', positionClass]">
    <slot />
  </header>
</template>
