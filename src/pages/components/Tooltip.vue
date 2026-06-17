<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Tooltip from '@ui/Tooltip/Tooltip.vue';
import TooltipTrigger from '@ui/Tooltip/TooltipTrigger.vue';
import TooltipContent from '@ui/Tooltip/TooltipContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Tooltip</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A short label shown on hover or keyboard focus, positioned around the trigger.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Hover or tab to the button.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic">
          <Tooltip>
            <TooltipTrigger>
              <Button variant="muted">Hover me</Button>
            </TooltipTrigger>
            <TooltipContent>Saved 2 minutes ago</TooltipContent>
          </Tooltip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Sides.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex gap-3" data-demo="sides">
          <Tooltip v-for="s in ['top', 'right', 'bottom', 'left']" :key="s">
            <TooltipTrigger>
              <Button variant="muted">{{ s }}</Button>
            </TooltipTrigger>
            <TooltipContent :side="s">On {{ s }}</TooltipContent>
          </Tooltip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
