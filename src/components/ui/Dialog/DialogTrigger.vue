<script setup lang="ts">
import {DialogTrigger} from 'reka-ui';
import Button from '../Button/Button.vue';

defineProps({variant: {default: 'secondary'}});
</script>

<template>
  <DialogTrigger as-child>
    <Button :variant="variant">
      <slot/>
    </Button>
  </DialogTrigger>
</template>
