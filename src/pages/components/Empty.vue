<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { Inbox, SearchX, Plus } from '@lucide/vue';

import Empty from '@ui/Empty/Empty.vue';
import EmptyIcon from '@ui/Empty/EmptyIcon.vue';
import EmptyTitle from '@ui/Empty/EmptyTitle.vue';
import EmptyDescription from '@ui/Empty/EmptyDescription.vue';
import EmptyAction from '@ui/Empty/EmptyAction.vue';
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
    <ComponentHeaderTitle>Empty</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A centered placeholder for empty states — composed from icon, title, description and an optional action.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Basic -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Basic</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Icon, title and description.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface">
          <Empty>
            <EmptyIcon><Inbox class="size-icon-extra-large" /></EmptyIcon>
            <EmptyTitle>No messages</EmptyTitle>
            <EmptyDescription>Your inbox is empty. New messages will show up here.</EmptyDescription>
          </Empty>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- With action -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>With action</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>An action slot below the description.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface">
          <Empty>
            <EmptyIcon><SearchX class="size-icon-extra-large" /></EmptyIcon>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>Try adjusting your filters, or create a new entry to get started.</EmptyDescription>
            <EmptyAction>
              <Button><Plus aria-hidden="true" class="size-icon-medium" /> New entry</Button>
            </EmptyAction>
          </Empty>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Title only -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Title only</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The parts are optional — use only what you need.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface">
          <Empty>
            <EmptyTitle>Nothing here yet</EmptyTitle>
          </Empty>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
