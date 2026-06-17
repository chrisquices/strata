<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Tabs from '@ui/Tabs/Tabs.vue';
import TabsList from '@ui/Tabs/TabsList.vue';
import TabsTrigger from '@ui/Tabs/TabsTrigger.vue';
import TabsContent from '@ui/Tabs/TabsContent.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const tab = ref('overview');
const vtab = ref('general');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Tabs</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Switch between panels of related content; arrow keys move between tabs.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Active: {{ tab }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-md" data-demo="basic">
          <Tabs v-model="tab">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings" disabled>Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <p class="pt-4 text-sm text-muted">A summary of the project — status, owners, and recent changes.</p>
            </TabsContent>
            <TabsContent value="activity">
              <p class="pt-4 text-sm text-muted">A feed of recent events and edits.</p>
            </TabsContent>
            <TabsContent value="settings">
              <p class="pt-4 text-sm text-muted">Configuration for this project.</p>
            </TabsContent>
          </Tabs>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Vertical orientation. Active: {{ vtab }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-md" data-demo="vertical">
          <Tabs v-model="vtab" orientation="vertical">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>
            <TabsContent value="general">
              <p class="text-sm text-muted">Workspace name, URL, and defaults.</p>
            </TabsContent>
            <TabsContent value="members">
              <p class="text-sm text-muted">Invite teammates and manage roles.</p>
            </TabsContent>
            <TabsContent value="billing">
              <p class="text-sm text-muted">Plan, payment method, and invoices.</p>
            </TabsContent>
          </Tabs>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
