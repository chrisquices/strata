<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import {Layers} from '@lucide/vue';
import BrandMark from '@ui/BrandMark/BrandMark.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const logoSrc = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><rect width='24' height='24' rx='5' fill='%236aa'/></svg>";
</script>

<template>
  <ComponentLayout>
    <ComponentItemHeader>
      <ComponentItemHeaderTitle>Brand Mark</ComponentItemHeaderTitle>
      <ComponentItemHeaderDescription>
        A small sized, accessibly-labeled holder for a logo — renders an image, an icon, or custom slot content.
      </ComponentItemHeaderDescription>
    </ComponentItemHeader>

    <div class="flex flex-col gap-14">
      <ComponentItemSection>
        <ComponentItemSectionTitle>Icon</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>An icon component, sized sm / md / lg.</ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="flex items-center gap-6 text-foreground" data-demo="icon">
            <BrandMark :icon="Layers" size="sm"/>
            <BrandMark :icon="Layers" size="md"/>
            <BrandMark :icon="Layers" size="lg"/>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Labeled icon</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          With alt text, the icon becomes a labeled image for screen readers (role="img" + aria-label). Without alt it's
          decorative.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="flex items-center gap-6 text-foreground" data-demo="labeled">
            <BrandMark :icon="Layers" alt="Acme logo"/>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Image</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>A src renders an &lt;img&gt; with the alt applied directly.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="flex items-center gap-6" data-demo="image">
            <BrandMark :src="logoSrc" alt="Acme logo" size="lg"/>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Slot</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>Custom content (e.g. initials) when neither src nor icon is given.
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="flex items-center gap-6" data-demo="slot">
            <BrandMark size="lg">
              <span class="text-xs font-semibold text-foreground">BB</span>
            </BrandMark>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>
    </div>
  </ComponentLayout>
</template>
