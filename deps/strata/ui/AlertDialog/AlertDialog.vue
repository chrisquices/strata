<script setup lang="ts">
import { AlertDialogRoot } from 'reka-ui';

defineProps({ defaultOpen: { type: Boolean, default: false } });
// undefined → reka runs uncontrolled unless a v-model:open is supplied.
const open = defineModel<boolean>('open', { default: undefined });
</script>

<template>
  <AlertDialogRoot v-slot="{ open: isOpen, close }" v-model:open="open" :default-open="defaultOpen">
    <slot :open="isOpen" :close="close" />
  </AlertDialogRoot>
</template>
