<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import { Info, CircleCheck, TriangleAlert, CircleAlert } from '@lucide/vue';

import Banner from '@ui/Banner/Banner.vue';
import BannerIcon from '@ui/Banner/BannerIcon.vue';
import BannerContent from '@ui/Banner/BannerContent.vue';
import BannerTitle from '@ui/Banner/BannerTitle.vue';
import BannerDescription from '@ui/Banner/BannerDescription.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = [
  { variant: 'secondary', icon: Info, title: 'Heads up', description: 'A neutral, informational message.' },
  { variant: 'success', icon: CircleCheck, title: 'Saved', description: 'Your changes have been saved.' },
  { variant: 'warning', icon: TriangleAlert, title: 'Check your input', description: 'Some fields need attention.' },
  { variant: 'destructive', icon: CircleAlert, title: 'Something went wrong', description: 'We could not complete the request.' },
];

const dismissed = ref(false);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Banner</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      An inline message strip — tone variants, an optional icon, and an optional dismiss button. Carries an aria live role.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Variants -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Each variant pairs a tone, icon, title, and supporting message.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4">
          <Banner v-for="bannerVariant in variants" :key="bannerVariant.variant" :variant="bannerVariant.variant">
            <BannerIcon><component :is="bannerVariant.icon" class="size-icon-small" /></BannerIcon>
            <BannerContent>
              <BannerTitle>{{ bannerVariant.title }}</BannerTitle>
              <BannerDescription>{{ bannerVariant.description }}</BannerDescription>
            </BannerContent>
          </Banner>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Roles -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Roles</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Use alert for urgent messages, or none when the banner is purely visual.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4">
          <Banner variant="warning" role="alert">
            <BannerIcon><TriangleAlert class="size-icon-small" /></BannerIcon>
            <BannerContent>
              <BannerTitle>Session expires soon</BannerTitle>
              <BannerDescription>Save your work before continuing.</BannerDescription>
            </BannerContent>
          </Banner>
          <Banner role="none">
            <BannerIcon><Info class="size-icon-small" /></BannerIcon>
            <BannerContent>
              <BannerTitle as="p">Inline note</BannerTitle>
              <BannerDescription>This banner does not announce itself as live content.</BannerDescription>
            </BannerContent>
          </Banner>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Dismissible -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Dismissible</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The dismiss button emits a dismiss event. {{ dismissed ? 'Dismissed.' : '' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Banner
            v-if="!dismissed"
            variant="secondary"
            dismissible
            dismiss-label="Dismiss cookie notice"
            @dismiss="dismissed = true"
        >
          <BannerIcon><Info class="size-icon-small" /></BannerIcon>
          <BannerContent>
            <BannerTitle>Cookie notice</BannerTitle>
            <BannerDescription>We use cookies to improve your experience.</BannerDescription>
          </BannerContent>
        </Banner>
        <Button v-else variant="ghost" size="sm" @click="dismissed = false">Restore</Button>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
