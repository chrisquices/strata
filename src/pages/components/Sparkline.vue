<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Sparkline from '@ui/Sparkline/Sparkline.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const up = [3, 5, 4, 8, 7, 10, 9, 13];
const down = [13, 11, 12, 8, 9, 6, 7, 4];
const wave = [5, 8, 6, 9, 5, 8, 6, 9, 5];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Sparkline</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A tiny inline trend chart (SVG) — tone variants, optional area fill, and an accessible label.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-6" data-demo="variants">
          <Sparkline :data="up" variant="success" label="Revenue trending up" />
          <Sparkline :data="down" variant="destructive" label="Errors trending down" />
          <Sparkline :data="wave" variant="warning" />
          <Sparkline :data="up" variant="muted" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Area fill</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-6" data-demo="fill">
          <Sparkline :data="up" variant="success" fill />
          <Sparkline :data="wave" variant="primary" fill />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
