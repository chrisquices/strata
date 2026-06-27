<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import EditableText from '@ui/EditableText/EditableText.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const title = ref('Untitled document');
const smallName = ref('Small field');
const mediumName = ref('Medium field');
const largeName = ref('Large field');
const locked = ref('Read-only title');
const draft = ref('');
const committed = ref('Project roadmap');
const lastSubmitted = ref('');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Editable Text</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Click to rename in place — Enter commits, Escape cancels, clicking away saves.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Value: {{ title }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <EditableText v-model="title" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Three control heights — small, medium, and large.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex w-72 flex-col gap-3">
          <EditableText v-model="smallName" size="sm" />
          <EditableText v-model="mediumName" size="md" />
          <EditableText v-model="largeName" size="lg" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Editing is blocked and the field is dimmed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <EditableText v-model="locked" disabled />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Empty -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Empty</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With no value, the placeholder shows in a muted tone.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <EditableText v-model="draft" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Submit -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Submit</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Commit with Enter or by clicking away. Last committed: {{ lastSubmitted || 'nothing yet' }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-72">
          <EditableText v-model="committed" @submit="lastSubmitted = $event" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
