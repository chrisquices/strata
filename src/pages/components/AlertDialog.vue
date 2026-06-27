<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import {Trash2, LogOut} from '@lucide/vue';

import AlertDialog from '@ui/AlertDialog/AlertDialog.vue';
import AlertDialogTrigger from '@ui/AlertDialog/AlertDialogTrigger.vue';
import AlertDialogContent from '@ui/AlertDialog/AlertDialogContent.vue';
import AlertDialogHeader from '@ui/AlertDialog/AlertDialogHeader.vue';
import AlertDialogIcon from '@ui/AlertDialog/AlertDialogIcon.vue';
import AlertDialogTitle from '@ui/AlertDialog/AlertDialogTitle.vue';
import AlertDialogDescription from '@ui/AlertDialog/AlertDialogDescription.vue';
import AlertDialogFooter from '@ui/AlertDialog/AlertDialogFooter.vue';
import AlertDialogAction from '@ui/AlertDialog/AlertDialogAction.vue';
import AlertDialogCancel from '@ui/AlertDialog/AlertDialogCancel.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const lastResult = ref('—');
const controlledOpen = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Alert Dialog</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A modal confirmation built on reka — focus-trapped, escape-dismissable, with paired cancel/confirm actions.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Destructive confirm -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Destructive confirm</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Trigger opens the dialog; both buttons close it. Last result: {{ lastResult }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <AlertDialog>
          <AlertDialogTrigger variant="destructive">Delete project</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogIcon>
                <Trash2 class="size-icon-medium"/>
              </AlertDialogIcon>
              <AlertDialogTitle>Delete this project?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes the project and all of its data. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel @click="lastResult = 'cancelled'">Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" @click="lastResult = 'deleted'">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Opened from outside via v-model:open (no trigger inside). Open: {{ controlledOpen }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Button variant="secondary" @click="controlledOpen = true">Sign out…</Button>
        <AlertDialog v-model:open="controlledOpen">
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogIcon>
                <LogOut class="size-icon-medium"/>
              </AlertDialogIcon>
              <AlertDialogTitle>Sign out?</AlertDialogTitle>
              <AlertDialogDescription>You'll need to sign back in to access your workspace.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Stay</AlertDialogCancel>
              <AlertDialogAction>Sign out</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
