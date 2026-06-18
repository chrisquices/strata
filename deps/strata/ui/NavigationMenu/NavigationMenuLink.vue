<script setup lang="ts">
import { NavigationMenuLink } from 'reka-ui';

defineProps({
  href: { type: String, default: undefined },
  active: { type: Boolean, default: false },
  asChild: { type: Boolean, default: false },
});
</script>

<template>
  <NavigationMenuLink
    :href="href"
    :active="active"
    :as-child="asChild"
    class="block rounded-medium px-3 py-2 text-sm transition-colors duration-100 text-muted hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30 data-[active]:bg-border data-[active]:text-foreground"
  >
    <slot />
  </NavigationMenuLink>
</template>
