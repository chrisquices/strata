<script setup lang="ts">
// Floating-label text field. Compose: Field > FieldLabel (for="id") + FieldInput (id="id").
// The label rises to the top edge on focus or when the input has a value.
import { provide, ref } from 'vue';
const focused = ref(false);
const hasValue = ref(false);
provide('field', { focused, hasValue });
</script>

<template>
  <div class="relative">
    <slot />
  </div>
</template>
