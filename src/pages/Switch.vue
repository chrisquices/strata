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
const small = ref(true);
const medium = ref(true);
const large = ref(true);
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

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The track, thumb, and travel distance scale together across small, medium, and large.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6">
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch size="sm" v-model:checked="small" />
            Small
          </label>
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch size="md" v-model:checked="medium" />
            Medium
          </label>
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch size="lg" v-model:checked="large" />
            Large
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
