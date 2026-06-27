<script setup lang="ts">
import {ref} from 'vue';
import ComponentContent from "@app/component/ComponentContent.vue";
import Popover from '@ui/Popover/Popover.vue';
import PopoverTrigger from '@ui/Popover/PopoverTrigger.vue';
import PopoverContent from '@ui/Popover/PopoverContent.vue';
import PopoverClose from '@ui/Popover/PopoverClose.vue';
import PopoverAnchor from '@ui/Popover/PopoverAnchor.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const controlledOpen = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Popover</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Floating content anchored to a trigger — opens on click, dismisses on
      outside-click or Escape.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Click to open; the close button or an outside click dismisses it.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Popover>
          <PopoverTrigger as-child>
            <Button variant="primary">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div class="w-64 p-4">
              <p class="text-sm font-medium text-foreground">Dimensions</p>
              <p class="mt-1 text-xs text-muted">Set the width and height for the layer.</p>
              <div class="mt-3 flex justify-end">
                <PopoverClose as-child>
                  <Button variant="ghost" size="sm">Done</Button>
                </PopoverClose>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Placement -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Placement</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The side and align props control where the popover appears relative to the
        trigger.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-2">
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="secondary" size="sm">Top</Button>
            </PopoverTrigger>
            <PopoverContent side="top">
              <p class="p-3 text-sm">Placed on top</p>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="secondary" size="sm">Right</Button>
            </PopoverTrigger>
            <PopoverContent side="right">
              <p class="p-3 text-sm">Placed on right</p>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="secondary" size="sm">Bottom</Button>
            </PopoverTrigger>
            <PopoverContent side="bottom">
              <p class="p-3 text-sm">Placed on bottom</p>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger as-child>
              <Button variant="secondary" size="sm">Left</Button>
            </PopoverTrigger>
            <PopoverContent side="left">
              <p class="p-3 text-sm">Placed on left</p>
            </PopoverContent>
          </Popover>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Driven from outside through v-model:open. Currently:
        {{ controlledOpen ? 'open' : 'closed' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-2">
          <Button variant="secondary" size="sm" @click="controlledOpen = !controlledOpen">
            {{ controlledOpen ? 'Close' : 'Open' }} externally
          </Button>
          <Popover v-model:open="controlledOpen">
            <PopoverTrigger as-child>
              <Button variant="primary">Trigger</Button>
            </PopoverTrigger>
            <PopoverContent>
              <p class="p-3 text-sm">Controlled by external state</p>
            </PopoverContent>
          </Popover>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Default open -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default open</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Starts open on mount without requiring external state.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Popover default-open>
          <PopoverTrigger as-child>
            <Button variant="secondary">Already open</Button>
          </PopoverTrigger>
          <PopoverContent>
            <p class="p-3 text-sm">Opened by default</p>
          </PopoverContent>
        </Popover>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Modal -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Modal</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Modal mode traps focus inside the popover and dims the rest of the page until
        dismissed.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Popover modal>
          <PopoverTrigger as-child>
            <Button variant="primary">Open modal popover</Button>
          </PopoverTrigger>
          <PopoverContent>
            <div class="w-64 p-4">
              <p class="text-sm font-medium text-foreground">Focus trapped</p>
              <p class="mt-1 text-xs text-muted">Tab will cycle only through elements inside this popover.</p>
              <div class="mt-3 flex justify-end">
                <PopoverClose as-child>
                  <Button variant="ghost" size="sm">Close</Button>
                </PopoverClose>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Anchor -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Anchor</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>PopoverAnchor positions the popover relative to a different element than the
        trigger.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Popover>
          <div class="flex items-center gap-4">
            <PopoverTrigger as-child>
              <Button variant="secondary" size="sm">Open</Button>
            </PopoverTrigger>
            <PopoverAnchor as-child>
              <span class="rounded-medium border border-dashed border-border px-3 py-1.5 text-sm text-muted">Anchored here</span>
            </PopoverAnchor>
          </div>
          <PopoverContent>
            <p class="p-3 text-sm">Positioned relative to the anchor, not the trigger</p>
          </PopoverContent>
        </Popover>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
