<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import {ref} from 'vue';

import Accordion from '@ui/Accordion/Accordion.vue';
import AccordionItem from '@ui/Accordion/AccordionItem.vue';
import AccordionHeader from '@ui/Accordion/AccordionHeader.vue';
import AccordionTrigger from '@ui/Accordion/AccordionTrigger.vue';
import AccordionContent from '@ui/Accordion/AccordionContent.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const faq = [
  {
    value: 'shipping',
    q: 'How long does shipping take?',
    a: 'Orders leave the warehouse within 24 hours and arrive in 3–5 business days for domestic addresses.'
  },
  {
    value: 'returns',
    q: 'What is the return policy?',
    a: 'Anything can come back within 30 days, unworn and in original packaging, for a full refund.'
  },
  {
    value: 'warranty',
    q: 'Is there a warranty?',
    a: 'Every product carries a two-year warranty covering manufacturing defects.'
  },
];

const multiOpen = ref(['returns', 'warranty']);
const controlled = ref(undefined);
</script>

<template>
  <ComponentLayout>
    <ComponentItemHeader>
      <ComponentItemHeaderTitle>Accordion</ComponentItemHeaderTitle>
      <ComponentItemHeaderDescription>
        Vertically stacked disclosure sections built on reka-ui — single or multiple
        open items, animated height, full keyboard navigation.
      </ComponentItemHeaderDescription>
    </ComponentItemHeader>

    <div class="flex flex-col gap-14">
      <ComponentItemSection>
        <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          Single mode, collapsible, one item open by default. Arrow keys, Home and End move focus between triggers.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion collapsible default-value="shipping" data-demo="default">
            <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
              <AccordionHeader>
                <AccordionTrigger>{{ item.q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ item.a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Multiple</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          Several items open at once. Model is an array — currently: {{
            multiOpen.length ? multiOpen.join(', ') : 'none'
          }}
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion v-model="multiOpen" type="multiple" data-demo="multiple">
            <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
              <AccordionHeader>
                <AccordionTrigger>{{ item.q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ item.a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Non-collapsible</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          Single mode with collapsible off — one section always stays open, and the open trigger carries aria-disabled.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion :collapsible="false" default-value="shipping" data-demo="non-collapsible">
            <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
              <AccordionHeader>
                <AccordionTrigger>{{ item.q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ item.a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          A single disabled item — skipped by pointer and keyboard while its neighbours stay interactive.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion data-demo="disabled-item">
            <AccordionItem value="shipping">
              <AccordionHeader>
                <AccordionTrigger>{{ faq[0].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[0].a }}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="returns" disabled>
              <AccordionHeader>
                <AccordionTrigger>{{ faq[1].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[1].a }}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="warranty">
              <AccordionHeader>
                <AccordionTrigger>{{ faq[2].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[2].a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Kept in the DOM</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          unmount-on-hide off at the root keeps closed content rendered (hidden), while the last item overrides back to
          unmounting.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion :unmount-on-hide="false" data-demo="keep-mounted">
            <AccordionItem :value="faq[0].value">
              <AccordionHeader>
                <AccordionTrigger>{{ faq[0].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[0].a }}</AccordionContent>
            </AccordionItem>
            <AccordionItem :value="faq[1].value">
              <AccordionHeader>
                <AccordionTrigger>{{ faq[1].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[1].a }}</AccordionContent>
            </AccordionItem>
            <AccordionItem :value="faq[2].value" :unmount-on-hide="true">
              <AccordionHeader>
                <AccordionTrigger>{{ faq[2].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[2].a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Controlled</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          Driven from outside through v-model; the root slot exposes the live model value.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="mb-4 flex flex-wrap items-center gap-2">
            <Button
                v-for="item in faq"
                :key="item.value"
                variant="secondary"
                size="sm"
                @click="controlled = item.value"
            >
              Open {{ item.value }}
            </Button>
            <Button
                variant="secondary"
                size="sm"
                @click="controlled = undefined"
            >
              Close all
            </Button>
          </div>
          <Accordion v-model="controlled" v-slot="{ modelValue }" data-demo="controlled">
            <AccordionItem v-for="item in faq" :key="item.value" :value="item.value">
              <AccordionHeader>
                <AccordionTrigger>{{ item.q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ item.a }}</AccordionContent>
            </AccordionItem>
            <p class="pt-3 font-mono text-[11px] text-faint">model: {{ modelValue ?? 'undefined' }}</p>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Heading level</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          AccordionHeader renders a real heading — level 2 here instead of the default 3.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <Accordion default-value="shipping" data-demo="heading-level">
            <AccordionItem :value="faq[0].value">
              <AccordionHeader :level="2">
                <AccordionTrigger>{{ faq[0].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[0].a }}</AccordionContent>
            </AccordionItem>
            <AccordionItem :value="faq[1].value">
              <AccordionHeader :level="2">
                <AccordionTrigger>{{ faq[1].q }}</AccordionTrigger>
              </AccordionHeader>
              <AccordionContent>{{ faq[1].a }}</AccordionContent>
            </AccordionItem>
          </Accordion>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Right-to-left</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          Mirroring comes from the DOM dir attribute on an ancestor — no component prop needed.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div dir="rtl">
            <Accordion default-value="one" data-demo="rtl">
              <AccordionItem value="one">
                <AccordionHeader>
                  <AccordionTrigger>כמה זמן לוקח המשלוח?</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>הזמנות יוצאות מהמחסן תוך 24 שעות ומגיעות בתוך 3–5 ימי עסקים.</AccordionContent>
              </AccordionItem>
              <AccordionItem value="two">
                <AccordionHeader>
                  <AccordionTrigger>מהי מדיניות ההחזרות?</AccordionTrigger>
                </AccordionHeader>
                <AccordionContent>ניתן להחזיר כל פריט תוך 30 יום, ללא שימוש ובאריזה המקורית.</AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>
    </div>
  </ComponentLayout>
</template>
