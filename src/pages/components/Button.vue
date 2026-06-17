<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { ArrowRight, Plus, Trash2, Download, Check } from '@lucide/vue';

import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'muted', 'destructive', 'success', 'warning'];
const clicks = ref(0);
const inertClicks = ref(0);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Button</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      Native button/anchor with variants, sizes, outline, icon-only, loading and link modes.
      No reka primitive — plain semantic elements.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Filled variants</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="filled">
          <Button v-for="v in variants" :key="v" :variant="v">{{ v }}</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Outline variants</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="outline">
          <Button v-for="v in variants" :key="v" :variant="v" outline>{{ v }}</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="sizes">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="sm" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-small" /></Button>
          <Button size="md" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-medium" /></Button>
          <Button size="lg" icon aria-label="Add"><Plus aria-hidden="true" class="size-icon-large" /></Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Radius</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="radius">
          <Button radius="sm">Small</Button>
          <Button radius="md">Medium</Button>
          <Button radius="lg">Large</Button>
          <Button radius="full">Full</Button>
          <Button radius="full" icon aria-label="Confirm"><Check aria-hidden="true" class="size-icon-medium" /></Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>With icons</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="with-icons">
          <Button>Continue <ArrowRight aria-hidden="true" class="size-icon-medium" /></Button>
          <Button variant="secondary"><Download aria-hidden="true" class="size-icon-medium" /> Download</Button>
          <Button variant="destructive"><Trash2 aria-hidden="true" class="size-icon-medium" /> Delete</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Loading</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Loading buttons stay focusable and announce busy; activation is suppressed without the disabled attribute. Click count: {{ clicks }} (real), {{ inertClicks }} (leaked while loading).
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="loading">
          <Button loading @click="clicks++">Saving</Button>
          <Button variant="secondary" loading @click="clicks++">Loading</Button>
          <Button icon loading aria-label="Saving" @click="clicks++"></Button>
          <Button data-demo-btn="loading-guard" loading @click="inertClicks++">Guarded</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="disabled">
          <Button disabled>Disabled</Button>
          <Button variant="secondary" disabled>Disabled</Button>
          <Button variant="destructive" outline disabled>Disabled</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Link</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        With href, renders an anchor. A disabled or loading link drops its href and becomes inert.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3" data-demo="link">
          <Button href="https://example.com" target="_blank" rel="noopener noreferrer">External <ArrowRight aria-hidden="true" class="size-icon-medium" /></Button>
          <Button href="https://example.com" disabled>Disabled link</Button>
          <Button href="https://example.com" loading>Loading link</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
