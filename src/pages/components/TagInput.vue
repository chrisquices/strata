<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import TagInput from '@ui/TagInput/TagInput.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const emptyTags = ref([]);
const tags = ref(['vue', 'tailwind']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Tag Input</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Enter a list of tags — type and press Enter or comma to add; Backspace or the ×
      removes.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Empty -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Empty</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Starts with no tags — type and press Enter or comma to add. Tags:
        {{ emptyTags.join(', ') || '—' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80">
          <TagInput v-model="emptyTags" placeholder="Add a tag…"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Populated -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Populated</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Seeded through v-model; Backspace or the × removes a tag. Tags:
        {{ tags.join(', ') || '—' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-80">
          <TagInput v-model="tags" placeholder="Add a tag…"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
