<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Select from '@ui/Select/Select.vue';
import SelectTrigger from '@ui/Select/SelectTrigger.vue';
import SelectContent from '@ui/Select/SelectContent.vue';
import SelectItem from '@ui/Select/SelectItem.vue';
import SelectGroup from '@ui/Select/SelectGroup.vue';
import SelectLabel from '@ui/Select/SelectLabel.vue';
import SelectSeparator from '@ui/Select/SelectSeparator.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const fruit = ref();
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Select</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A dropdown for choosing one option, with groups and separators. For search, use Combobox.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Basic — grouped options with a label and separator. Selected: {{ fruit ?? '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-56" data-demo="basic">
          <Select v-model="fruit" placeholder="Pick a fruit">
            <SelectTrigger />
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Berries</SelectLabel>
                <SelectItem value="strawberry" label="Strawberry" />
                <SelectItem value="blueberry" label="Blueberry" />
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Citrus</SelectLabel>
                <SelectItem value="orange" label="Orange" />
                <SelectItem value="lemon" label="Lemon" disabled />
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
