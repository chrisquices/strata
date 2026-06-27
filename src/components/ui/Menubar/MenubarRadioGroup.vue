<script setup lang="ts">
import {MenubarRadioGroup} from 'reka-ui';

const modelValue = defineModel<string>({default: undefined});
</script>

<template>
  <MenubarRadioGroup v-model="modelValue">
    <slot/>
  </MenubarRadioGroup>
</template>
