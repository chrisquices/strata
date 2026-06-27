<script setup lang="ts">
import {ref} from 'vue';

import ComponentContent from '@app/component/ComponentContent.vue';
import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import Button from '@ui/Button/Button.vue';
import CheckboxGroup from '@ui/CheckboxGroup/CheckboxGroup.vue';
import CheckboxGroupItem from '@ui/CheckboxGroup/CheckboxGroupItem.vue';
import Form from '@ui/Form/Form.vue';
import FormField from '@ui/Form/FormField.vue';
import Input from '@ui/Input/Input.vue';
import Label from '@ui/Label/Label.vue';
import Legend from '@ui/Legend/Legend.vue';
import RadioGroup from '@ui/RadioGroup/RadioGroup.vue';
import RadioGroupItem from '@ui/RadioGroup/RadioGroupItem.vue';
import Textarea from '@ui/Textarea/Textarea.vue';

const fullName = ref('Ada Lovelace');
const email = ref('ada@example.com');
const biography = ref('');
const plan = ref('team');
const interests = ref(['product']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>
      Form
    </ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A layout wrapper for sitewide form rhythm, paired with FormField for labels, controls, help text, errors, and
      grouped choices.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Text Fields -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Text Fields
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Form owns the vertical rhythm while FormField keeps each label and control together.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-md" @submit.prevent>
          <FormField>
            <Label for="form-full-name">Full name</Label>
            <Input id="form-full-name" v-model="fullName" autocomplete="name"/>
          </FormField>

          <FormField>
            <Label for="form-email">Email address</Label>
            <Input id="form-email" v-model="email" type="email" autocomplete="email"/>
            <p class="text-xs text-muted">
              Used for receipts and account notifications.
            </p>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Grouped Choices -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Grouped Choices
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Use FormField as a fieldset when the field is a set of radio buttons or checkboxes.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-md" @submit.prevent>
          <FormField as="fieldset">
            <Legend>Plan</Legend>
            <RadioGroup v-model="plan" name="plan">
              <RadioGroupItem value="starter">Starter</RadioGroupItem>
              <RadioGroupItem value="team">Team</RadioGroupItem>
              <RadioGroupItem value="enterprise">Enterprise</RadioGroupItem>
            </RadioGroup>
          </FormField>

          <FormField as="fieldset">
            <Legend>
              Interests
            </Legend>
            <CheckboxGroup v-model="interests" name="interests">
              <CheckboxGroupItem value="product">Product updates</CheckboxGroupItem>
              <CheckboxGroupItem value="security">Security alerts</CheckboxGroupItem>
              <CheckboxGroupItem value="billing">Billing notices</CheckboxGroupItem>
            </CheckboxGroup>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Complete Form -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Complete Form
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Actions live in the same form stack so spacing stays consistent with the fields above them.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-md" @submit.prevent>
          <FormField>
            <Label for="form-biography">Biography</Label>
            <Textarea id="form-biography" v-model="biography" auto-resize />
            <p class="text-xs text-muted">
              Keep it short enough to scan in a profile card.
            </p>
          </FormField>

          <div class="flex items-center justify-end gap-2 pt-1">
            <Button variant="ghost">Cancel</Button>
            <Button type="submit">Save profile</Button>
          </div>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
