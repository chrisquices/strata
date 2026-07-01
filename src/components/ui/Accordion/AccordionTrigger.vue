<script setup lang="ts">
import {computed} from 'vue';
import {
  AccordionHeader as RekaAccordionHeader,
  AccordionTrigger as RekaAccordionTrigger,
  injectAccordionRootContext,
  injectAccordionItemContext,
} from 'reka-ui';
import {ChevronDown} from '@lucide/vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  level: {
    type: [Number, String],
    default: 3,
    validator: (value: string | number) => [1, 2, 3, 4, 5, 6].includes(Number(value))
  },
});

const rootContext = injectAccordionRootContext();

const itemContext = injectAccordionItemContext();

const headingTag = computed(function () {
  return [1, 2, 3, 4, 5, 6].includes(Number(props.level)) ? `h${Number(props.level)}` : 'h3';
});

const pinnedOpen = computed(function () {
  return rootContext.isSingle.value && !rootContext.collapsible && itemContext.open.value;
});

const triggerAriaDisabled = computed(function () {
  return pinnedOpen.value || itemContext.disabled.value ? 'true' : undefined;
});
</script>

<template>
  <RekaAccordionHeader :as="headingTag" class="flex">
    <RekaAccordionTrigger
        v-bind="$attrs"
        :aria-disabled="triggerAriaDisabled"
        :class="cn('group flex flex-1 items-center justify-between gap-cluster py-stack text-sm font-medium text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50', $attrs.class)"
    >
      <span class="text-start"><slot/></span>
      <ChevronDown
          aria-hidden="true"
          class="size-icon-small shrink-0 transition-transform duration-100 group-data-[state=open]:rotate-180"/>
    </RekaAccordionTrigger>
  </RekaAccordionHeader>
</template>
