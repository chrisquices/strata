<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from '@lucide/vue';
import ToggleGroup from '@ui/ToggleGroup/ToggleGroup.vue';
import ToggleGroupItem from '@ui/ToggleGroup/ToggleGroupItem.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const align = ref('left');
const formats = ref(['bold']);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Toggle Group</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A grouped set of toggles — single choice (like a segmented control) or multiple.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Single — one active at a time. Alignment: {{ align }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="single">
          <ToggleGroup v-model="align" type="single">
            <ToggleGroupItem value="left" aria-label="Align left"><AlignLeft class="size-icon-small" /></ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center"><AlignCenter class="size-icon-small" /></ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right"><AlignRight class="size-icon-small" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Multiple — secondary variant. Active: {{ formats.join(', ') || '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="multiple">
          <ToggleGroup v-model="formats" type="multiple" variant="secondary">
            <ToggleGroupItem value="bold" aria-label="Bold"><Bold class="size-icon-small" /></ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic"><Italic class="size-icon-small" /></ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline"><Underline class="size-icon-small" /></ToggleGroupItem>
          </ToggleGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
