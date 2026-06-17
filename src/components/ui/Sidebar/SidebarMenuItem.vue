<script setup lang="ts">
import type { PropType } from 'vue';
import { computed, useAttrs, useSlots } from 'vue';
import { ChevronRight } from '@lucide/vue';
import { Primitive } from 'reka-ui';
import Collapsible from '../Collapsible/Collapsible.vue';
import CollapsibleTrigger from '../Collapsible/CollapsibleTrigger.vue';
import CollapsibleContent from '../Collapsible/CollapsibleContent.vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  href: { type: String, default: undefined },
  selected: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  defaultOpen: { type: Boolean, default: false },
  type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button', validator: (value: string) => ['button', 'submit', 'reset'].includes(value) },
});
const open = defineModel<boolean>('open', { default: undefined });

const attrs = useAttrs();
const slots = useSlots();
const hasSubmenu = computed(() => !!slots.submenu);
const isLink = computed(() => !!props.href && !hasSubmenu.value);
const isButton = computed(() => !isLink.value && !hasSubmenu.value);

const base =
  'strata-sidebar-menu-item group/sidebar-menu-item relative flex h-control w-full cursor-pointer items-center gap-2 px-4 pr-4 text-left text-sm transition-colors duration-fast ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30';
const stateClass = computed(() =>
  props.selected
    ? 'bg-surface text-foreground'
    : 'text-muted hover:bg-surface/60 hover:text-foreground'
);
const disabledClass = computed(() => (props.disabled ? 'pointer-events-none cursor-not-allowed opacity-50' : ''));
</script>

<template>
  <li class="relative">
    <Collapsible v-if="hasSubmenu" v-model:open="open" :default-open="defaultOpen">
      <CollapsibleTrigger as-child>
        <Primitive
          v-bind="attrs"
          as="button"
          :type="type"
          :disabled="disabled || undefined"
          :aria-current="selected ? 'page' : undefined"
          :data-active="selected || undefined"
          :data-disabled="disabled || undefined"
          :class="[base, stateClass, disabledClass, 'group/collapsible']"
        >
          <slot name="icon" />
          <span class="flex-1 truncate"><slot /></span>
          <slot name="badge" />
          <ChevronRight class="size-icon-small shrink-0 text-faint transition-transform duration-base group-data-[state=open]/collapsible:rotate-90" aria-hidden="true" />
          <span v-if="selected" class="absolute inset-y-1 right-0 w-0.5 rounded-small bg-foreground" aria-hidden="true"></span>
        </Primitive>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <slot name="submenu" />
      </CollapsibleContent>
    </Collapsible>

    <Primitive
      v-else
      v-bind="attrs"
      :as="isLink ? 'a' : 'button'"
      :href="isLink ? href : undefined"
      :type="isButton ? type : undefined"
      :disabled="isButton && disabled ? true : undefined"
      :aria-current="selected ? 'page' : undefined"
      :aria-disabled="isLink && disabled ? 'true' : undefined"
      :data-active="selected || undefined"
      :data-disabled="disabled || undefined"
      :class="[base, stateClass, disabledClass]"
    >
      <slot name="icon" />
      <span class="flex-1 truncate"><slot /></span>
      <slot name="badge" />
      <span v-if="selected" class="absolute inset-y-1 right-0 w-0.5 rounded-small bg-foreground" aria-hidden="true"></span>
    </Primitive>
  </li>
</template>

<style>
.strata-sidebar-menu[data-align-icons] > li > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before,
.strata-sidebar-menu-sub[data-align-icons] > li > .strata-sidebar-menu-item:not(:has(> svg:first-child))::before {
  content: '';
  width: var(--spacing-icon-medium);
  height: var(--spacing-icon-medium);
  flex: 0 0 var(--spacing-icon-medium);
}
</style>
