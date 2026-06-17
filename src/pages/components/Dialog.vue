<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Dialog from '@ui/Dialog/Dialog.vue';
import DialogTrigger from '@ui/Dialog/DialogTrigger.vue';
import DialogContent from '@ui/Dialog/DialogContent.vue';
import DialogHeader from '@ui/Dialog/DialogHeader.vue';
import DialogTitle from '@ui/Dialog/DialogTitle.vue';
import DialogDescription from '@ui/Dialog/DialogDescription.vue';
import DialogBody from '@ui/Dialog/DialogBody.vue';
import DialogFooter from '@ui/Dialog/DialogFooter.vue';
import DialogClose from '@ui/Dialog/DialogClose.vue';
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
    <ComponentItemHeaderTitle>Dialog</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A modal surface built on reka — focus-trapped, escape- and outside-click dismissable, with header/body/footer slots and a built-in close button.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Trigger opens; close via the X, the footer button, Escape, or clicking outside.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="default">
          <Dialog>
            <DialogTrigger>Edit profile</DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>Update your account details. Changes are saved when you click save.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <p class="text-sm text-muted">Your name, email, and preferences live here. The body scrolls if it overflows the dialog's max height.</p>
              </DialogBody>
              <DialogFooter>
                <DialogClose>Cancel</DialogClose>
                <Button variant="primary">Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>No close button</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>show-close=false hides the corner X (still dismissable via Escape/outside/footer).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="no-close">
          <Dialog>
            <DialogTrigger variant="secondary">Open</DialogTrigger>
            <DialogContent :show-close="false">
              <DialogHeader>
                <DialogTitle>Quick note</DialogTitle>
                <DialogDescription>This dialog has no corner close button.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose>Got it</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
