<script setup lang="ts">
// Default renders reka's own focusable button. Pass `as-child` with a single focusable element
// (e.g. a Button) to make that element the trigger instead — avoids a nested button.
import {PopoverTrigger} from 'reka-ui';

const props = defineProps({asChild: {type: Boolean, default: false}});
</script>

<template>
  <PopoverTrigger :as-child="props.asChild">
    <slot/>
  </PopoverTrigger>
</template>
