<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Label from '@ui/Label/Label.vue';
import Input from '@ui/Input/Input.vue';

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
    <ComponentItemHeaderTitle>Label</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A form label built on reka — associates with a control via for, and clicking it focuses that control.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Associated with a control</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Click the label to focus the input.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2" data-demo="for">
          <Label for="kit-email">Email address</Label>
          <Input id="kit-email" type="email" placeholder="you@example.com"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>data-disabled + muted styling for a disabled field's label.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2" data-demo="disabled">
          <Label for="kit-disabled" disabled>Display name</Label>
          <Input id="kit-disabled" disabled placeholder="Unavailable"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
