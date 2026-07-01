<script setup lang="ts">
import {computed} from 'vue';
import {ContextMenuItem} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  icon: {default: undefined},
  destructive: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false},
  closeOnSelect: {type: Boolean, default: true},
});

const emit = defineEmits<{ select: [event: Event] }>();

const baseClass = 'group flex h-control w-full cursor-default select-none items-center gap-cluster-small rounded-medium px-control-x-small text-sm transition-colors duration-100 focus-visible:outline-none';

const stateClass = computed(() => props.disabled ? 'text-faint cursor-not-allowed' : props.destructive ? 'text-destructive hover:bg-destructive hover:text-destructive-foreground data-[highlighted]:bg-destructive data-[highlighted]:text-destructive-foreground' : 'text-foreground hover:bg-border data-[highlighted]:bg-border');

// reka's select event is cancelable; preventDefault keeps the menu open when closeOnSelect is false.
function onSelect(event) {
  if (!props.closeOnSelect) {
    event.preventDefault();
  }

  emit('select', event);
}
</script>

<template>
  <ContextMenuItem v-bind="$attrs" :disabled="props.disabled" :class="cn(baseClass, stateClass, $attrs.class)"
                   @select="onSelect">
    <component
        :is="props.icon"
        v-if="props.icon"
        :class="['size-icon shrink-0', props.destructive ? 'text-current' : 'text-muted group-hover:text-current group-data-[highlighted]:text-current']"
    />
    <span class="min-w-0 truncate"><slot/></span>
  </ContextMenuItem>
</template>
