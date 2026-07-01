<script setup lang="ts">
import {PopoverAnchor} from 'reka-ui';

const props = defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <PopoverAnchor :as-child="props.asChild">
    <slot/>
  </PopoverAnchor>
</template>
