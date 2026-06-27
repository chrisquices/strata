<script setup lang="ts">
import {AlertDialogTitle} from 'reka-ui';

defineProps({as: {default: 'h2'}});
</script>

<template>
  <AlertDialogTitle :as="as" class="text-lg font-semibold tracking-tight text-foreground">
    <slot/>
  </AlertDialogTitle>
</template>
