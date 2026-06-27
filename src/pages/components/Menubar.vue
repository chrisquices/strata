<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';

import Menubar from '@ui/Menubar/Menubar.vue';
import MenubarMenu from '@ui/Menubar/MenubarMenu.vue';
import MenubarTrigger from '@ui/Menubar/MenubarTrigger.vue';
import MenubarContent from '@ui/Menubar/MenubarContent.vue';
import MenubarItem from '@ui/Menubar/MenubarItem.vue';
import MenubarCheckboxItem from '@ui/Menubar/MenubarCheckboxItem.vue';
import MenubarRadioGroup from '@ui/Menubar/MenubarRadioGroup.vue';
import MenubarRadioItem from '@ui/Menubar/MenubarRadioItem.vue';
import MenubarLabel from '@ui/Menubar/MenubarLabel.vue';
import MenubarSeparator from '@ui/Menubar/MenubarSeparator.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const wordWrap = ref(true);
const zoom = ref('100');
const lastAction = ref('—');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Menubar</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A desktop-style menu bar built on reka — a row of menus, each with items, checkbox/radio items, labels and separators.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Items, checkbox items, radio items, labels, and separators within a menubar.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-3">
        <div class="inline-block rounded-large border border-border bg-surface">
          <Menubar>
            <MenubarMenu>
              <MenubarTrigger>File</MenubarTrigger>
              <MenubarContent>
                <MenubarItem @select="lastAction = 'new'">New file</MenubarItem>
                <MenubarItem @select="lastAction = 'open'">Open…</MenubarItem>
                <MenubarSeparator />
                <MenubarItem destructive @select="lastAction = 'delete'">Delete</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
            <MenubarMenu>
              <MenubarTrigger>View</MenubarTrigger>
              <MenubarContent>
                <MenubarLabel>Appearance</MenubarLabel>
                <MenubarCheckboxItem v-model="wordWrap">Word wrap</MenubarCheckboxItem>
                <MenubarSeparator />
                <MenubarRadioGroup v-model="zoom">
                  <MenubarRadioItem value="100">100%</MenubarRadioItem>
                  <MenubarRadioItem value="150">150%</MenubarRadioItem>
                </MenubarRadioGroup>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>
        </div>
        <p class="text-xs text-muted">Last action: {{ lastAction }} · Wrap: {{ wordWrap }} · Zoom: {{ zoom }}%</p>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

  </ComponentContent>
</template>
