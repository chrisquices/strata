<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {ref} from 'vue';
import {Folder, FileText, Image} from '@lucide/vue';
import Button from '@ui/Button/Button.vue';
import Tree from '@ui/Tree/Tree.vue';
import Card from '@ui/Card/Card.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const treeItems = [
  {
    id: 'source',
    label: 'source',
    icon: Folder,
    children: [
      {
        id: 'components',
        label: 'components',
        icon: Folder,
        defaultOpen: true,
        children: [
          {id: 'button', label: 'Button.vue', icon: FileText},
          {id: 'tree', label: 'Tree.vue', icon: FileText},
        ],
      },
      {
        id: 'assets',
        label: 'assets',
        icon: Folder,
        children: [
          {id: 'image', label: 'image.png', icon: Image},
        ],
      },
      {id: 'main', label: 'main.ts', icon: FileText},
    ],
  },
  {id: 'readme', label: 'README.md', icon: FileText},
];
const selectedTreeItemId = ref('button');
const lastActivatedNodeLabel = ref('none');
const expandedFolderIds = ref(['source', 'components']);

function activateNode(node) {
  lastActivatedNodeLabel.value = node.label;
}

function openAllFolders() {
  expandedFolderIds.value = ['source', 'components', 'assets'];
}

function resetFolders() {
  expandedFolderIds.value = ['source', 'components'];
}

function closeAllFolders() {
  expandedFolderIds.value = [];
}
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Tree</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A nested, expandable tree for file explorer interfaces with selection and an activate event.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Selected: {{ selectedTreeItemId }}. Last activated: {{ lastActivatedNodeLabel }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Card class="max-w-xs rounded-large border border-border bg-background py-2">
          <Tree
              v-model:selected-id="selectedTreeItemId"
              :data="treeItems"
              @activate="activateNode"
          />
        </Card>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Controlled expansion -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Controlled expansion</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Expanded folders are controlled with v-model:expanded-ids. Current folders:
        {{ expandedFolderIds.length ? expandedFolderIds.join(', ') : 'none' }}.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" @click="openAllFolders">
            Open all
          </Button>
          <Button variant="secondary" size="sm" @click="resetFolders">
            Reset
          </Button>
          <Button variant="secondary" size="sm" @click="closeAllFolders">
            Close all
          </Button>
        </div>
        <Card class="max-w-xs rounded-large border border-border bg-background py-2">
          <Tree
              v-model:expanded-ids="expandedFolderIds"
              :data="treeItems"
          />
        </Card>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
