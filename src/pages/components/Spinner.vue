<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Spinner from '@ui/Spinner/Spinner.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Spinner</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A simple loading spinner (role="status") in three sizes; inherits the current text color.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex items-center gap-6 text-foreground" data-demo="sizes">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <span class="text-success"><Spinner /></span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
