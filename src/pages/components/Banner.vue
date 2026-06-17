<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Info, CircleCheck, TriangleAlert, CircleAlert } from '@lucide/vue';

import Banner from '@ui/Banner/Banner.vue';
import BannerIcon from '@ui/Banner/BannerIcon.vue';
import BannerContent from '@ui/Banner/BannerContent.vue';
import BannerTitle from '@ui/Banner/BannerTitle.vue';
import BannerDescription from '@ui/Banner/BannerDescription.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = [
  { variant: 'secondary', icon: Info, title: 'Heads up', desc: 'A neutral, informational message.' },
  { variant: 'success', icon: CircleCheck, title: 'Saved', desc: 'Your changes have been saved.' },
  { variant: 'warning', icon: TriangleAlert, title: 'Check your input', desc: 'Some fields need attention.' },
  { variant: 'destructive', icon: CircleAlert, title: 'Something went wrong', desc: 'We could not complete the request.' },
];

const dismissed = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Banner</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      An inline message strip — tone variants, an optional icon, and an optional dismiss button. Carries an aria live role.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-3" data-demo="variants">
          <Banner v-for="v in variants" :key="v.variant" :variant="v.variant">
            <BannerIcon><component :is="v.icon" class="size-icon-small" /></BannerIcon>
            <BannerContent>
              <BannerTitle>{{ v.title }}</BannerTitle>
              <BannerDescription>{{ v.desc }}</BannerDescription>
            </BannerContent>
          </Banner>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Dismissible</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The dismiss button emits a dismiss event. {{ dismissed ? 'Dismissed.' : '' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="dismissible">
          <Banner v-if="!dismissed" variant="secondary" dismissible @dismiss="dismissed = true">
            <BannerIcon><Info class="size-icon-small" /></BannerIcon>
            <BannerContent>
              <BannerTitle>Cookie notice</BannerTitle>
              <BannerDescription>We use cookies to improve your experience.</BannerDescription>
            </BannerContent>
          </Banner>
          <Button v-else variant="muted" size="sm" @click="dismissed = false">Restore</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
