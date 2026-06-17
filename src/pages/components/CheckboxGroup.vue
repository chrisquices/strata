<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import CheckboxGroup from '@ui/CheckboxGroup/CheckboxGroup.vue';
import CheckboxGroupItem from '@ui/CheckboxGroup/CheckboxGroupItem.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const permissions = ref<string[]>(['read']);
const days = ref<string[]>([]);
const locked = ref<string[]>(['sync']);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Checkbox Group</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Related checkboxes sharing one v-model — an array of the checked values. Arrow keys move between items; <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">name</code> submits one value per check.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Vertical group. Selected: <strong class="text-foreground">{{ permissions.join(', ') || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="vertical">
          <CheckboxGroup v-model="permissions" name="permissions">
            <CheckboxGroupItem value="read">Can read</CheckboxGroupItem>
            <CheckboxGroupItem value="write">Can write</CheckboxGroupItem>
            <CheckboxGroupItem value="delete">Can delete</CheckboxGroupItem>
            <CheckboxGroupItem value="admin" disabled>Admin (locked)</CheckboxGroupItem>
          </CheckboxGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Horizontal orientation. Selected: <strong class="text-foreground">{{ days.join(', ') || 'none' }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="horizontal">
          <CheckboxGroup v-model="days" orientation="horizontal">
            <CheckboxGroupItem value="mon">Mon</CheckboxGroupItem>
            <CheckboxGroupItem value="tue">Tue</CheckboxGroupItem>
            <CheckboxGroupItem value="wed">Wed</CheckboxGroupItem>
            <CheckboxGroupItem value="thu">Thu</CheckboxGroupItem>
            <CheckboxGroupItem value="fri">Fri</CheckboxGroupItem>
          </CheckboxGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Whole group disabled (set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">disabled</code> on the group). Pass <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">required</code> to demand at least one in a form.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="disabled">
          <CheckboxGroup v-model="locked" disabled>
            <CheckboxGroupItem value="sync">Auto-sync</CheckboxGroupItem>
            <CheckboxGroupItem value="backup">Nightly backup</CheckboxGroupItem>
          </CheckboxGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
