<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Card from '@ui/Card/Card.vue';
import CardHeader from '@ui/Card/CardHeader.vue';
import CardTitle from '@ui/Card/CardTitle.vue';
import CardDescription from '@ui/Card/CardDescription.vue';
import CardAction from '@ui/Card/CardAction.vue';
import CardContent from '@ui/Card/CardContent.vue';
import CardFooter from '@ui/Card/CardFooter.vue';
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
    <ComponentHeaderTitle>Card</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A surface for grouped content — composable header (title/description/action), content, and footer.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Full card -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Full card</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Header with an action, content, and a footer.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Project settings</CardTitle>
              <CardDescription>Manage how this project behaves.</CardDescription>
              <CardAction>
                <Button variant="ghost" size="sm">Edit</Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted">Configure visibility, members, and integrations for the project.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Save</Button>
              <Button variant="ghost" size="sm">Cancel</Button>
            </CardFooter>
          </Card>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Header without action -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Header without action</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Without an action, the header stays single-column.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Choose what you want to hear about.</CardDescription>
            </CardHeader>
            <CardContent>
              <p class="text-sm text-muted">Email, push, and in-app notification preferences.</p>
            </CardContent>
          </Card>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Content only -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Content only</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With no header, CardContent adds its own top padding.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm">
          <Card>
            <CardContent>
              <p class="text-sm text-foreground">A bare card with just content inside.</p>
            </CardContent>
          </Card>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
