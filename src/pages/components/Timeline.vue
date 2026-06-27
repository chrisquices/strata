<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Timeline from '@ui/Timeline/Timeline.vue';
import TimelineItem from '@ui/Timeline/TimelineItem.vue';
import TimelineTime from '@ui/Timeline/TimelineTime.vue';

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
    <ComponentHeaderTitle>Timeline</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A vertical sequence of events, each with a dot marker, an optional time, and
      content.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Each item pairs a dot marker with slotted content, joined by a connector line
        that is hidden on the last item. Here the markers track progress: filled for done, ring for in progress, outline
        for upcoming.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-md">
          <Timeline>
            <TimelineItem dot="filled">
              <TimelineTime>09:41</TimelineTime>
              <p class="text-sm font-medium text-foreground">Order placed</p>
              <p class="text-xs text-muted">Payment confirmed.</p>
            </TimelineItem>
            <TimelineItem dot="ring">
              <TimelineTime>11:20</TimelineTime>
              <p class="text-sm font-medium text-foreground">Shipped</p>
              <p class="text-xs text-muted">Left the warehouse.</p>
            </TimelineItem>
            <TimelineItem dot="outline">
              <TimelineTime>Tomorrow</TimelineTime>
              <p class="text-sm font-medium text-foreground">Out for delivery</p>
              <p class="text-xs text-muted">Estimated arrival 3–5pm.</p>
            </TimelineItem>
          </Timeline>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Dot styles -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Dot styles</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The dot prop sets the marker: outline is the default, filled is solid, and ring
        adds a halo.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-md">
          <Timeline>
            <TimelineItem dot="outline">
              <p class="text-sm font-medium text-foreground">Outline</p>
              <p class="text-xs text-muted">A bordered marker for upcoming or inactive events.</p>
            </TimelineItem>
            <TimelineItem dot="filled">
              <p class="text-sm font-medium text-foreground">Filled</p>
              <p class="text-xs text-muted">A solid marker for completed events.</p>
            </TimelineItem>
            <TimelineItem dot="ring">
              <p class="text-sm font-medium text-foreground">Ring</p>
              <p class="text-xs text-muted">A haloed marker for the current event.</p>
            </TimelineItem>
          </Timeline>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Without time -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Without time</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The time is optional. Omit TimelineTime and the item shows only its content.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-md">
          <Timeline>
            <TimelineItem dot="filled">
              <p class="text-sm font-medium text-foreground">Draft created</p>
              <p class="text-xs text-muted">Saved to your workspace.</p>
            </TimelineItem>
            <TimelineItem dot="filled">
              <p class="text-sm font-medium text-foreground">Sent for review</p>
              <p class="text-xs text-muted">Shared with two reviewers.</p>
            </TimelineItem>
            <TimelineItem dot="outline">
              <p class="text-sm font-medium text-foreground">Awaiting approval</p>
              <p class="text-xs text-muted">Pending sign-off before publish.</p>
            </TimelineItem>
          </Timeline>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
