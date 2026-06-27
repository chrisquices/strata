<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
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
import {X} from '@lucide/vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sides = ['right', 'left', 'top', 'bottom'];
const open = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Sheet</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      An edge-anchored panel built on reka's Dialog — slides in from any side, with header/body/footer slots.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Sides -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sides</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Opens from right, left, top, or bottom; Escape, outside-click, or Close
        dismiss.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
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
                  <Button icon variant="ghost" size="sm" aria-label="Close">
                    <X aria-hidden="true" class="size-icon-small"/>
                  </Button>
                </SheetClose>
              </SheetHeader>
              <SheetBody>
                <p class="text-sm text-muted">Body content scrolls if it overflows. Put a form or details here.</p>
              </SheetBody>
              <SheetFooter>
                <SheetClose as-child>
                  <Button variant="ghost">Cancel</Button>
                </SheetClose>
                <Button>Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Open state owned by the page through v-model:open — currently
        {{ open ? 'open' : 'closed' }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="secondary" @click="open = true">Open sheet</Button>
          <Sheet v-model:open="open">
            <SheetContent side="right">
              <SheetHeader>
                <div>
                  <SheetTitle>Controlled sheet</SheetTitle>
                  <SheetDescription>Opened from an outside button; closing updates the bound value.</SheetDescription>
                </div>
                <SheetClose as-child>
                  <Button icon variant="ghost" size="sm" aria-label="Close">
                    <X aria-hidden="true" class="size-icon-small"/>
                  </Button>
                </SheetClose>
              </SheetHeader>
              <SheetBody>
                <p class="text-sm text-muted">The trigger lives outside the sheet, so the page owns the state.</p>
              </SheetBody>
              <SheetFooter>
                <SheetClose as-child>
                  <Button variant="ghost">Cancel</Button>
                </SheetClose>
                <Button @click="open = false">Save</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
