<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Popover from '@ui/Popover/Popover.vue';
import PopoverTrigger from '@ui/Popover/PopoverTrigger.vue';
import PopoverContent from '@ui/Popover/PopoverContent.vue';
import PopoverClose from '@ui/Popover/PopoverClose.vue';
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
    <ComponentItemHeaderTitle>Popover</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Floating content anchored to a trigger — opens on click, dismisses on outside-click or Escape.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Click to open; the close button or an outside click dismisses it.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic">
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
                    <Button variant="muted">Done</Button>
                  </PopoverClose>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
