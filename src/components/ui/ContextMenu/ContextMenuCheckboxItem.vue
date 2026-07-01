<script setup lang="ts">
import {computed} from 'vue';
import {ContextMenuCheckboxItem, ContextMenuItemIndicator} from 'reka-ui';
import {Check} from '@lucide/vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: false},
});

const emit = defineEmits<{ select: [event: Event] }>();

const checked = defineModel<boolean>({default: false});

const baseClass = 'group flex h-control w-full cursor-default select-none items-center gap-2 rounded-medium px-control-x-small text-sm transition-colors duration-100 focus-visible:outline-none';

const stateClass = computed(() => props.disabled ? 'text-faint cursor-not-allowed' : 'text-foreground hover:bg-border data-[highlighted]:bg-border');

function onSelect(event) {
  if (!props.closeOnSelect) {
    event.preventDefault();
  }

  emit('select', event);
}
</script>

<template>
  <ContextMenuCheckboxItem v-bind="$attrs" v-model="checked" :disabled="props.disabled"
                           :class="cn(baseClass, stateClass, $attrs.class)" @select="onSelect">
    <span class="pointer-events-none inline-flex size-icon shrink-0 items-center justify-center"
          aria-hidden="true">
      <ContextMenuItemIndicator>
        <Check class="size-icon"/>
      </ContextMenuItemIndicator>
    </span>
    <slot/>
  </ContextMenuCheckboxItem>
</template>
