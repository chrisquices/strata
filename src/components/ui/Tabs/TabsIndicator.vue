<script setup lang="ts">
// The sliding active-tab bar. reka measures the active trigger and exposes its size and offset
// as CSS vars (--reka-tabs-indicator-size / -position); we size and translate the bar from those,
// switching axis by the TabsList orientation. Auto-rendered by TabsList.
import {TabsIndicator} from 'reka-ui';
</script>

<template>
  <TabsIndicator
      class="pointer-events-none absolute bg-foreground transition-all duration-150 ease-out motion-reduce:transition-none group-data-[orientation=horizontal]/tabs:bottom-0 group-data-[orientation=horizontal]/tabs:left-0 group-data-[orientation=horizontal]/tabs:h-[var(--border-width-medium)] group-data-[orientation=horizontal]/tabs:w-[var(--reka-tabs-indicator-size)] group-data-[orientation=horizontal]/tabs:translate-x-[var(--reka-tabs-indicator-position)] group-data-[orientation=vertical]/tabs:right-0 group-data-[orientation=vertical]/tabs:top-0 group-data-[orientation=vertical]/tabs:w-[var(--border-width-medium)] group-data-[orientation=vertical]/tabs:h-[var(--reka-tabs-indicator-size)] group-data-[orientation=vertical]/tabs:translate-y-[var(--reka-tabs-indicator-position)]"/>
</template>
