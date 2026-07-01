<script setup lang="ts">
import {computed} from 'vue';
import {DropdownMenuCheckboxItem, DropdownMenuItemIndicator} from 'reka-ui';
import {Check} from '@lucide/vue';

const props = defineProps({
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: false},
});
const emit = defineEmits<{ select: [event: Event] }>();
const checked = defineModel<boolean>({default: false});

const baseClass =
    'group flex h-control w-full cursor-default select-none items-center gap-2 rounded-medium px-control-x text-sm transition-colors duration-100 focus-visible:outline-none';
const stateClass = computed(function () {
  return props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border';
});

function onSelect(event) {
  if (!props.closeOnSelect) event.preventDefault();
  emit('select', event);
}
</script>

<template>
  <DropdownMenuCheckboxItem v-model="checked" :disabled="disabled" :class="[baseClass, stateClass]" @select="onSelect">
    <span class="pointer-events-none inline-flex size-icon shrink-0 items-center justify-center"
          aria-hidden="true">
      <DropdownMenuItemIndicator>
        <Check class="size-icon"/>
      </DropdownMenuItemIndicator>
    </span>
    <slot/>
  </DropdownMenuCheckboxItem>
</template>
