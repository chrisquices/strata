<script setup lang="ts">
import {computed} from 'vue';
import {DropdownMenuRadioItem, DropdownMenuItemIndicator} from 'reka-ui';

const props = defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: true},
});
const emit = defineEmits<{ select: [event: Event] }>();

const baseClass =
    'group flex h-control w-full cursor-default select-none items-center gap-cluster-small rounded-medium px-control-x text-sm transition-colors duration-100 focus-visible:outline-none';
const stateClass = computed(function () {
  return props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border';
});

function onSelect(event) {
  if (!props.closeOnSelect) event.preventDefault();
  emit('select', event);
}
</script>

<template>
  <DropdownMenuRadioItem :value="value" :disabled="disabled" :class="[baseClass, stateClass]" @select="onSelect">
    <span class="pointer-events-none inline-flex size-icon shrink-0 items-center justify-center" aria-hidden="true">
      <DropdownMenuItemIndicator>
        <span class="size-1.5 rounded-full bg-current"></span>
      </DropdownMenuItemIndicator>
    </span>
    <slot/>
  </DropdownMenuRadioItem>
</template>
