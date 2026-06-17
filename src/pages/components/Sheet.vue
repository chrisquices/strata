<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Sheet from '@ui/Sheet/Sheet.vue';
import SheetTrigger from '@ui/Sheet/SheetTrigger.vue';
import SheetContent from '@ui/Sheet/SheetContent.vue';
import SheetHeader from '@ui/Sheet/SheetHeader.vue';
import SheetTitle from '@ui/Sheet/SheetTitle.vue';
import SheetDescription from '@ui/Sheet/SheetDescription.vue';
import SheetBody from '@ui/Sheet/SheetBody.vue';
import SheetFooter from '@ui/Sheet/SheetFooter.vue';
import SheetClose from '@ui/Sheet/SheetClose.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sides = ['right', 'left', 'top', 'bottom'];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Sheet</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      An edge-anchored panel built on reka's Dialog — slides in from any side, with header/body/footer slots.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sides</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Opens from right, left, top, or bottom; Escape / outside-click / Close dismiss.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="sides">
          <Sheet v-for="side in sides" :key="side">
            <SheetTrigger as-child>
              <Button variant="secondary">From {{ side }}</Button>
            </SheetTrigger>
            <SheetContent :side="side">
              <SheetHeader>
                <div>
                  <SheetTitle>{{ side }} sheet</SheetTitle>
                  <SheetDescription>A panel anchored to the {{ side }} edge.</SheetDescription>
                </div>
                <SheetClose as-child>
                  <Button icon variant="ghost" size="sm" aria-label="Close">✕</Button>
                </SheetClose>
              </SheetHeader>
              <SheetBody>
                <p class="text-sm text-muted">Body content scrolls if it overflows. Put a form or details here.</p>
              </SheetBody>
              <SheetFooter>
                <SheetClose as-child><Button variant="ghost">Cancel</Button></SheetClose>
                <Button>Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
