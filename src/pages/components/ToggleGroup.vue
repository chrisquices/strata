<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import { AlignLeft, AlignCenter, AlignRight, Bold, Italic, Underline } from '@lucide/vue';
import ToggleGroup from '@ui/ToggleGroup/ToggleGroup.vue';
import ToggleGroupItem from '@ui/ToggleGroup/ToggleGroupItem.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const alignment = ref('left');
const formats = ref(['bold']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Toggle Group</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A grouped set of toggles — single choice (like a segmented control) or multiple.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Single -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Single</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Single mode keeps one active item at a time. Alignment: {{ alignment }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ToggleGroup v-model="alignment" type="single">
          <ToggleGroupItem value="left" aria-label="Align left">
            <AlignLeft class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="center" aria-label="Align center">
            <AlignCenter class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="right" aria-label="Align right">
            <AlignRight class="size-icon-small" />
          </ToggleGroupItem>
        </ToggleGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Multiple -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Multiple</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Multiple mode supports several active items at once. Active: {{ formats.join(', ') || '—' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ToggleGroup v-model="formats" type="multiple" variant="secondary">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline class="size-icon-small" />
          </ToggleGroupItem>
        </ToggleGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Group size controls the shared height and passes matching spacing to each item.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" default-value="left" size="sm">
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft class="size-icon-extra-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <AlignCenter class="size-icon-extra-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight class="size-icon-extra-small" />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" default-value="center" size="lg">
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft class="size-icon-medium" />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <AlignCenter class="size-icon-medium" />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight class="size-icon-medium" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Borderless -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Borderless</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Borderless groups remove the surrounding frame while preserving item focus and pressed styles.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <ToggleGroup type="single" default-value="bold" :bordered="false">
          <ToggleGroupItem value="bold" aria-label="Bold">
            <Bold class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="italic" aria-label="Italic">
            <Italic class="size-icon-small" />
          </ToggleGroupItem>
          <ToggleGroupItem value="underline" aria-label="Underline">
            <Underline class="size-icon-small" />
          </ToggleGroupItem>
        </ToggleGroup>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled can apply to the whole group or to individual items inside an otherwise active group.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-3">
          <ToggleGroup type="single" default-value="center" disabled>
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft class="size-icon-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align center">
              <AlignCenter class="size-icon-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight class="size-icon-small" />
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="multiple" :default-value="['bold']" variant="secondary">
            <ToggleGroupItem value="bold" aria-label="Bold">
              <Bold class="size-icon-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="italic" aria-label="Italic" disabled>
              <Italic class="size-icon-small" />
            </ToggleGroupItem>
            <ToggleGroupItem value="underline" aria-label="Underline">
              <Underline class="size-icon-small" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
