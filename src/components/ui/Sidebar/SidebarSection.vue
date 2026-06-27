<script setup lang="ts">
import Caption from '../Caption/Caption.vue';

defineProps({
  label: {default: undefined},
});
</script>

<template>
  <div class="flex flex-col pt-2">
    <slot/>
  </div>
</template>
