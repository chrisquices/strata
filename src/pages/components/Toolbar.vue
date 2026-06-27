<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import { Bold, Italic, Underline, Share2 } from '@lucide/vue';
import Toolbar from '@ui/Toolbar/Toolbar.vue';
import ToolbarButton from '@ui/Toolbar/ToolbarButton.vue';
import ToolbarGroup from '@ui/Toolbar/ToolbarGroup.vue';
import ToolbarSeparator from '@ui/Toolbar/ToolbarSeparator.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const bold = ref(true);
const italic = ref(false);
const underline = ref(false);
</script>

<template>

  <ComponentHeader>
    <ComponentHeaderTitle>Toolbar</ComponentHeaderTitle>
    <ComponentHeaderDescription>A container for grouped actions with roving focus — arrow keys move between controls.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Toggle buttons (pressed state) and an action, with a separator.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="basic">
          <Toolbar>
            <ToolbarGroup>
              <ToolbarButton :pressed="bold" aria-label="Bold" @click="bold = !bold"><Bold class="size-icon-small" /></ToolbarButton>
              <ToolbarButton :pressed="italic" aria-label="Italic" @click="italic = !italic"><Italic class="size-icon-small" /></ToolbarButton>
              <ToolbarButton :pressed="underline" aria-label="Underline" @click="underline = !underline"><Underline class="size-icon-small" /></ToolbarButton>
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarButton><Share2 class="size-icon-small" /> Share</ToolbarButton>
          </Toolbar>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentContent>
</template>
