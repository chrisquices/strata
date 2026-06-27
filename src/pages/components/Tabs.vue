<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import Tabs from '@ui/Tabs/Tabs.vue';
import TabsList from '@ui/Tabs/TabsList.vue';
import TabsTrigger from '@ui/Tabs/TabsTrigger.vue';
import TabsContent from '@ui/Tabs/TabsContent.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const tab = ref('overview');
const verticalTab = ref('general');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Tabs</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Switch between panels of related content; arrow keys move between tabs.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Horizontal tabs with one disabled trigger. Arrow keys move between triggers and
        the matching panel shows below. Active: {{ tab }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-md">
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

    <!-- Uncontrolled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Uncontrolled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Without v-model the active tab lives inside the component; default-value sets
        which one starts open.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-md">
          <Tabs default-value="account">
            <TabsList>
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>
            <TabsContent value="account">
              <p class="pt-4 text-sm text-muted">Name, email, and profile photo.</p>
            </TabsContent>
            <TabsContent value="notifications">
              <p class="pt-4 text-sm text-muted">Choose which updates reach your inbox.</p>
            </TabsContent>
            <TabsContent value="security">
              <p class="pt-4 text-sm text-muted">Password, two-factor, and active sessions.</p>
            </TabsContent>
          </Tabs>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Vertical -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Vertical</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With orientation set to vertical, the triggers stack beside their panels and the
        up and down arrows move between them. Active: {{ verticalTab }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-md">
          <Tabs v-model="verticalTab" orientation="vertical">
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
  </ComponentContent>
</template>
