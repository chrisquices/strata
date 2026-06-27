<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {Check} from '@lucide/vue';
import {ref} from 'vue';
import Chip from '@ui/Chip/Chip.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const variants = ['primary', 'secondary', 'ghost', 'destructive', 'success', 'warning'];
const tags = ref(['design', 'vue', 'frontend', 'kit']);
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>
      Chip
    </ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A compact tag — tone variants, filled or outline, with an optional remove button.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Filled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Filled
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Filled chips use the variant color as the tag background.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip v-for="variant in variants" :key="variant" :variant="variant">
            {{ variant }}
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Outline -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Outline
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Outline chips keep the surface clear while preserving the variant tone.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip v-for="variant in variants" :key="variant" :variant="variant" outline>
            {{ variant }}
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Sizes
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Size changes the chip height, padding, and text scale.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip variant="secondary" size="sm">
            Small
          </Chip>
          <Chip variant="secondary" size="md">
            Medium
          </Chip>
          <Chip variant="secondary" size="lg">
            Large
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Icon -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Icon
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Icon chips use a square shape with an accessible label for the icon-only control.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip icon aria-label="Approved">
            <Check aria-hidden="true" class="size-icon-medium"/>
          </Chip>
          <Chip icon variant="secondary" aria-label="Approved">
            <Check aria-hidden="true" class="size-icon-medium"/>
          </Chip>
          <Chip icon variant="destructive" aria-label="Remove">
            <Check aria-hidden="true" class="size-icon-medium"/>
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Radius -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Radius
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Small / medium / large, or full (pill), matching Button and Badge.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip variant="secondary" radius="sm">
            Small
          </Chip>
          <Chip variant="secondary" radius="md">
            Medium
          </Chip>
          <Chip variant="secondary" radius="lg">
            Large
          </Chip>
          <Chip variant="secondary" radius="full">
            Full
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Dismissible -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Dismissible
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        The remove button emits a dismiss event. Remaining: {{ tags.join(', ') || 'none' }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip
            v-for="(tag, index) in tags"
            :key="tag"
            variant="secondary"
            dismissible
            @dismiss="tags.splice(index, 1)"
          >
            {{ tag }}
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>
        Disabled
      </ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled chips are visually muted and unavailable to pointer or keyboard activation.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-2">
          <Chip variant="secondary" disabled>
            Disabled
          </Chip>
          <Chip variant="secondary" disabled dismissible>
            Disabled
          </Chip>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
