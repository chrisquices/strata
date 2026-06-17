<script setup lang="ts">
import {computed} from 'vue';
import {AccordionTrigger, injectAccordionRootContext, injectAccordionItemContext} from 'reka-ui';
import {ChevronDown} from '@lucide/vue';

const rootContext = injectAccordionRootContext();
const itemContext = injectAccordionItemContext();

// APG: the permanently-open trigger (non-collapsible single mode) and any
// disabled item both report aria-disabled.
const pinnedOpen = computed(
    () => rootContext.isSingle.value && !rootContext.collapsible && itemContext.open.value,
);
const triggerAriaDisabled = computed(
    () => (pinnedOpen.value || itemContext.disabled.value ? 'true' : undefined),
);
</script>

<template>
  <AccordionTrigger
      :aria-disabled="triggerAriaDisabled"
      class="group flex flex-1 items-center justify-between py-3 text-sm font-medium text-muted transition-colors duration-base hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
  >
    <span class="text-start"><slot/></span>
    <ChevronDown
        aria-hidden="true"
        class="size-icon-small shrink-0 transition-transform duration-base group-data-[state=open]:rotate-180"/>
  </AccordionTrigger>
</template>
