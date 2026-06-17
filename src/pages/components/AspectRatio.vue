<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import AspectRatio from '@ui/AspectRatio/AspectRatio.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const ratios = [
  { label: '16 / 9', value: '16 / 9' },
  { label: '4 / 3', value: '4 / 3' },
  { label: '1 / 1', value: '1 / 1' },
  { label: '21 / 9', value: '21 / 9' },
];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Aspect Ratio</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      Constrains content to a fixed width-to-height ratio using native CSS aspect-ratio. The child fills with size-full.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Common ratios</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>String ratios like "16 / 9".</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="grid grid-cols-2 gap-4" data-demo="ratios">
          <div v-for="r in ratios" :key="r.value" class="overflow-hidden rounded-large border border-border">
            <AspectRatio :ratio="r.value" :data-ratio="r.value">
              <div class="grid size-full place-items-center bg-surface text-sm text-faint">{{ r.label }}</div>
            </AspectRatio>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Numeric ratio</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A plain number works too — here 1.5 (3:2).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-xs overflow-hidden rounded-large border border-border" data-demo="numeric">
          <AspectRatio :ratio="1.5">
            <div class="grid size-full place-items-center bg-surface text-sm text-faint">1.5</div>
          </AspectRatio>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>With an image</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>An image fills the box with size-full + object-cover.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm overflow-hidden rounded-large border border-border" data-demo="image">
          <AspectRatio ratio="16 / 9">
            <img
              src="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='%23355'/><stop offset='1' stop-color='%23577'/></linearGradient></defs><rect width='160' height='90' fill='url(%23g)'/></svg>"
              alt="Gradient placeholder"
              class="size-full object-cover"
            />
          </AspectRatio>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
