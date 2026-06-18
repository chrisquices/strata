<script setup lang="ts">
import { DropdownMenuRadioGroup } from 'reka-ui';

const modelValue = defineModel<string>({ default: undefined });
</script>

<template>
  <DropdownMenuRadioGroup v-model="modelValue">
    <slot />
  </DropdownMenuRadioGroup>
</template>
