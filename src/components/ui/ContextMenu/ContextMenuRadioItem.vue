<script setup lang="ts">
import {computed} from 'vue';
import {ContextMenuRadioItem, ContextMenuItemIndicator} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  value: {type: String, required: true},
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: true},
});

const emit = defineEmits<{ select: [event: Event] }>();

const baseClass = 'group flex h-control w-full cursor-default select-none items-center gap-cluster-small rounded-medium px-control-x-small text-sm transition-colors duration-100 focus-visible:outline-none';

const stateClass = computed(() => props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border');

function onSelect(event) {
  if (!props.closeOnSelect) {
    event.preventDefault();
  }

  emit('select', event);
}
</script>

<template>
  <ContextMenuRadioItem v-bind="$attrs" :value="props.value" :disabled="props.disabled"
                        :class="cn(baseClass, stateClass, $attrs.class)" @select="onSelect">
    <span class="pointer-events-none inline-flex size-icon shrink-0 items-center justify-center" aria-hidden="true">
      <ContextMenuItemIndicator>
        <span class="size-1.5 rounded-full bg-current"></span>
      </ContextMenuItemIndicator>
    </span>
    <slot/>
  </ContextMenuRadioItem>
</template>
