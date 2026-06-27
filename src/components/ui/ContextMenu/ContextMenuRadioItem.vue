<script setup lang="ts">
import {computed} from 'vue';
import {ContextMenuRadioItem, ContextMenuItemIndicator} from 'reka-ui';

const props = defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: true},
});
const emit = defineEmits<{ select: [event: Event] }>();

const base =
    'group flex h-control w-full cursor-default select-none items-center gap-2 rounded-medium px-3 text-sm font-medium transition-colors duration-100 focus-visible:outline-none';
const stateClass = computed(function () {
  return props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border';
});

function onSelect(event) {
  if (!props.closeOnSelect) {
    event.preventDefault();
  }

  emit('select', event);
}
</script>

<template>
  <ContextMenuRadioItem :value="value" :disabled="disabled" :class="[base, stateClass]" @select="onSelect">
    <span class="pointer-events-none inline-flex size-icon-medium shrink-0 items-center justify-center" aria-hidden="true">
      <ContextMenuItemIndicator>
        <span class="size-1.5 rounded-full bg-current"></span>
      </ContextMenuItemIndicator>
    </span>
    <slot/>
  </ContextMenuRadioItem>
</template>
