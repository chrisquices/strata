<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import HoverCard from '@ui/HoverCard/HoverCard.vue';
import HoverCardTrigger from '@ui/HoverCard/HoverCardTrigger.vue';
import HoverCardContent from '@ui/HoverCard/HoverCardContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Hover Card</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A rich card revealed when the trigger is hovered or focused — for previews like a
      user profile.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Hover the trigger to preview.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <HoverCard>
          <HoverCardTrigger>
            <Button variant="ghost">@strata</Button>
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
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>