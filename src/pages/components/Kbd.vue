<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Kbd from '@ui/Kbd/Kbd.vue';
import KbdItem from '@ui/Kbd/KbdItem.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Kbd</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      Keyboard key hints — a Kbd group wraps one or more KbdItem keys (nested kbd elements, the standard markup for combos).
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Single keys</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4" data-demo="single">
          <Kbd><KbdItem>Esc</KbdItem></Kbd>
          <Kbd><KbdItem>Enter</KbdItem></Kbd>
          <Kbd><KbdItem label="Command">⌘</KbdItem></Kbd>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Combinations</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Multiple keys in one Kbd group.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-4" data-demo="combo">
          <Kbd><KbdItem>Ctrl</KbdItem><KbdItem>K</KbdItem></Kbd>
          <Kbd><KbdItem label="Command">⌘</KbdItem><KbdItem>S</KbdItem></Kbd>
          <Kbd><KbdItem label="Shift">⇧</KbdItem><KbdItem label="Command">⌘</KbdItem><KbdItem>P</KbdItem></Kbd>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
