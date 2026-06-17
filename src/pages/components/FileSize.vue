<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import FileSize from '@ui/FileSize/FileSize.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sizes = [512, 2048, 2_576_384, 5_368_709_120];
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>File Size</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Formats a byte count into a human-readable size on a binary (1024) scale.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>short (default) and detailed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-2 text-sm" data-demo="basic">
          <div v-for="b in sizes" :key="b" class="flex justify-between gap-8">
            <FileSize :bytes="b" class="text-foreground" />
            <FileSize :bytes="b" variant="detailed" class="text-muted" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
