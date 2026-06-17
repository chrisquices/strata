<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Field from '@ui/Field/Field.vue';
import FieldLabel from '@ui/Field/FieldLabel.vue';
import FieldInput from '@ui/Field/FieldInput.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const name = ref('');
const email = ref('ada@example.com');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Field</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A text input with a floating label that rises on focus or when filled.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Empty (label rests) and filled (label floats).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-64 flex-col gap-5" data-demo="basic">
          <Field>
            <FieldLabel for="f-name">Full name</FieldLabel>
            <FieldInput id="f-name" v-model="name" />
          </Field>
          <Field>
            <FieldLabel for="f-email">Email</FieldLabel>
            <FieldInput id="f-email" v-model="email" type="email" />
          </Field>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
