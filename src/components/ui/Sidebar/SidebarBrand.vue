<script setup lang="ts">
import { X } from '@lucide/vue';
import BrandMark from '../BrandMark/BrandMark.vue';
import Button from '../Button/Button.vue';
import Caption from '../Caption/Caption.vue';
import SidebarHeader from './SidebarHeader.vue';

defineProps({
  onclose: { type: Function, default: undefined },
});
</script>

<template>
  <SidebarHeader>
    <div class="flex items-center gap-3 min-w-0">
      <BrandMark src="/assets/img/logo.png" alt="Strata logo" />
      <Caption tone="foreground" class="group-data-[collapsed]/sidebar:hidden">Strata</Caption>
    </div>
    <Button icon variant="muted" size="sm" aria-label="Close navigation" class="xl:hidden group-data-[collapsed]/sidebar:hidden" @click="onclose && onclose()">
      <X class="size-icon-medium" />
    </Button>
  </SidebarHeader>
</template>
