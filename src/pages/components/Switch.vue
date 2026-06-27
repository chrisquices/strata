<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import Switch from '@ui/Switch/Switch.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const wifi = ref(true);
const bluetooth = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Switch</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>A toggle for an on/off setting, with a sliding thumb.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- States -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>States</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>On, off, and disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4">
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch v-model:checked="wifi" />
            Wi-Fi
          </label>
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch v-model:checked="bluetooth" />
            Bluetooth
          </label>
          <label class="flex items-center gap-3 text-sm text-muted">
            <Switch :disabled="true" />
            Airplane mode (disabled)
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
