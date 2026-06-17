<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Bold, Italic, Underline, Share2 } from '@lucide/vue';
import Toolbar from '@ui/Toolbar/Toolbar.vue';
import ToolbarButton from '@ui/Toolbar/ToolbarButton.vue';
import ToolbarGroup from '@ui/Toolbar/ToolbarGroup.vue';
import ToolbarSeparator from '@ui/Toolbar/ToolbarSeparator.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const bold = ref(true);
const italic = ref(false);
const underline = ref(false);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Toolbar</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A container for grouped actions with roving focus — arrow keys move between controls.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

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
  </ComponentLayout>
</template>
