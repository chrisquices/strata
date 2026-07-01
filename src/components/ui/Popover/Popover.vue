<script setup lang="ts">
import {PopoverRoot} from 'reka-ui';

const props = defineProps({
  defaultOpen: {type: Boolean, default: false},
  modal: {type: Boolean, default: false},
});
const open = defineModel<boolean>('open', {default: undefined});
</script>

<template>
  <PopoverRoot v-model:open="open" :default-open="props.defaultOpen" :modal="props.modal">
    <slot/>
  </PopoverRoot>
</template>
