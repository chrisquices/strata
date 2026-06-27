<script setup lang="ts">
import {provide, useId} from 'vue';
import {CollapsibleRoot} from 'reka-ui';

defineProps({
  defaultOpen: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false},
  unmountOnHide: {type: Boolean, default: true},
});
const open = defineModel<boolean>('open', {default: undefined});

// reka's trigger aria-controls comes back empty, so we mint our own id and wire it via provide/inject.
const contentId = useId();
provide('collapsibleContentId', contentId);
</script>

<template>
  <CollapsibleRoot v-slot="{ open: isOpen }" v-model:open="open" :default-open="defaultOpen" :disabled="disabled" :unmount-on-hide="unmountOnHide">
    <slot :open="isOpen"/>
  </CollapsibleRoot>
</template>
