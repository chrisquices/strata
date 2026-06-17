<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Search, AtSign } from '@lucide/vue';
import Input from '@ui/Input/Input.vue';
import InputGroup from '@ui/Input/InputGroup.vue';
import InputGroupAddon from '@ui/Input/InputGroupAddon.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const text = ref('');
const pwd = ref('hunter2');
const pwdErr = ref('wrongpass');
const email = ref('');
const errored = ref('not-an-email');
const amount = ref('');
const site = ref('');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Input</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A single-line text field for the standard input types, with sizes, validation, password reveal/copy, and addon groups.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Default and small sizes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="sizes">
          <Input v-model="text" placeholder="Search projects…" />
          <Input v-model="text" size="sm" placeholder="Small" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Attributes like id/name reach the input, so labels associate correctly.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-2" data-demo="labelled">
          <label for="email-field" class="text-sm text-muted">Email address</label>
          <Input id="email-field" name="email" type="email" v-model="email" placeholder="you@example.com" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Password — reveal and copy controls.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-sm" data-demo="password">
          <Input v-model="pwd" type="password" placeholder="Password" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled and read-only.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="states">
          <Input model-value="Can't touch this" disabled />
          <Input model-value="Read only" readonly />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Invalid with an error message on hover/focus. Plain and password.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="error">
          <Input v-model="errored" type="email" error="Enter a valid email address" />
          <Input v-model="pwdErr" type="password" error="Incorrect password" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Addon groups — leading icon, leading/trailing text.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="group">
          <InputGroup>
            <InputGroupAddon><Search class="size-icon-small" /></InputGroupAddon>
            <Input v-model="site" placeholder="Search" />
          </InputGroup>
          <InputGroup>
            <InputGroupAddon>https://</InputGroupAddon>
            <Input v-model="site" placeholder="example.com" />
            <InputGroupAddon side="end">.dev</InputGroupAddon>
          </InputGroup>
          <InputGroup size="sm" invalid>
            <InputGroupAddon><AtSign class="size-icon-small" /></InputGroupAddon>
            <Input v-model="email" placeholder="Small + invalid group" />
          </InputGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
