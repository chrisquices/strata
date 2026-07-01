<script setup lang="ts">
import {inject} from 'vue';
import {CollapsibleTrigger} from 'reka-ui';

const props = defineProps({asChild: {type: Boolean, default: false}});

const contentId = inject('collapsibleContentId', undefined);
</script>

<template>
  <CollapsibleTrigger :as-child="props.asChild" :aria-controls="contentId">
    <slot/>
  </CollapsibleTrigger>
</template>
