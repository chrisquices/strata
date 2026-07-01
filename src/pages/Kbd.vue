<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import Kbd from '@ui/Kbd/Kbd.vue';
import KbdGroup from '@ui/Kbd/KbdGroup.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Kbd</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Keyboard key hints — a Kbd renders a single key; wrap several in a KbdGroup for a
      combo (nested kbd elements, the standard markup).
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>

    <!-- Single keys -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Single keys</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>A lone key is just a Kbd.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4">
          <Kbd>Esc</Kbd>
          <Kbd>Enter</Kbd>
          <Kbd label="Command">⌘</Kbd>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Combinations -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Combinations</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Wrap multiple Kbd keys in a KbdGroup.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-4">
          <KbdGroup><Kbd>Ctrl</Kbd><Kbd>K</Kbd></KbdGroup>
          <KbdGroup><Kbd label="Command">⌘</Kbd><Kbd>S</Kbd></KbdGroup>
          <KbdGroup><Kbd label="Shift">⇧</Kbd><Kbd label="Command">⌘</Kbd><Kbd>P</Kbd></KbdGroup>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
