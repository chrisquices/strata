<script setup lang="ts">
import {DialogClose} from 'reka-ui';
import Button from '../Button/Button.vue';

defineProps({variant: {default: 'ghost'}});
</script>

<template>
  <DialogClose as-child>
    <Button :variant="variant">
      <slot/>
    </Button>
  </DialogClose>
</template>
