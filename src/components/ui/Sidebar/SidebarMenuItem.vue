<script setup lang="ts">
import type {PropType} from 'vue';
import {computed, useSlots} from 'vue';
import {ChevronRight} from '@lucide/vue';
import {Primitive} from 'reka-ui';
import Collapsible from '../Collapsible/Collapsible.vue';
import CollapsibleTrigger from '../Collapsible/CollapsibleTrigger.vue';
import CollapsibleContent from '../Collapsible/CollapsibleContent.vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  href: {type: String, default: undefined},
  selected: {type: Boolean, default: false},
  disabled: {type: Boolean, default: false},
  defaultOpen: {type: Boolean, default: false},
  type: {
    type: String as PropType<'button' | 'submit' | 'reset'>,
    default: 'button',
    validator: function (value: string) {
      return ['button', 'submit', 'reset'].includes(value);
    },
  },
});
const open = defineModel<boolean>('open', {default: undefined});

const slots = useSlots();

const hasSubmenu = computed(function () {
  return !!slots.submenu;
});
const isLink = computed(function () {
  return !!props.href && !hasSubmenu.value;
});
const isButton = computed(function () {
  return !isLink.value && !hasSubmenu.value;
});

const baseClass =
    'strata-sidebar-menu-item group/sidebar-menu-item relative flex h-control w-full cursor-pointer items-center gap-cluster-small px-container text-left text-sm ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30' +
    'group-data-[collapsed]/sidebar:pl-5 group-data-[collapsed]/sidebar:pr-0 group-data-[collapsed]/sidebar:gap-0';
const stateClass = computed(function () {
  return props.selected
      ? 'bg-hover/5 text-foreground'
      : 'hover:bg-hover/5';
});
const disabledClass = computed(function () {
  return props.disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : '';
});
</script>

<template>
  <li class="relative">
    <Collapsible v-if="hasSubmenu" v-model:open="open" :default-open="defaultOpen">
      <CollapsibleTrigger as-child>
        <Primitive
            v-bind="$attrs"
            as="button"
            :type="type"
            :disabled="disabled || undefined"
            :aria-current="selected ? 'page' : undefined"
            :data-active="selected || undefined"
            :data-disabled="disabled || undefined"
            :class="cn(baseClass, stateClass, disabledClass, 'group/collapsible', $attrs.class)"
        >
          <slot name="icon"/>
          <span
              class="flex-1 truncate overflow-hidden transition-[max-width,opacity] duration-300 group-data-[collapsed]/sidebar:max-w-0 group-data-[collapsed]/sidebar:opacity-0"><slot/></span>
          <span v-if="slots.badge"
                class="overflow-hidden max-w-[200px] transition-[max-width,opacity] duration-300 group-data-[collapsed]/sidebar:max-w-0 group-data-[collapsed]/sidebar:opacity-0"><slot
              name="badge"/></span>
          <span
              class="overflow-hidden max-w-[20px] flex items-center transition-[max-width,opacity] duration-300 group-data-[collapsed]/sidebar:max-w-0 group-data-[collapsed]/sidebar:opacity-0">
            <ChevronRight
                class="size-icon-small shrink-0 text-faint transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
                aria-hidden="true"/>
          </span>
          <span v-if="selected"
                class="absolute inset-y-1 right-0 w-0.5 rounded-small bg-foreground group-data-[collapsed]/sidebar:hidden"
                aria-hidden="true"></span>
        </Primitive>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <slot name="submenu"/>
      </CollapsibleContent>
    </Collapsible>

    <Primitive
        v-else
        v-bind="$attrs"
        :as="isLink ? 'a' : 'button'"
        :href="isLink ? href : undefined"
        :type="isButton ? type : undefined"
        :disabled="isButton && disabled ? true : undefined"
        :aria-current="selected ? 'page' : undefined"
        :aria-disabled="isLink && disabled ? 'true' : undefined"
        :data-active="selected || undefined"
        :data-disabled="disabled || undefined"
        :class="cn(baseClass, stateClass, disabledClass, $attrs.class)"
    >
      <slot name="icon"/>
      <span
          class="flex-1 truncate overflow-hidden transition-[max-width,opacity] duration-300 group-data-[collapsed]/sidebar:max-w-0 group-data-[collapsed]/sidebar:opacity-0"><slot/></span>
      <span v-if="slots.badge"
            class="overflow-hidden max-w-[200px] transition-[max-width,opacity] duration-300 group-data-[collapsed]/sidebar:max-w-0 group-data-[collapsed]/sidebar:opacity-0"><slot
          name="badge"/></span>
      <span v-if="selected"
            class="absolute inset-y-1 right-0 w-0.5 rounded-small bg-foreground group-data-[collapsed]/sidebar:hidden"
            aria-hidden="true"></span>
    </Primitive>
  </li>
</template>

<style>
.strata-sidebar-menu-item {
  transition-property: color, background-color, gap, padding-inline-start, padding-inline-end;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 100ms, 100ms, 300ms, 300ms, 300ms;
}

.strata-sidebar-menu-sub > li > .strata-sidebar-menu-item,
.strata-sidebar-menu-sub > li > div > .strata-sidebar-menu-item {
  padding-inline-start: 1rem;
}

.strata-sidebar-menu[data-align-icons] > li > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before,
.strata-sidebar-menu[data-align-icons] > li > div > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before,
.strata-sidebar-menu-sub[data-align-icons] > li > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before,
.strata-sidebar-menu-sub[data-align-icons] > li > div > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before {
  content: '';
  width: var(--spacing-icon);
  height: var(--spacing-icon);
  flex: 0 0 var(--spacing-icon);
}
</style>
