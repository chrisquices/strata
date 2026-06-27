<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';

import Accordion from '@ui/Accordion/Accordion.vue';
import AccordionItem from '@ui/Accordion/AccordionItem.vue';
import AccordionTrigger from '@ui/Accordion/AccordionTrigger.vue';
import AccordionContent from '@ui/Accordion/AccordionContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const faq = [
  {
    value: 'shipping',
    question: 'How long does shipping take?',
    answer: 'Orders leave the warehouse within 24 hours and arrive in 3–5 business days for domestic addresses.'
  },
  {
    value: 'returns',
    question: 'What is the return policy?',
    answer: 'Anything can come back within 30 days, unworn and in original packaging, for a full refund.'
  },
  {
    value: 'warranty',
    question: 'Is there a warranty?',
    answer: 'Every product carries a two-year warranty covering manufacturing defects.'
  },
];

const multiOpen = ref(['returns', 'warranty']);
const controlled = ref(undefined);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Accordion</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Vertically stacked disclosure sections built on reka-ui — single or multiple
      open items, animated height, full keyboard navigation.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Single mode, collapsible, one item open by default. Arrow keys, Home and End move focus between triggers.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion collapsible default-value="shipping">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.question }}</AccordionTrigger>
            <AccordionContent>{{ item.answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Multiple -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Multiple</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Several items open at once. Model is an array — currently: {{
          multiOpen.length ? multiOpen.join(', ') : 'none'
        }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion v-model="multiOpen" type="multiple">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.question }}</AccordionTrigger>
            <AccordionContent>{{ item.answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Non-collapsible -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Non-collapsible</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Single mode with collapsible off — one section always stays open, and the open trigger carries aria-disabled.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion :collapsible="false" default-value="shipping">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.question }}</AccordionTrigger>
            <AccordionContent>{{ item.answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A single disabled item — skipped by pointer and keyboard while its neighbours stay interactive.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion>
          <AccordionItem value="shipping">
            <AccordionTrigger>{{ faq[0].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[0].answer }}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="returns" disabled>
            <AccordionTrigger>{{ faq[1].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[1].answer }}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="warranty">
            <AccordionTrigger>{{ faq[2].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[2].answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Kept in the DOM -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Kept in the DOM</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        unmount-on-hide off at the root keeps closed content rendered (hidden), while the last item overrides back to
        unmounting.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion :unmount-on-hide="false">
          <AccordionItem :value="faq[0].value">
            <AccordionTrigger>{{ faq[0].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[0].answer }}</AccordionContent>
          </AccordionItem>
          <AccordionItem :value="faq[1].value">
            <AccordionTrigger>{{ faq[1].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[1].answer }}</AccordionContent>
          </AccordionItem>
          <AccordionItem :value="faq[2].value" :unmount-on-hide="true">
            <AccordionTrigger>{{ faq[2].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[2].answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Driven from outside through v-model; the root slot exposes the live model value.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <Button v-for="item in faq" :key="item.value" variant="secondary" size="sm" @click="controlled = item.value">
            Open {{ item.value }}
          </Button>
          <Button variant="secondary" size="sm" @click="controlled = undefined">
            Close all
          </Button>
        </div>
        <Accordion v-model="controlled" v-slot="{ modelValue }">
          <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
            <AccordionTrigger>{{ item.question }}</AccordionTrigger>
            <AccordionContent>{{ item.answer }}</AccordionContent>
          </AccordionItem>
          <p class="pt-3 font-mono text-[11px] text-faint">model: {{ modelValue ?? 'undefined' }}</p>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Heading level -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Heading level</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        AccordionTrigger renders a real heading around the button — level 2 here instead of the default 3.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Accordion default-value="shipping">
          <AccordionItem :value="faq[0].value">
            <AccordionTrigger :level="2">{{ faq[0].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[0].answer }}</AccordionContent>
          </AccordionItem>
          <AccordionItem :value="faq[1].value">
            <AccordionTrigger :level="2">{{ faq[1].question }}</AccordionTrigger>
            <AccordionContent>{{ faq[1].answer }}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Right-to-left -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Right-to-left</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Mirroring comes from the DOM dir attribute on an ancestor — no component prop needed.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div dir="rtl">
          <Accordion default-value="one">
            <AccordionItem value="one">
              <AccordionTrigger>כמה זמן לוקח המשלוח?</AccordionTrigger>
              <AccordionContent>הזמנות יוצאות מהמחסן תוך 24 שעות ומגיעות בתוך 3–5 ימי עסקים.</AccordionContent>
            </AccordionItem>
            <AccordionItem value="two">
              <AccordionTrigger>מהי מדיניות ההחזרות?</AccordionTrigger>
              <AccordionContent>ניתן להחזיר כל פריט תוך 30 יום, ללא שימוש ובאריזה המקורית.</AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>

</template>
