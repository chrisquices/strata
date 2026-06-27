<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import PinInput from '@ui/PinInput/PinInput.vue';
import PinInputCell from '@ui/PinInput/PinInputCell.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const code = ref('');
const masked = ref('');
const numeric = ref('');
const controlled = ref('');
const completed = ref('');
const completedMessage = ref('');

function onComplete(value) {
  completedMessage.value = value;
}
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Pin Input</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A segmented one-time-code / PIN entry built on reka — one cell per character, with optional masking.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- One-time code -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>One-time code</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>6 cells for a standard verification code. Value: {{ code || '(empty)' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput v-model="code">
          <PinInputCell v-for="index in 6" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- With separator -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>With separator</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Individual cells allow inserting visual separators between groups.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput>
          <PinInputCell :index="0" />
          <PinInputCell :index="1" />
          <PinInputCell :index="2" />
          <span class="flex items-center text-faint">—</span>
          <PinInputCell :index="3" />
          <PinInputCell :index="4" />
          <PinInputCell :index="5" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Masked -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Masked</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>4 cells with masking — entered characters are replaced with dots. Length: {{ masked.length }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput v-model="masked" mask>
          <PinInputCell v-for="index in 4" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Numeric -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Numeric</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Restricts input to digits only. Value: {{ numeric || '(empty)' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput v-model="numeric" type="number">
          <PinInputCell v-for="index in 4" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Placeholder -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Placeholder</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A custom placeholder character shown in empty cells.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput placeholder="○">
          <PinInputCell v-for="index in 6" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>All cells are inert — pointer and keyboard interaction are blocked.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput disabled>
          <PinInputCell v-for="index in 6" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Driven from outside through v-model. Current value: {{ controlled || '(empty)' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="mb-4 flex items-center gap-2">
          <Button variant="secondary" size="sm" @click="controlled = ''">Clear</Button>
        </div>
        <PinInput v-model="controlled">
          <PinInputCell v-for="index in 6" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Completion -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Completion</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The complete event fires when every cell is filled. {{ completedMessage ? 'Completed: ' + completedMessage : 'Fill all cells to trigger.' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <PinInput v-model="completed" @complete="onComplete">
          <PinInputCell v-for="index in 4" :key="index" :index="index - 1" />
        </PinInput>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
