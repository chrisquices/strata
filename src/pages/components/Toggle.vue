<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Bold, Italic, Underline } from '@lucide/vue';
import Toggle from '@ui/Toggle/Toggle.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const bold = ref(false);
const italic = ref(true);
const underline = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Toggle</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A two-state button that stays pressed when on.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Default and outline variants. Bold: {{ bold }} · Italic: {{ italic }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-2" data-demo="basic">
          <Toggle v-model:pressed="bold" aria-label="Bold"><Bold class="size-icon-small" /></Toggle>
          <Toggle v-model:pressed="italic" variant="secondary" aria-label="Italic"><Italic class="size-icon-small" /></Toggle>
          <Toggle v-model:pressed="underline" aria-label="Underline"><Underline class="size-icon-small" /> Underline</Toggle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Small size.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-2" data-demo="sizes">
          <Toggle size="sm" aria-label="Bold"><Bold class="size-icon-extra-small" /></Toggle>
          <Toggle size="sm" variant="secondary">Draft</Toggle>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
