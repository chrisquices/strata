<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { Folder, FileText, Image } from '@lucide/vue';
import Tree from '@ui/Tree/Tree.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const data = [
  {
    id: 'src', label: 'src', icon: Folder, children: [
      { id: 'components', label: 'components', icon: Folder, defaultOpen: true, children: [
        { id: 'button', label: 'Button.vue', icon: FileText },
        { id: 'tree', label: 'Tree.vue', icon: FileText },
      ] },
      { id: 'assets', label: 'assets', icon: Folder, children: [
        { id: 'image', label: 'image.png', icon: Image },
      ] },
      { id: 'main', label: 'main.ts', icon: FileText },
    ],
  },
  { id: 'readme', label: 'README.md', icon: FileText },
];
const selected = ref('button');
const lastActivated = ref('—');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Tree</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A nested, expandable tree (e.g. a file explorer) with selection and an activate event.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Selected: {{ selected }} · Last activated: {{ lastActivated }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-xs rounded-large border border-border bg-background py-2" data-demo="tree">
          <Tree :data="data" v-model:selected-id="selected" @activate="node => (lastActivated = node.label)" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
