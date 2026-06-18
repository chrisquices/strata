<script setup lang="ts">
import {AccordionContent} from 'reka-ui';
</script>

<template>
  <AccordionContent class="strata-accordion-content">
    <!-- Padding stays on the inner div; on the height-animated element it would stop the panel collapsing flush to 0. -->
    <div class="pb-3 text-sm text-muted">
      <slot/>
    </div>
  </AccordionContent>
</template>

<style>
/* Height expand/collapse, keyed off reka's data-state. Co-located here — only this component
   uses it. Non-scoped: the class sits on reka's AccordionContent root, which a scope hash
   wouldn't tag. */
@keyframes strata-accordion-down {
  from {
    height: 0;
    overflow: hidden;
  }
  to {
    height: var(--reka-accordion-content-height);
    overflow: hidden;
  }
}
@keyframes strata-accordion-up {
  from {
    height: var(--reka-accordion-content-height);
    overflow: hidden;
  }
  to {
    height: 0;
    overflow: hidden;
  }
}
.strata-accordion-content[data-state='open'] {
  animation: strata-accordion-down var(--duration-100) ease-out;
}
.strata-accordion-content[data-state='closed'] {
  animation: strata-accordion-up var(--duration-100) ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .strata-accordion-content[data-state='open'],
  .strata-accordion-content[data-state='closed'] {
    animation: none;
  }
}
</style>
