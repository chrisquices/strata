<script setup lang="ts">
// Components landing — the /components entry point. Renders the section chrome (sidebar with no
// item selected, since the route matches no component) and an empty state in the content.
import { MousePointerClick } from '@lucide/vue';
import ComponentContent from '@app/component/ComponentContent.vue';
import Empty from '@ui/Empty/Empty.vue';
import EmptyIcon from '@ui/Empty/EmptyIcon.vue';
import EmptyTitle from '@ui/Empty/EmptyTitle.vue';
import EmptyDescription from '@ui/Empty/EmptyDescription.vue';
</script>

<template>
  <ComponentContent>
    <Empty class="m-auto">
      <EmptyIcon><MousePointerClick class="size-icon-extra-large" /></EmptyIcon>
      <EmptyTitle>Select a component</EmptyTitle>
      <EmptyDescription>Choose one from the sidebar to explore its live examples and variants.</EmptyDescription>
    </Empty>
  </ComponentContent>
</template>
