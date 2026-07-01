<script setup lang="ts">
import {ContextMenuTrigger} from 'reka-ui';

const props = defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <ContextMenuTrigger :as-child="props.asChild">
    <slot/>
  </ContextMenuTrigger>
</template>
