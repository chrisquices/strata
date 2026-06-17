<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Listbox from '@ui/Listbox/Listbox.vue';
import ListboxItem from '@ui/Listbox/ListboxItem.vue';
import ListboxGroup from '@ui/Listbox/ListboxGroup.vue';
import ListboxGroupLabel from '@ui/Listbox/ListboxGroupLabel.vue';
import ListboxVirtualizer from '@ui/Listbox/ListboxVirtualizer.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const fruit = ref('cherry');
const toppings = ref<string[]>(['cheese', 'mushroom']);
const bigPick = ref('Item 42');
const bigList = Array.from({ length: 1000 }, (_, i) => `Item ${i + 1}`);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Listbox</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>An always-visible selectable list. Arrow keys, Home/End, and typeahead are built in; bind a single value or, with <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">multiple</code>, an array.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Single select. Chosen: <strong class="text-foreground">{{ fruit }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-64" data-demo="single">
          <Listbox v-model="fruit">
            <ListboxItem value="apple">Apple</ListboxItem>
            <ListboxItem value="banana">Banana</ListboxItem>
            <ListboxItem value="cherry">Cherry</ListboxItem>
            <ListboxItem value="durian" disabled>Durian (out of stock)</ListboxItem>
            <ListboxItem value="elderberry">Elderberry</ListboxItem>
          </Listbox>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Multi-select with groups. Chosen: <strong class="text-foreground">{{ toppings.join(', ') || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-64" data-demo="multiple">
          <Listbox v-model="toppings" multiple>
            <ListboxGroup>
              <ListboxGroupLabel>Vegetables</ListboxGroupLabel>
              <ListboxItem value="mushroom">Mushroom</ListboxItem>
              <ListboxItem value="onion">Onion</ListboxItem>
              <ListboxItem value="pepper">Pepper</ListboxItem>
            </ListboxGroup>
            <ListboxGroup>
              <ListboxGroupLabel>Extras</ListboxGroupLabel>
              <ListboxItem value="cheese">Extra cheese</ListboxItem>
              <ListboxItem value="bacon">Bacon</ListboxItem>
            </ListboxGroup>
          </Listbox>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Virtualized — 1,000 items, only the visible ones render. Chosen: <strong class="text-foreground">{{ bigPick }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-64" data-demo="virtual">
          <Listbox v-model="bigPick">
            <ListboxVirtualizer v-slot="{ option }" :options="bigList" :estimate-size="34">
              <ListboxItem :value="option">{{ option }}</ListboxItem>
            </ListboxVirtualizer>
          </Listbox>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
