<script setup lang="ts">
import {DropdownMenuTrigger} from 'reka-ui';

defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <DropdownMenuTrigger :as-child="asChild">
    <slot/>
  </DropdownMenuTrigger>
</template>
