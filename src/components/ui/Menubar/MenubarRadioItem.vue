<script setup lang="ts">
import {computed} from 'vue';
import {MenubarRadioItem, MenubarItemIndicator} from 'reka-ui';

const props = defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: true},
});
const emit = defineEmits<{ select: [event: Event] }>();

const base =
    'group relative flex w-full cursor-default select-none items-center gap-2.5 rounded-medium py-1.5 pl-8 pr-2 text-xs transition-colors duration-100 focus-visible:outline-none';
const stateClass = computed(() =>
    props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border',
);

function onSelect(event) {
  if (!props.closeOnSelect) event.preventDefault();
  emit('select', event);
}
</script>

<template>
  <MenubarRadioItem :value="value" :disabled="disabled" :class="[base, stateClass]" @select="onSelect">
    <span class="pointer-events-none absolute left-2 inline-flex size-icon-small items-center justify-center"
          aria-hidden="true">
      <MenubarItemIndicator>
        <span class="size-1.5 rounded-full bg-current"></span>
      </MenubarItemIndicator>
    </span>
    <slot/>
  </MenubarRadioItem>
</template>
