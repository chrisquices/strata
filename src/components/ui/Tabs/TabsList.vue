<script setup lang="ts">
import {TabsList} from 'reka-ui';
import TabsIndicator from './TabsIndicator.vue';
</script>

<template>
  <TabsList
      class="group/tabs relative flex border-border data-[orientation=horizontal]:border-b data-[orientation=vertical]:shrink-0 data-[orientation=vertical]:flex-col data-[orientation=vertical]:border-r">
    <slot/>
    <TabsIndicator/>
  </TabsList>
</template>
