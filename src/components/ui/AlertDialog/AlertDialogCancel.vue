<script setup lang="ts">
import { AlertDialogCancel } from 'reka-ui';
import Button from '../Button/Button.vue';
defineProps({
  variant: { type: String, default: 'secondary' },
  outline: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
});
</script>

<template>
  <AlertDialogCancel as-child>
    <Button :variant="variant" :outline="outline" :size="size" class="flex-1"><slot /></Button>
  </AlertDialogCancel>
</template>
