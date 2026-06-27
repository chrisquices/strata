<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import {Search, AtSign} from '@lucide/vue';
import Form from '@ui/Form/Form.vue';
import FormField from '@ui/Form/FormField.vue';
import Input from '@ui/Input/Input.vue';
import InputGroup from '@ui/Input/InputGroup.vue';
import InputGroupAddon from '@ui/Input/InputGroupAddon.vue';
import Label from '@ui/Label/Label.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const text = ref('');
const password = ref('hunter2');
const passwordErrored = ref('wrongpass');
const email = ref('');
const errored = ref('not-an-email');
const site = ref('');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Input</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A single-line text field for the standard input types, with sizes, validation,
      password reveal/copy, and addon groups.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Default, small, and large sizes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Input v-model="text" placeholder="Search projects…"/>
            <Input v-model="text" size="sm" placeholder="Small"/>
            <Input v-model="text" size="lg" placeholder="Large"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Labelled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Labelled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Attributes like id/name reach the input, so labels associate correctly.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="email-field">Email address</Label>
            <Input id="email-field" name="email" type="email" v-model="email" placeholder="you@example.com"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Password -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Password</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Password — reveal and copy controls.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="password-field">Password</Label>
            <Input id="password-field" v-model="password" type="password" placeholder="Password"/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled and read-only -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled and read-only</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Disabled and read-only.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label disabled>Disabled</Label>
            <Input model-value="Can't touch this" disabled/>
          </FormField>
          <FormField>
            <Label>Read only</Label>
            <Input model-value="Read only" readonly/>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Invalid -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Invalid</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Invalid with an error message on hover/focus. Plain and password.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <Label for="error-email">Email</Label>
            <Input id="error-email" v-model="errored" type="email">Enter a valid email address</Input>
          </FormField>
          <FormField>
            <Label for="error-password">Password</Label>
            <Input id="error-password" v-model="passwordErrored" type="password">Incorrect password</Input>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Addon groups -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Addon groups</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Addon groups — leading icon, leading/trailing text, and grouped error
        forwarding.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Form class="max-w-sm">
          <FormField>
            <InputGroup>
              <InputGroupAddon>
                <Search class="size-icon-small"/>
              </InputGroupAddon>
              <Input v-model="site" placeholder="Search"/>
            </InputGroup>
          </FormField>
          <FormField>
            <InputGroup>
              <InputGroupAddon>https://</InputGroupAddon>
              <Input v-model="site" placeholder="example.com"/>
              <InputGroupAddon side="end">.dev</InputGroupAddon>
            </InputGroup>
          </FormField>
          <FormField>
            <Label for="group-email">Email</Label>
            <InputGroup size="sm">
              <InputGroupAddon>
                <AtSign class="size-icon-small"/>
              </InputGroupAddon>
              <Input id="group-email" v-model="email" placeholder="Small + invalid group">Enter a valid email</Input>
            </InputGroup>
          </FormField>
        </Form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

  </ComponentContent>
</template>
