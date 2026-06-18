<script setup lang="ts">
import { AlertDialogAction } from 'reka-ui';
import Button from '../Button/Button.vue';
defineProps({
  variant: { type: String, default: 'primary' },
  outline: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
});
</script>

<template>
  <AlertDialogAction as-child>
    <Button :variant="variant" :outline="outline" :size="size" class="flex-1"><slot /></Button>
  </AlertDialogAction>
</template>
