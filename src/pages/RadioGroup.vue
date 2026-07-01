<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import RadioGroup from '@ui/RadioGroup/RadioGroup.vue';
import RadioGroupItem from '@ui/RadioGroup/RadioGroupItem.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const plan = ref('pro');
const size = ref('medium');
const billing = ref('annual');
const radioSmall = ref('a');
const radioMedium = ref('a');
const radioLarge = ref('a');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Radio Group</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A set of mutually exclusive options; arrow keys move between them.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Single selection, vertical by default — the third option is disabled. Selected: <strong class="text-foreground">{{ plan }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <RadioGroup v-model="plan" name="plan">
          <RadioGroupItem value="free">
            Free
          </RadioGroupItem>
          <RadioGroupItem value="pro">
            Pro
          </RadioGroupItem>
          <RadioGroupItem value="team" disabled>
            Team (coming soon)
          </RadioGroupItem>
        </RadioGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Horizontal -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Horizontal</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Horizontal orientation lays the options in a row and switches arrow keys to left and right. Selected: <strong class="text-foreground">{{ size }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <RadioGroup v-model="size" orientation="horizontal">
          <RadioGroupItem value="small">
            Small
          </RadioGroupItem>
          <RadioGroupItem value="medium">
            Medium
          </RadioGroupItem>
          <RadioGroupItem value="large">
            Large
          </RadioGroupItem>
        </RadioGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">size</code> per item to scale the control and its dot.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-start gap-10">
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-widest text-muted">Small</span>
            <RadioGroup v-model="radioSmall">
              <RadioGroupItem value="a" size="sm">Option A</RadioGroupItem>
              <RadioGroupItem value="b" size="sm">Option B</RadioGroupItem>
            </RadioGroup>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-widest text-muted">Medium</span>
            <RadioGroup v-model="radioMedium">
              <RadioGroupItem value="a" size="md">Option A</RadioGroupItem>
              <RadioGroupItem value="b" size="md">Option B</RadioGroupItem>
            </RadioGroup>
          </div>
          <div class="flex flex-col gap-2">
            <span class="text-xs uppercase tracking-widest text-muted">Large</span>
            <RadioGroup v-model="radioLarge">
              <RadioGroupItem value="a" size="lg">Option A</RadioGroupItem>
              <RadioGroupItem value="b" size="lg">Option B</RadioGroupItem>
            </RadioGroup>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Whole group disabled (set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">disabled</code> on the group). Pass <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">required</code> to demand a selection in a form, and <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">name</code> to submit the chosen value.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <RadioGroup v-model="billing" disabled>
          <RadioGroupItem value="monthly">
            Monthly
          </RadioGroupItem>
          <RadioGroupItem value="annual">
            Annual
          </RadioGroupItem>
        </RadioGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
