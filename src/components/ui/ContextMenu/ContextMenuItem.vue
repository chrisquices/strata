<script setup lang="ts">
import { computed } from 'vue';
import { ContextMenuItem } from 'reka-ui';

const props = defineProps({
  icon: { default: undefined },
  destructive: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  closeOnSelect: { type: Boolean, default: true },
});
const emit = defineEmits<{ select: [event: Event] }>();

const base =
    'group flex w-full cursor-default select-none items-center gap-2.5 rounded-medium px-2 py-1.5 text-xs transition-colors duration-fast focus-visible:outline-none';
const stateClass = computed(() =>
    props.disabled
        ? 'text-faint cursor-not-allowed'
        : props.destructive
            ? 'text-destructive hover:bg-destructive hover:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground'
            : 'text-foreground hover:bg-border data-[highlighted]:bg-border',
);

// reka's select event is cancelable; preventDefault keeps the menu open when closeOnSelect is false.
function onSelect(event) {
  if (!props.closeOnSelect) event.preventDefault();
  emit('select', event);
}
</script>

<template>
  <ContextMenuItem :disabled="disabled" :class="[base, stateClass]" @select="onSelect">
    <component
        :is="icon"
        v-if="icon"
        :class="['size-icon-medium shrink-0', destructive ? 'text-current' : 'text-muted group-hover:text-current group-data-[highlighted]:text-current']"
    />
    <span class="min-w-0 truncate"><slot /></span>
  </ContextMenuItem>
</template>
