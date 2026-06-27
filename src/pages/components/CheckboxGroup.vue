<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import CheckboxGroup from '@ui/CheckboxGroup/CheckboxGroup.vue';
import CheckboxGroupItem from '@ui/CheckboxGroup/CheckboxGroupItem.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const permissions = ref<string[]>(['read']);
const days = ref<string[]>([]);
const locked = ref<string[]>(['sync']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Checkbox Group</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Related checkboxes sharing one v-model — an array of the checked values. Arrow keys move between items; <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">name</code> submits one value per check.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Vertical -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Vertical</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Vertical group. Selected: <strong class="text-foreground">{{ permissions.join(', ') || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <CheckboxGroup v-model="permissions" name="permissions">
          <CheckboxGroupItem value="read">
            Can read
          </CheckboxGroupItem>
          <CheckboxGroupItem value="write">
            Can write
          </CheckboxGroupItem>
          <CheckboxGroupItem value="delete">
            Can delete
          </CheckboxGroupItem>
          <CheckboxGroupItem value="admin" disabled>
            Admin (locked)
          </CheckboxGroupItem>
        </CheckboxGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Horizontal -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Horizontal</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Horizontal orientation. Selected: <strong class="text-foreground">{{ days.join(', ') || 'none' }}</strong>
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <CheckboxGroup v-model="days" orientation="horizontal">
          <CheckboxGroupItem value="monday">
            Monday
          </CheckboxGroupItem>
          <CheckboxGroupItem value="tuesday">
            Tuesday
          </CheckboxGroupItem>
          <CheckboxGroupItem value="wednesday">
            Wednesday
          </CheckboxGroupItem>
          <CheckboxGroupItem value="thursday">
            Thursday
          </CheckboxGroupItem>
          <CheckboxGroupItem value="friday">
            Friday
          </CheckboxGroupItem>
        </CheckboxGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Whole group disabled (set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">disabled</code> on the group). Pass <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">required</code> to demand at least one in a form.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <CheckboxGroup v-model="locked" disabled>
          <CheckboxGroupItem value="sync">
            Auto-sync
          </CheckboxGroupItem>
          <CheckboxGroupItem value="backup">
            Nightly backup
          </CheckboxGroupItem>
        </CheckboxGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
