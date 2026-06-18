<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { ChevronDown } from '@lucide/vue';

import Collapsible from '@ui/Collapsible/Collapsible.vue';
import CollapsibleTrigger from '@ui/Collapsible/CollapsibleTrigger.vue';
import CollapsibleContent from '@ui/Collapsible/CollapsibleContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const open = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Collapsible</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      An animated show/hide region built on reka, with a wired aria-controls trigger.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Open: {{ open }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm" data-demo="default">
          <Collapsible v-model:open="open">
            <CollapsibleTrigger as-child>
              <Button variant="secondary" class="group w-full justify-between">
                Toggle details
                <ChevronDown class="size-icon-small transition-transform duration-200 group-data-[state=open]:rotate-180" />
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
  </div>
  </ComponentLayout>
</template>
