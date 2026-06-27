<script setup lang="ts">
import ComponentContent from '@app/component/ComponentContent.vue';
import Spinner from '@ui/Spinner/Spinner.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Spinner</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A simple loading spinner that inherits the current text color.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Use the default spinner for most loading states, with small and large sizes available for tighter or more
        prominent layouts.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6 text-foreground">
          <Spinner size="sm"/>
          <Spinner/>
          <Spinner size="lg"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Variants -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The spinner inherits color by default, with the same optional semantic variants as Button.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6 text-foreground">
          <Spinner/>
          <Spinner variant="primary"/>
          <Spinner variant="secondary"/>
          <Spinner variant="ghost"/>
          <Spinner variant="destructive"/>
          <Spinner variant="success"/>
          <Spinner variant="warning"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
