<script setup lang="ts">
import {computed} from 'vue';
import {ChevronRight} from '@lucide/vue';
import {TreeItem} from 'reka-ui';

defineOptions({name: 'TreeNode'});

const props = defineProps({
  item: {type: Object, required: true},
});
const emit = defineEmits<{ activate: [node: unknown] }>();

const node = computed(function () {
  return props.item.value;
});
const paddingLeft = computed(function () {
  return `${0.75 + (props.item.level - 1) * 1.25}rem`;
});

function activateNode() {
  emit('activate', node.value);
}
</script>

<template>
  <TreeItem
      v-bind="item.bind"
      :style="{ paddingLeft }"
      class="group relative flex h-control cursor-pointer select-none items-center gap-2 pr-4 text-sm text-muted outline-none transition-colors hover:bg-surface/60 hover:text-foreground data-[selected]:bg-surface data-[selected]:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/30"
      @select="activateNode"
  >
    <span
        v-for="depthLineIndex in item.level - 1"
        :key="depthLineIndex"
        aria-hidden="true"
        class="absolute inset-y-0 w-px bg-border/60"
        :style="{ left: `${1.1875 + (depthLineIndex - 1) * 1.25}rem` }"
    ></span>

    <ChevronRight
        v-if="item.hasChildren"
        aria-hidden="true"
        class="size-icon-small shrink-0 text-faint transition-transform duration-200 group-data-[expanded]:rotate-90"
    />
    <span v-else class="size-icon-small shrink-0" aria-hidden="true"></span>

    <component :is="node.icon" v-if="node.icon"
               class="size-icon-medium shrink-0 text-faint group-data-[selected]:text-foreground"/>
    <span class="flex-1 truncate">{{ node.label }}</span>
    <span v-if="node.count !== undefined" class="shrink-0 text-xs text-faint">{{ node.count }}</span>

    <span class="absolute inset-y-0 right-0 w-0.5 bg-foreground opacity-0 group-data-[selected]:opacity-100"
          aria-hidden="true"></span>
  </TreeItem>
</template>
