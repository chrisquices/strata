<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import { ref } from 'vue';
import Select from '@ui/Select/Select.vue';
import SelectTrigger from '@ui/Select/SelectTrigger.vue';
import SelectContent from '@ui/Select/SelectContent.vue';
import SelectItem from '@ui/Select/SelectItem.vue';
import SelectGroup from '@ui/Select/SelectGroup.vue';
import SelectLabel from '@ui/Select/SelectLabel.vue';
import SelectSeparator from '@ui/Select/SelectSeparator.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const fruit = ref();
const preselectedFruit = ref('blueberry');
const disabledFruit = ref('orange');
const requiredFruit = ref();
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Select</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A dropdown for choosing one option, with groups and separators. For search, use Combobox.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Grouped options with a label and separator. Selected: {{ fruit ?? 'none' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <Select v-model="fruit">
            <SelectTrigger>
              Pick a fruit
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>
                  Berries
                </SelectLabel>
                <SelectItem value="strawberry">
                  Strawberry
                </SelectItem>
                <SelectItem value="blueberry">
                  Blueberry
                </SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>
                  Citrus
                </SelectLabel>
                <SelectItem value="orange">
                  Orange
                </SelectItem>
                <SelectItem value="lemon" disabled>
                  Lemon
                </SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Preselected -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Preselected</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A selected value renders its item text in the trigger on load. Selected: {{ preselectedFruit }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <Select v-model="preselectedFruit">
            <SelectTrigger>
              Pick a fruit
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strawberry">
                Strawberry
              </SelectItem>
              <SelectItem value="blueberry">
                Blueberry
              </SelectItem>
              <SelectItem value="orange">
                Orange
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disable the whole control when the value should remain visible but unavailable. Selected: {{ disabledFruit }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <Select v-model="disabledFruit" disabled>
            <SelectTrigger>
              Pick a fruit
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strawberry">
                Strawberry
              </SelectItem>
              <SelectItem value="blueberry">
                Blueberry
              </SelectItem>
              <SelectItem value="orange">
                Orange
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Form -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Form</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Name and required are forwarded to reka's hidden native select for form submission. Selected: {{ requiredFruit ?? 'none' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <Select v-model="requiredFruit" name="fruit" required>
            <SelectTrigger>
              Pick a fruit
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="strawberry">
                Strawberry
              </SelectItem>
              <SelectItem value="blueberry">
                Blueberry
              </SelectItem>
              <SelectItem value="orange">
                Orange
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
