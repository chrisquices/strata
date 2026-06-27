<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Tooltip from '@ui/Tooltip/Tooltip.vue';
import TooltipTrigger from '@ui/Tooltip/TooltipTrigger.vue';
import TooltipContent from '@ui/Tooltip/TooltipContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sides = ['top', 'bottom', 'left', 'right'];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Tooltip</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A short label shown on hover or keyboard focus, positioned around the trigger.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Hover or tab to the trigger to reveal a short contextual label.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Tooltip>
          <TooltipTrigger>
            <Button variant="ghost">
              Hover me
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Saved 2 minutes ago
          </TooltipContent>
        </Tooltip>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sides -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sides</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Content can be positioned on any side of the trigger.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-3">
          <Tooltip v-for="side in sides" :key="side">
            <TooltipTrigger>
              <Button variant="ghost">
                {{ side }}
              </Button>
            </TooltipTrigger>
            <TooltipContent :side="side">
              On {{ side }}
            </TooltipContent>
          </Tooltip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
