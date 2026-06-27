<script setup lang="ts">
import {PopoverAnchor} from 'reka-ui';

defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <PopoverAnchor :as-child="asChild">
    <slot/>
  </PopoverAnchor>
</template>
