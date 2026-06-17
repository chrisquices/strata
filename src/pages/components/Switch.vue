<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Switch from '@ui/Switch/Switch.vue';
import SwitchThumb from '@ui/Switch/SwitchThumb.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const wifi = ref(true);
const bluetooth = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Switch</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A toggle for an on/off setting, with a sliding thumb.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>On, off, and disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4" data-demo="switches">
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch v-model:checked="wifi"><SwitchThumb /></Switch>
            Wi-Fi
          </label>
          <label class="flex items-center gap-3 text-sm text-foreground">
            <Switch v-model:checked="bluetooth"><SwitchThumb /></Switch>
            Bluetooth
          </label>
          <label class="flex items-center gap-3 text-sm text-muted">
            <Switch :disabled="true"><SwitchThumb /></Switch>
            Airplane mode (disabled)
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
