<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import HoverCard from '@ui/HoverCard/HoverCard.vue';
import HoverCardTrigger from '@ui/HoverCard/HoverCardTrigger.vue';
import HoverCardContent from '@ui/HoverCard/HoverCardContent.vue';
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
    <ComponentItemHeaderTitle>Hover Card</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A rich card revealed when the trigger is hovered or focused — for previews like a user profile.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Hover the trigger to preview.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic">
          <HoverCard>
            <HoverCardTrigger>
              <Button variant="muted">@strata</Button>
            </HoverCardTrigger>
            <HoverCardContent>
              <div class="w-64 p-4">
                <div class="size-10 rounded-full bg-foreground/10"></div>
                <p class="mt-3 text-sm font-semibold text-foreground">Strata</p>
                <p class="mt-1 text-xs text-muted">A Vue UI kit of primitives.</p>
                <p class="mt-3 text-xs text-faint">Joined June 2026</p>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
