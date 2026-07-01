<script setup lang="ts">
import {AccordionItem} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  unmountOnHide: {type: Boolean, default: undefined},
});
</script>

<template>
  <AccordionItem
      v-bind="$attrs"
      v-slot="{ open }"
      :value="props.value"
      :disabled="props.disabled"
      :unmount-on-hide="props.unmountOnHide"
      :class="cn('border-b border-border', $attrs.class)"
  >
    <slot :open="open"/>
  </AccordionItem>
</template>
