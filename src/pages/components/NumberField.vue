<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import NumberField from '@ui/NumberField/NumberField.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const quantity = ref(1);
const price = ref(19.99);
const tax = ref(0.075);
const rating = ref(4.5);
const temperature = ref(-3.5);
const locked = ref(42);
const formQuantity = ref(2);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Number Field</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A numeric input with steppers. Arrow keys, Page Up/Down, Home/End, the mouse wheel, and press-and-hold all work; <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">formatOptions</code> formats currency, percent, or decimals. It's <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">w-full</code> by default — size it by constraining its container. Pass <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">aria-label</code> for an accessible name.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Bounded with a step. Value: <strong class="text-foreground">{{ quantity }}</strong> (min 1, max 10)
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-36">
          <NumberField v-model="quantity" :min="1" :max="10" aria-label="Quantity" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Currency -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Currency</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Currency formatting. Value: <strong class="text-foreground">{{ price }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-44">
          <NumberField v-model="price" :min="0" :step="0.5" :format-options="{ style: 'currency', currency: 'USD' }" locale="en-US" aria-label="Price" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Formats -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Formats</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Percent, fixed decimals, and negative values. Tax: <strong class="text-foreground">{{ tax }}</strong> · Rating: <strong class="text-foreground">{{ rating }}</strong> · Temp: <strong class="text-foreground">{{ temperature }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <div class="w-28">
            <NumberField v-model="tax" :min="0" :max="1" :step="0.005" :format-options="{ style: 'percent', minimumFractionDigits: 1 }" aria-label="Tax rate" />
          </div>
          <div class="w-28">
            <NumberField v-model="rating" :min="0" :max="5" :step="0.1" :format-options="{ minimumFractionDigits: 1, maximumFractionDigits: 1 }" size="sm" aria-label="Rating" />
          </div>
          <div class="w-32">
            <NumberField v-model="temperature" :min="-50" :max="50" :step="0.5" aria-label="Temperature" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Three sizes — <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">sm</code>, <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">md</code> (default), and <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">lg</code>.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <div class="w-36">
            <NumberField v-model="quantity" size="sm" aria-label="Small" />
          </div>
          <div class="w-36">
            <NumberField v-model="quantity" aria-label="Medium" />
          </div>
          <div class="w-36">
            <NumberField v-model="quantity" size="lg" aria-label="Large" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- States -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>States</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Read-only freezes the value; disabled removes all interaction.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <div class="w-36">
            <NumberField v-model="locked" readonly aria-label="Read-only" />
          </div>
          <div class="w-36">
            <NumberField v-model="locked" disabled aria-label="Disabled" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Form -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Form</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        In a form — <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">name</code> + <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">required</code> submit the numeric value.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <form class="w-40" @submit.prevent>
          <NumberField v-model="formQuantity" :min="1" name="quantity" required aria-label="Order quantity" />
        </form>
      </ComponentItemSectionExample>
    </ComponentItemSection>

  </ComponentContent>
</template>
