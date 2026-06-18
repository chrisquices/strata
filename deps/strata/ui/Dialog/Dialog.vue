<script setup lang="ts">
import {DialogRoot} from 'reka-ui';

defineProps({defaultOpen: {type: Boolean, default: false}});
const open = defineModel<boolean>('open', {default: undefined});
</script>

<template>
  <DialogRoot v-model:open="open" :default-open="defaultOpen">
    <slot/>
  </DialogRoot>
</template>
