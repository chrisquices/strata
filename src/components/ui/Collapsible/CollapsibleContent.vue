<script setup lang="ts">
import {inject} from 'vue';
import {CollapsibleContent} from 'reka-ui';

const contentId = inject('collapsibleContentId', undefined);
</script>

<template>
  <CollapsibleContent class="strata-collapsible">
    <div :id="contentId">
      <slot/>
    </div>
  </CollapsibleContent>
</template>

<style>
/* Height expand/collapse, keyed off reka's data-state. Co-located here — only this component
   uses it. Non-scoped: the class sits on reka's CollapsibleContent root, which a scope hash
   wouldn't tag. */
@keyframes strata-collapsible-down {
  from {
    height: 0;
    overflow: hidden;
  }
  to {
    height: var(--reka-collapsible-content-height);
    overflow: hidden;
  }
}
@keyframes strata-collapsible-up {
  from {
    height: var(--reka-collapsible-content-height);
    overflow: hidden;
  }
  to {
    height: 0;
    overflow: hidden;
  }
}
.strata-collapsible[data-state='open'] {
  animation: strata-collapsible-down var(--duration-fast) ease-out;
}
.strata-collapsible[data-state='closed'] {
  animation: strata-collapsible-up var(--duration-fast) ease-out;
}
@media (prefers-reduced-motion: reduce) {
  .strata-collapsible[data-state='open'],
  .strata-collapsible[data-state='closed'] {
    animation: none;
  }
}
</style>
