<script setup lang="ts">
import { computed } from 'vue';
import { DropdownMenuCheckboxItem, DropdownMenuItemIndicator } from 'reka-ui';
import { Check } from '@lucide/vue';

const props = defineProps({
  disabled: { type: Boolean, default: false },
  closeOnSelect: { type: Boolean, default: false },
});
const emit = defineEmits<{ select: [event: Event] }>();
const checked = defineModel<boolean>({ default: false });

const base =
  'group relative flex w-full cursor-default select-none items-center gap-2.5 rounded-medium py-1.5 pl-8 pr-2 text-xs transition-colors duration-fast focus-visible:outline-none';
const stateClass = computed(() =>
  props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border',
);

function onSelect(event) {
  if (!props.closeOnSelect) event.preventDefault();
  emit('select', event);
}
</script>

<template>
  <DropdownMenuCheckboxItem v-model="checked" :disabled="disabled" :class="[base, stateClass]" @select="onSelect">
    <span class="pointer-events-none absolute left-2 inline-flex size-icon-small items-center justify-center" aria-hidden="true">
      <DropdownMenuItemIndicator>
        <Check class="size-icon-small" />
      </DropdownMenuItemIndicator>
    </span>
    <slot />
  </DropdownMenuCheckboxItem>
</template>
