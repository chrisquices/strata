<script setup lang="ts">
import {AccordionItem} from 'reka-ui';

defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  // undefined → reka inherits the root's unmountOnHide via `??`.
  unmountOnHide: {type: Boolean, default: undefined},
});
</script>

<template>
  <AccordionItem
      v-slot="{ open }"
      :value="value"
      :disabled="disabled"
      :unmount-on-hide="unmountOnHide"
      class="border-b border-border"
  >
    <slot :open="open"/>
  </AccordionItem>
</template>
