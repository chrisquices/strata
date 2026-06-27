<script lang="ts">
// Module scope: defineProps is hoisted and can't see <script setup> consts.
const LEVELS = [1, 2, 3, 4, 5, 6];
</script>

<script setup lang="ts">
import {computed} from 'vue';
import {
  AccordionHeader as RekaAccordionHeader,
  AccordionTrigger as RekaAccordionTrigger,
  injectAccordionRootContext,
  injectAccordionItemContext,
} from 'reka-ui';
import {ChevronDown} from '@lucide/vue';

const props = defineProps({
  level: {
    type: [Number, String], default: 3, validator: function (value: string | number) {
      return LEVELS.includes(Number(value));
    }
  },
});

const rootContext = injectAccordionRootContext();
const itemContext = injectAccordionItemContext();
const headingTag = computed(function () {
  return LEVELS.includes(Number(props.level)) ? `h${Number(props.level)}` : 'h3';
});

// APG: the permanently-open trigger (non-collapsible single mode) and any
// disabled item both report aria-disabled.
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
        :aria-disabled="triggerAriaDisabled"
        class="group flex flex-1 items-center justify-between py-4 text-sm font-medium text-muted transition-colors duration-200 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=open]:text-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
    >
      <span class="text-start"><slot/></span>
      <ChevronDown
          aria-hidden="true"
          class="size-icon-small shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180"/>
    </RekaAccordionTrigger>
  </RekaAccordionHeader>
</template>
