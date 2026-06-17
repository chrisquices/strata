<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import TagInput from '@ui/TagInput/TagInput.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const emptyTags = ref([]);
const tags = ref(['vue', 'tailwind']);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Tag Input</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Enter a list of tags — type and press Enter or comma to add; Backspace or the × removes.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Empty. Tags: {{ emptyTags.join(', ') || '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80" data-demo="empty">
          <TagInput v-model="emptyTags" placeholder="Add a tag…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Populated. Tags: {{ tags.join(', ') || '—' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80" data-demo="populated">
          <TagInput v-model="tags" placeholder="Add a tag…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
