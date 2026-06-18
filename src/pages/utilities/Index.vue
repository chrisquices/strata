<script setup lang="ts">
import { Wrench } from '@lucide/vue';
import ComponentLayout from '@app/component/ComponentLayout.vue';
import Empty from '@ui/Empty/Empty.vue';
import EmptyDescription from '@ui/Empty/EmptyDescription.vue';
import EmptyIcon from '@ui/Empty/EmptyIcon.vue';
import EmptyTitle from '@ui/Empty/EmptyTitle.vue';
</script>

<template>
  <ComponentLayout>
    <Empty class="m-auto">
      <EmptyIcon><Wrench class="size-icon-extra-large" /></EmptyIcon>
      <EmptyTitle>Select a utility</EmptyTitle>
      <EmptyDescription>Choose one from the sidebar to explore its live demo and API.</EmptyDescription>
    </Empty>
  </ComponentLayout>
</template>
