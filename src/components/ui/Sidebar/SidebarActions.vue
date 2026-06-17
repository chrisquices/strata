<script setup lang="ts">
import { Plus, Filter } from '@lucide/vue';
import Button from '../Button/Button.vue';
import SidebarHeader from './SidebarHeader.vue';
</script>

<template>
  <SidebarHeader>
    <slot>
      <div class="flex items-center gap-1 min-w-0">
        <Button variant="secondary" icon aria-label="New">
          <Plus class="size-icon-medium" />
        </Button>
        <Button variant="ghost" icon aria-label="Filter">
          <Filter class="size-icon-medium" />
        </Button>
      </div>
    </slot>
  </SidebarHeader>
</template>
