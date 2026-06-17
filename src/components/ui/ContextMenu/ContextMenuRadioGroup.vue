<script setup lang="ts">
import {ContextMenuRadioGroup} from 'reka-ui';

const modelValue = defineModel<string>({default: undefined});
</script>

<template>
  <ContextMenuRadioGroup v-model="modelValue">
    <slot/>
  </ContextMenuRadioGroup>
</template>
