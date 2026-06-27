<script setup lang="ts">
import {PopoverRoot} from 'reka-ui';

defineProps({
  defaultOpen: {type: Boolean, default: false},
  modal: {type: Boolean, default: false},
});
const open = defineModel<boolean>('open', {default: undefined});
</script>

<template>
  <PopoverRoot v-model:open="open" :default-open="defaultOpen" :modal="modal">
    <slot/>
  </PopoverRoot>
</template>
