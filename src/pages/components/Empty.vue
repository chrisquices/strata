<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { Inbox, SearchX, Plus } from '@lucide/vue';

import Empty from '@ui/Empty/Empty.vue';
import EmptyIcon from '@ui/Empty/EmptyIcon.vue';
import EmptyTitle from '@ui/Empty/EmptyTitle.vue';
import EmptyDescription from '@ui/Empty/EmptyDescription.vue';
import EmptyAction from '@ui/Empty/EmptyAction.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Empty</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A centered placeholder for empty states — composed from icon, title, description and an optional action.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Basic</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Icon, title and description.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface" data-demo="basic">
          <Empty>
            <EmptyIcon><Inbox class="size-icon-extra-large" /></EmptyIcon>
            <EmptyTitle>No messages</EmptyTitle>
            <EmptyDescription>Your inbox is empty. New messages will show up here.</EmptyDescription>
          </Empty>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>With action</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>An action slot below the description.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface" data-demo="action">
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

    <ComponentItemSection>
      <ComponentItemSectionTitle>Title only</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The parts are optional — use only what you need.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="rounded-large border border-border bg-surface" data-demo="title-only">
          <Empty>
            <EmptyTitle>Nothing here yet</EmptyTitle>
          </Empty>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
