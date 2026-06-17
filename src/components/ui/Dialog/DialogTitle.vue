<script setup lang="ts">
import {DialogTitle} from 'reka-ui';

defineProps({as: {default: 'h2'}});
</script>

<template>
  <DialogTitle :as="as" class="text-lg font-semibold leading-none tracking-tight text-foreground">
    <slot/>
  </DialogTitle>
</template>
