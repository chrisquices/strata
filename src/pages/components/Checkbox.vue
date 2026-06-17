<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Check, Minus } from '@lucide/vue';

import Checkbox from '@ui/Checkbox/Checkbox.vue';
import CheckboxIndicator from '@ui/Checkbox/CheckboxIndicator.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const a = ref(true);
const b = ref(false);
const c = ref('indeterminate');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Checkbox</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A two- or three-state checkbox built on reka — checked, unchecked, and indeterminate, with a hidden form input.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>States</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Checked: {{ a }} · Unchecked: {{ b }} · Mixed: {{ c }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6" data-demo="states">
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-slot="{ state }" v-model:checked="a">
              <CheckboxIndicator>
                <Minus v-if="state === 'indeterminate'" class="size-icon-small" />
                <Check v-else class="size-icon-small" />
              </CheckboxIndicator>
            </Checkbox>
            Checked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-slot="{ state }" v-model:checked="b">
              <CheckboxIndicator>
                <Minus v-if="state === 'indeterminate'" class="size-icon-small" />
                <Check v-else class="size-icon-small" />
              </CheckboxIndicator>
            </Checkbox>
            Unchecked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-foreground">
            <Checkbox v-slot="{ state }" v-model:checked="c">
              <CheckboxIndicator>
                <Minus v-if="state === 'indeterminate'" class="size-icon-small" />
                <Check v-else class="size-icon-small" />
              </CheckboxIndicator>
            </Checkbox>
            Indeterminate
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6" data-demo="disabled">
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <Checkbox disabled :default-checked="true">
              <CheckboxIndicator><Check class="size-icon-small" /></CheckboxIndicator>
            </Checkbox>
            Disabled checked
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-muted">
            <Checkbox disabled>
              <CheckboxIndicator><Check class="size-icon-small" /></CheckboxIndicator>
            </Checkbox>
            Disabled unchecked
          </label>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
