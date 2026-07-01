<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import { ref } from 'vue';
import ColorPicker from '@ui/ColorPicker/ColorPicker.vue';
import Popover from '@ui/Popover/Popover.vue';
import PopoverTrigger from '@ui/Popover/PopoverTrigger.vue';
import PopoverContent from '@ui/Popover/PopoverContent.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';

const color = ref('#3b82f6');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Color Picker</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Saturation/brightness area + hue slider + hex field + preset swatches, built on reka's color primitives.
      <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">v-model</code>
      is a hex string.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Chosen: <strong class="text-foreground tabular-nums">{{ color }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-start gap-6">
          <ColorPicker v-model="color" />
          <div
              class="size-16 rounded-large border border-border"
              :style="{ backgroundColor: color }"
              aria-hidden="true"
          ></div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- With a trigger -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>With a trigger</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Compose with Popover for the swatch-button trigger pattern — the picker opens in a floating panel instead of sitting inline.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Popover>
          <PopoverTrigger as-child>
            <button
                class="size-control rounded-medium border border-border"
                :style="{ backgroundColor: color }"
                aria-label="Pick a color"
            ></button>
          </PopoverTrigger>
          <PopoverContent class="p-overlay-small">
            <ColorPicker v-model="color" />
          </PopoverContent>
        </Popover>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ColorPicker v-model="color" disabled />
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
