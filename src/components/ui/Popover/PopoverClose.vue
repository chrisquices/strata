<script setup lang="ts">
import {PopoverClose} from 'reka-ui';

const props = defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <PopoverClose :as-child="props.asChild">
    <slot/>
  </PopoverClose>
</template>
