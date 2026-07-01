<script setup lang="ts">
import {AlertDialogRoot} from 'reka-ui';

const props = defineProps({
  defaultOpen: {type: Boolean, default: false}
});

const open = defineModel<boolean>('open', {default: undefined}); // Leaving the model undefined lets reka stay uncontrolled until the caller supplies v-model:open.
</script>

<template>
  <AlertDialogRoot v-slot="{ open: isOpen, close }" v-model:open="open" :default-open="props.defaultOpen">
    <slot :open="isOpen" :close="close"/>
  </AlertDialogRoot>
</template>
