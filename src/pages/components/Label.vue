<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import Label from '@ui/Label/Label.vue';
import Input from '@ui/Input/Input.vue';
import Checkbox from '@ui/Checkbox/Checkbox.vue';
import FormField from '@ui/Form/FormField.vue';

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
    <ComponentHeaderTitle>Label</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A form label built on reka-ui — associates with a control via for, and clicking it focuses that control.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Associated with a control -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Associated with a control</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Click the label to focus the input.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <FormField>
          <Label for="kit-email">Email address</Label>
          <Input id="kit-email" type="email" placeholder="you@example.com"/>
        </FormField>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Wrapping a control -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Wrapping a control</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Nest the control inside the label to associate them implicitly — no for needed, and clicking the text toggles
        it.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Label>
          <Checkbox/>
          Keep me signed in
        </Label>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>data-disabled + muted styling for a disabled field's label.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <FormField>
          <Label for="kit-disabled" disabled>Display name</Label>
          <Input id="kit-disabled" disabled placeholder="Unavailable"/>
        </FormField>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
