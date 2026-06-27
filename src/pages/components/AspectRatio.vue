<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import AspectRatio from '@ui/AspectRatio/AspectRatio.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const ratios = [
  {label: '16/9', value: '16/9'},
  {label: '4/3', value: '4/3'},
  {label: '1/1', value: '1/1'},
  {label: '21/9', value: '21/9'},
];
const imageSource = './assets/img-1920x1080.png';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Aspect Ratio</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Constrains content to a fixed width-to-height ratio using native CSS aspect-ratio.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- Common ratios -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Common ratios</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>String ratios like "16/9".</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="grid grid-cols-2 gap-4">
          <div v-for="ratio in ratios" :key="ratio.value" class="overflow-hidden rounded-large border border-border">
            <AspectRatio :ratio="ratio.value">
              <div class="grid size-full place-items-center bg-surface text-sm text-faint">{{ ratio.label }}</div>
            </AspectRatio>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Numeric ratio -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Numeric ratio</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A plain number works too — here 1.5 (3:2).</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-xs overflow-hidden rounded-large border border-border">
          <AspectRatio :ratio="1.5">
            <div class="grid size-full place-items-center bg-surface text-sm text-faint">1.5</div>
          </AspectRatio>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- With an image -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>With an image</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>An image fills the box with size-full + object-cover.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-sm overflow-hidden rounded-large border border-border">
          <AspectRatio ratio="16/9">
            <img
                :src="imageSource"
                alt="Sample landscape"
                class="size-full object-cover"
            />
          </AspectRatio>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>

</template>
