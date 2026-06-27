<script setup lang="ts">
import { AlertDialogAction } from 'reka-ui';
import Button from '../Button/Button.vue';

defineOptions({inheritAttrs: false});
defineProps({
  variant: { type: String, default: 'primary' },
  outline: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
});
</script>

<template>
  <AlertDialogAction as-child>
    <Button v-bind="$attrs" :variant="variant" :outline="outline" :size="size" class="flex-1"><slot /></Button>
  </AlertDialogAction>
</template>
