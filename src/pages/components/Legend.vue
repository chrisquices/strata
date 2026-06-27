<script setup lang="ts">
import { ref } from 'vue';

import ComponentContent from '@app/component/ComponentContent.vue';
import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import CheckboxGroup from '@ui/CheckboxGroup/CheckboxGroup.vue';
import CheckboxGroupItem from '@ui/CheckboxGroup/CheckboxGroupItem.vue';
import FormField from '@ui/Form/FormField.vue';
import Legend from '@ui/Legend/Legend.vue';
import RadioGroup from '@ui/RadioGroup/RadioGroup.vue';
import RadioGroupItem from '@ui/RadioGroup/RadioGroupItem.vue';

const plan = ref('team');
const notifications = ref(['product']);
const access = ref('viewer');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>
      Legend
    </ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A native fieldset legend for labeling grouped controls such as radio groups and checkbox groups.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Radio Group -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Radio Group
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Use Legend when one question is answered by a set of mutually exclusive options.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <FormField as="fieldset">
          <Legend>
            Plan
          </Legend>
          <RadioGroup v-model="plan" name="legend-plan">
            <RadioGroupItem value="starter">Starter</RadioGroupItem>
            <RadioGroupItem value="team">Team</RadioGroupItem>
            <RadioGroupItem value="enterprise">Enterprise</RadioGroupItem>
          </RadioGroup>
        </FormField>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Checkbox Group -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Checkbox Group
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The legend names the group while each checkbox item still carries its own visible option label.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <FormField as="fieldset">
          <Legend>
            Notifications
          </Legend>
          <CheckboxGroup v-model="notifications" name="legend-notifications">
            <CheckboxGroupItem value="product">Product updates</CheckboxGroupItem>
            <CheckboxGroupItem value="security">Security alerts</CheckboxGroupItem>
            <CheckboxGroupItem value="billing">Billing notices</CheckboxGroupItem>
          </CheckboxGroup>
        </FormField>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Disabled
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled legends use the same muted treatment as disabled labels.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <FormField as="fieldset">
          <Legend disabled>
            Workspace access
          </Legend>
          <RadioGroup v-model="access" name="legend-access" disabled>
            <RadioGroupItem value="viewer">Viewer</RadioGroupItem>
            <RadioGroupItem value="editor">Editor</RadioGroupItem>
          </RadioGroup>
        </FormField>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
