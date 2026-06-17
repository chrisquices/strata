<script setup lang="ts">
import {AlertDialogTrigger} from 'reka-ui';
import Button from '../Button/Button.vue';

defineProps({
  variant: {type: String, default: 'secondary'},
  outline: {type: Boolean, default: false},
  size: { type: String, default: 'md' },
});
</script>

<template>
  <AlertDialogTrigger as-child>
    <Button :variant="variant" :outline="outline" :size="size">
      <slot/>
    </Button>
  </AlertDialogTrigger>
</template>
