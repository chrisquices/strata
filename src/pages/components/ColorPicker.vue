<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import ColorPicker from '@ui/ColorPicker/ColorPicker.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const color = ref('#3b82f6');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Color Picker</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Saturation/brightness area + hue slider + hex field + preset swatches, built on reka's color primitives. <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code> is a hex string.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Chosen: <strong class="text-foreground tabular-nums">{{ color }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-start gap-6" data-demo="picker">
          <ColorPicker v-model="color" />
          <div class="size-16 rounded-large border border-border" :style="{ backgroundColor: color }" aria-hidden="true"></div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="disabled"><ColorPicker v-model="color" disabled /></div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
