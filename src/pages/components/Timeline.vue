<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Timeline from '@ui/Timeline/Timeline.vue';
import TimelineItem from '@ui/Timeline/TimelineItem.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Timeline</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A vertical sequence of events, each with a dot marker, an optional time, and content.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionExample>
        <div class="max-w-md" data-demo="timeline">
          <Timeline>
            <TimelineItem time="09:41" dot="filled">
              <p class="text-sm font-medium text-foreground">Order placed</p>
              <p class="text-xs text-muted">Payment confirmed.</p>
            </TimelineItem>
            <TimelineItem time="11:20" dot="ring">
              <p class="text-sm font-medium text-foreground">Shipped</p>
              <p class="text-xs text-muted">Left the warehouse.</p>
            </TimelineItem>
            <TimelineItem time="Tomorrow" dot="hollow">
              <p class="text-sm font-medium text-foreground">Out for delivery</p>
              <p class="text-xs text-muted">Estimated arrival 3–5pm.</p>
            </TimelineItem>
          </Timeline>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
