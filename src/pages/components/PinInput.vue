<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import PinInput from '@ui/PinInput/PinInput.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const code = ref('');
const pin = ref('');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Pin Input</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A segmented one-time-code / PIN entry built on reka — one cell per character, with optional masking.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>One-time code</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>6 digits. Value: {{ code || '(empty)' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="otp">
          <PinInput v-model="code" :length="6" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Masked</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>4 cells, masked. Length: {{ pin.length }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="masked">
          <PinInput v-model="pin" :length="4" mask />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
