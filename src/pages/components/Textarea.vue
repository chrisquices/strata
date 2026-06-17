<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Textarea from '@ui/Textarea/Textarea.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const bio = ref('');
const note = ref('');
const grow = ref('Type a few lines and watch the box grow to fit the content…');
const bad = ref('too short');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Textarea</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A multi-line text field with sizes via rows, validation, optional auto-grow, and label association.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Default, four rows.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-sm" data-demo="default">
          <Textarea v-model="note" placeholder="Leave a note…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Labelled — id/name reach the textarea, so the label associates.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-2" data-demo="labelled">
          <label for="bio-field" class="text-sm text-muted">Bio</label>
          <Textarea id="bio-field" name="bio" v-model="bio" rows="3" placeholder="A short bio…" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Auto-resize — grows with content.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-sm" data-demo="autoresize">
          <Textarea v-model="grow" auto-resize rows="2" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Disabled and read-only.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-full max-w-sm flex-col gap-3" data-demo="states">
          <Textarea model-value="Can't edit this" rows="2" disabled />
          <Textarea model-value="Read only content" rows="2" readonly />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Invalid with an error message on hover/focus.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full max-w-sm" data-demo="error">
          <Textarea v-model="bad" rows="3" error="Must be at least 20 characters" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
