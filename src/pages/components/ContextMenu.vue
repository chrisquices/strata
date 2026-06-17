<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Copy, Scissors, Trash2, Eye } from '@lucide/vue';

import ContextMenu from '@ui/ContextMenu/ContextMenu.vue';
import ContextMenuTrigger from '@ui/ContextMenu/ContextMenuTrigger.vue';
import ContextMenuContent from '@ui/ContextMenu/ContextMenuContent.vue';
import ContextMenuItem from '@ui/ContextMenu/ContextMenuItem.vue';
import ContextMenuCheckboxItem from '@ui/ContextMenu/ContextMenuCheckboxItem.vue';
import ContextMenuRadioGroup from '@ui/ContextMenu/ContextMenuRadioGroup.vue';
import ContextMenuRadioItem from '@ui/ContextMenu/ContextMenuRadioItem.vue';
import ContextMenuLabel from '@ui/ContextMenu/ContextMenuLabel.vue';
import ContextMenuSeparator from '@ui/ContextMenu/ContextMenuSeparator.vue';
import ContextMenuGroup from '@ui/ContextMenu/ContextMenuGroup.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const showGrid = ref(true);
const view = ref('list');
const lastAction = ref('—');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Context Menu</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A right-click menu built on reka — items, destructive items, checkbox and radio items, labels and separators.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Right-click target</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Last action: {{ lastAction }} · Grid: {{ showGrid }} · View: {{ view }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="menu">
          <ContextMenu>
            <ContextMenuTrigger as-child>
              <div class="grid h-32 place-items-center rounded-large border border-dashed border-border bg-surface text-sm text-muted select-none">
                Right-click here
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuLabel>Actions</ContextMenuLabel>
              <ContextMenuGroup>
                <ContextMenuItem :icon="Copy" @select="lastAction = 'copy'">Copy</ContextMenuItem>
                <ContextMenuItem :icon="Scissors" @select="lastAction = 'cut'">Cut</ContextMenuItem>
                <ContextMenuItem :icon="Trash2" destructive @select="lastAction = 'delete'">Delete</ContextMenuItem>
              </ContextMenuGroup>
              <ContextMenuSeparator />
              <ContextMenuCheckboxItem v-model="showGrid">Show grid</ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuRadioGroup v-model="view">
                <ContextMenuRadioItem value="list">List view</ContextMenuRadioItem>
                <ContextMenuRadioItem value="grid">Grid view</ContextMenuRadioItem>
              </ContextMenuRadioGroup>
            </ContextMenuContent>
          </ContextMenu>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
