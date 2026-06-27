<script setup lang="ts">
import {PopoverClose} from 'reka-ui';

defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <PopoverClose :as-child="asChild">
    <slot/>
  </PopoverClose>
</template>
