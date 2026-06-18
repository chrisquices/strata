<script setup lang="ts">
import {provide, useId} from 'vue';
import {CollapsibleRoot} from 'reka-ui';

defineProps({
  defaultOpen: {type: Boolean, default: false},
  unmountOnHide: {type: Boolean, default: true},
});
const open = defineModel<boolean>('open', {default: undefined});

// reka's trigger aria-controls comes back empty, so we mint our own id and wire it via provide/inject.
const contentId = useId();
provide('collapsibleContentId', contentId);
</script>

<template>
  <CollapsibleRoot v-model:open="open" :default-open="defaultOpen" :unmount-on-hide="unmountOnHide">
    <slot/>
  </CollapsibleRoot>
</template>
