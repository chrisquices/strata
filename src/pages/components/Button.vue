<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import { ArrowRight, Plus, Trash2, Download, Check } from '@lucide/vue';

import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'];
const clicks = ref(0);
const inertClicks = ref(0);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>
    <!-- Title -->
    <ComponentHeaderTitle>Button</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Native button/anchor with variants, sizes, outline, icon-only, loading and link modes.
      No reka primitive — plain semantic elements.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
  <!-- Filled variants -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Filled variants</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Filled buttons use the variant color as the primary action surface.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button v-for="variant in variants" :key="variant" :variant="variant">{{ variant }}</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Outline variants -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Outline variants</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Outline buttons keep the background transparent while retaining variant borders and text.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button v-for="variant in variants" :key="variant" :variant="variant" outline>{{ variant }}</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Sizes -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Text and icon-only buttons share the same small, medium, and large control heights.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <Button size="sm" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-small" /></Button>
        <Button size="md" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-medium" /></Button>
        <Button size="lg" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-large" /></Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Radius -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Radius</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Radius can be squared down, rounded up, or made fully pill-shaped.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button radius="sm">Small</Button>
        <Button radius="md">Medium</Button>
        <Button radius="lg">Large</Button>
        <Button radius="full">Full</Button>
        <Button radius="full" icon aria-label="Confirm"><Check aria-hidden="true" class="size-icon-medium" /></Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- With icons -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>With icons</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Icons can sit before or after text, while icon-only buttons use an accessible label.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button>Continue <ArrowRight aria-hidden="true" class="size-icon-medium" /></Button>
        <Button variant="secondary"><Download aria-hidden="true" class="size-icon-medium" /> Download</Button>
        <Button variant="destructive"><Trash2 aria-hidden="true" class="size-icon-medium" /> Delete</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Loading -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Loading</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>
      Loading buttons stay focusable and announce busy; activation is suppressed without the disabled attribute. Click count: {{ clicks }} (real), {{ inertClicks }} (leaked while loading).
    </ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button loading @click="clicks++">Saving</Button>
        <Button variant="secondary" loading @click="clicks++">Loading</Button>
        <Button icon loading aria-label="Saving" @click="clicks++"></Button>
        <Button loading @click="inertClicks++">Guarded</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Disabled -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>Disabled buttons are visually muted and unavailable to pointer or keyboard activation.</ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button disabled>Disabled</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <Button variant="destructive" outline disabled>Disabled</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>

  <!-- Link -->
  <ComponentItemSection>
    <ComponentItemSectionTitle>Link</ComponentItemSectionTitle>
    <ComponentItemSectionDescription>
      With href, renders an anchor. A disabled or loading link drops its href and becomes inert.
    </ComponentItemSectionDescription>
    <ComponentItemSectionExample>
      <div class="flex flex-wrap items-center gap-4">
        <Button href="https://example.com" target="_blank" rel="noopener noreferrer">External <ArrowRight aria-hidden="true" class="size-icon-medium" /></Button>
        <Button href="https://example.com" disabled>Disabled link</Button>
        <Button href="https://example.com" loading>Loading link</Button>
      </div>
    </ComponentItemSectionExample>
  </ComponentItemSection>
  </ComponentContent>
</template>
