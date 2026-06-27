<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import {ref} from 'vue';
import Form from '@ui/Form/Form.vue';
import FormField from '@ui/Form/FormField.vue';
import Label from '@ui/Label/Label.vue';
import Textarea from '@ui/Textarea/Textarea.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const biography = ref('');
const note = ref('');
const expandingText = ref('Type a few lines and watch the box grow to fit the content...');
const invalidValue = ref('too short');
const disabledText = ref('Cannot edit this');
const readonlyText = ref('Read only content');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Textarea</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A multi-line text field with sizes via rows, validation, optional auto-grow, and label association.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Default, four rows.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="note-field">Note</Label>
            <Textarea id="note-field" v-model="note"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Labelled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Labelled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Id and name reach the textarea, so the label associates.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="biography-field">Biography</Label>
            <Textarea id="biography-field" name="biography" v-model="biography" :rows="3"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Auto-resize -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Auto-resize</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Grows with content.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="expanding-text-field">Expanding text</Label>
            <Textarea id="expanding-text-field" v-model="expandingText" auto-resize :rows="2"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- States -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>States</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled and read-only.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="disabled-text-field" disabled>Disabled</Label>
            <Textarea id="disabled-text-field" v-model="disabledText" :rows="2" disabled/>
          </FormField>
          <FormField>
            <Label for="readonly-text-field">Read only</Label>
            <Textarea id="readonly-text-field" v-model="readonlyText" :rows="2" readonly/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Invalid -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Invalid</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Invalid with an error message on hover or focus.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="invalid-text-field">Message</Label>
            <Textarea id="invalid-text-field" v-model="invalidValue" :rows="3">
              Must be at least 20 characters.
            </Textarea>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
