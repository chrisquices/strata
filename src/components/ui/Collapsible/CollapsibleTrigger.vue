<script setup lang="ts">
import {inject} from 'vue';
import {CollapsibleTrigger} from 'reka-ui';

defineProps({asChild: {type: Boolean, default: false}});
const contentId = inject('collapsibleContentId', undefined);
</script>

<template>
  <CollapsibleTrigger :as-child="asChild" :aria-controls="contentId">
    <slot/>
  </CollapsibleTrigger>
</template>
