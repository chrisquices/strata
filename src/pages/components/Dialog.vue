<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
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
    <ComponentHeaderTitle>Dialog</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A modal surface built on reka — focus-trapped, escape- and outside-click dismissable, with header/body/footer slots and a built-in close button.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Trigger opens; close via the X, the footer button, Escape, or clicking outside.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
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
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- No close button -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>No close button</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>show-close=false hides the corner X (still dismissable via Escape/outside/footer).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
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
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
