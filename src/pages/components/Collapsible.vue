<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import {ChevronDown} from '@lucide/vue';

import Collapsible from '@ui/Collapsible/Collapsible.vue';
import CollapsibleTrigger from '@ui/Collapsible/CollapsibleTrigger.vue';
import CollapsibleContent from '@ui/Collapsible/CollapsibleContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const open = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Collapsible</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      An animated show/hide region built on reka, with a wired aria-controls trigger.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Uncontrolled and closed to start. The root slot exposes the live open state, here driving the trigger label.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Collapsible v-slot="{ open }">
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                {{ open ? 'Hide' : 'Show' }} details
                <ChevronDown
                    class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180"/>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div class="mt-2 rounded-medium border border-border bg-surface p-3 text-sm text-muted">
                Hidden content revealed by the trigger. It animates open and closed.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Open by default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Open by default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        default-open renders the region expanded on first paint without controlling it afterward.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Collapsible default-open>
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                Toggle details
                <ChevronDown
                    class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180"/>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div class="mt-2 rounded-medium border border-border bg-surface p-3 text-sm text-muted">
                This region started open because default-open was set.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Driven from outside through v-model:open — currently {{ open ? 'open' : 'closed' }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <div class="mb-4 flex items-center gap-2">
            <Button variant="secondary" size="sm" @click="open = !open">
              Toggle
            </Button>
            <Button variant="secondary" size="sm" @click="open = false">
              Close
            </Button>
          </div>
          <Collapsible v-model:open="open">
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                Toggle details
                <ChevronDown
                    class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180"/>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div class="mt-2 rounded-medium border border-border bg-surface p-3 text-sm text-muted">
                The buttons above and the trigger all move the same v-model.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        disabled blocks the trigger and carries data-disabled, so the region can't be toggled.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Collapsible disabled>
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                Toggle details
                <ChevronDown
                    class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180"/>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div class="mt-2 rounded-medium border border-border bg-surface p-3 text-sm text-muted">
                This stays hidden because the trigger is disabled.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Kept in the DOM -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Kept in the DOM</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        unmount-on-hide off keeps closed content rendered but hidden, so it stays in the DOM instead of unmounting.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Collapsible :unmount-on-hide="false">
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                Toggle details
                <ChevronDown
                    class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180"/>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div class="mt-2 rounded-medium border border-border bg-surface p-3 text-sm text-muted">
                Closed, this stays in the DOM with a hidden attribute instead of unmounting.
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
