<script setup lang="ts">
// File-explorer-style tree built on reka's TreeRoot/TreeItem, which supply the
// tree/treeitem roles, ARIA state, roving focus, and keyboard navigation.
// `data`: nodes of { id, label, icon?, count?, children?, defaultOpen? }.
// v-model:selectedId tracks the selected node's id; @activate fires the node on select.
import { ref, computed } from 'vue';
import { TreeRoot } from 'reka-ui';
import TreeNode from './TreeNode.vue';

const props = defineProps({
  data: { type: Array, default: () => [] },
});
const selectedId = defineModel<string>('selectedId', { default: undefined });
const emit = defineEmits<{ activate: [node: any] }>();

const getKey = (node) => node.id;
// Normalize empty arrays to undefined so reka treats childless nodes as leaves
// (a `[]` is truthy, which would otherwise render a chevron that expands to nothing).
const getChildren = (node) => (node.children?.length ? node.children : undefined);

// reka selects whole item objects; the kit exposes the lighter `selectedId`.
const byId = computed(() => {
  const map = new Map();
  const walk = (nodes) => nodes.forEach((n) => { map.set(n.id, n); if (n.children) walk(n.children); });
  walk(props.data);
  return map;
});
const selectedModel = computed({
  get: () => (selectedId.value == null ? undefined : byId.value.get(selectedId.value)),
  set: (node) => { selectedId.value = node?.id; },
});

// Open the top level by default, plus any node flagged `defaultOpen`.
const expanded = ref([]);
const walkOpen = (nodes, depth) => nodes.forEach((n) => {
  if ((n.children?.length ?? 0) > 0 && (n.defaultOpen ?? depth === 0)) expanded.value.push(n.id);
  if (n.children) walkOpen(n.children, depth + 1);
});
walkOpen(props.data, 0);
</script>

<template>
  <TreeRoot
    v-slot="{ flattenItems }"
    v-model="selectedModel"
    v-model:expanded="expanded"
    :items="data"
    :get-key="getKey"
    :get-children="getChildren"
    selection-behavior="replace"
  >
    <TransitionGroup name="strata-tree-row" tag="div" class="flex flex-col">
      <TreeNode
        v-for="item in flattenItems"
        :key="item._id"
        :item="item"
        @activate="emit('activate', $event)"
      />
    </TransitionGroup>
  </TreeRoot>
</template>

<style>
.strata-tree-row-enter-active,
.strata-tree-row-leave-active {
  max-height: var(--spacing-control);
  overflow: hidden;
  transition:
    max-height var(--duration-base) ease-out,
    opacity var(--duration-base) ease-out,
    transform var(--duration-base) ease-out;
}

.strata-tree-row-enter-from,
.strata-tree-row-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-0.25rem);
}

.strata-tree-row-enter-to,
.strata-tree-row-leave-from {
  max-height: var(--spacing-control);
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .strata-tree-row-enter-active,
  .strata-tree-row-leave-active {
    transition: none;
  }
}
</style>
