<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref, shallowRef} from 'vue';
import {
  VirtualizationEngine,
  gridLayout,
} from '@deps/strata/utils/virtualization-engine/virtualization-engine.js';
import ComponentLayout from '@app/component/ComponentLayout.vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import Card from '@ui/Card/Card.vue';
import CardContent from '@ui/Card/CardContent.vue';
import CardDescription from '@ui/Card/CardDescription.vue';
import CardHeader from '@ui/Card/CardHeader.vue';
import CardTitle from '@ui/Card/CardTitle.vue';
import Grid from '@ui/Grid/Grid.vue';
import GridItem from '@ui/Grid/GridItem.vue';
import GridItemContent from '@ui/Grid/GridItemContent.vue';
import GridItemLabel from '@ui/Grid/GridItemLabel.vue';
import GridItemOverlay from '@ui/Grid/GridItemOverlay.vue';
import Label from '@ui/Label/Label.vue';
import Slider from '@ui/Slider/Slider.vue';

type VirtualItem = Readonly<{
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}>;

const media = [
  './assets/img-1080x1080.png',
  './assets/img-1080x1920.png',
  './assets/img-1920x1080.png',
] as const;

const ITEM_COUNT = 10_000;

const scroller = ref<HTMLElement | null>(null);
const itemSize = ref(11);
const totalSize = ref(0);
const virtualItems = shallowRef<readonly VirtualItem[]>([]);
const stats = shallowRef({
  layoutName: 'grid',
  visibleCount: 0,
  columns: 1,
  itemWidth: 0,
  itemHeight: 0,
  firstIndex: 0,
});

let engine: VirtualizationEngine | undefined;

function createLayout(size = itemSize.value) {
  return gridLayout({
    minItemWidth: `${size}rem`,
    aspectRatio: 1,
    gap: 'gap-2',
  });
}

let pendingSize: number | null = null;
let layoutFrame: number | null = null;

function updateItemSize(size: number) {
  // Coalesce a fast slider drag into one anchored relayout per frame.
  pendingSize = size;
  if (layoutFrame !== null) return;
  layoutFrame = requestAnimationFrame(() => {
    layoutFrame = null;
    if (pendingSize !== null) engine?.setLayout(createLayout(pendingSize));
  });
}

onMounted(() => {
  const scrollElement = scroller.value;
  if (!scrollElement) return;

  engine = new VirtualizationEngine({
    scrollElement,
    count: ITEM_COUNT,
    layout: createLayout(),
    overscan: 2,
    onChange: (state) => {
      totalSize.value = state.totalSize;
      virtualItems.value = state.virtualItems;
      stats.value = state.stats;
    },
  });
});

onBeforeUnmount(() => {
  if (layoutFrame !== null) cancelAnimationFrame(layoutFrame);
  engine?.destroy();
});

function itemStyle(item: VirtualItem) {
  return {
    transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
    width: `${item.width}px`,
    height: `${item.height}px`,
  };
}
</script>

<template>
  <ComponentLayout>
    <ComponentItemHeader>
      <ComponentItemHeaderTitle>Virtualization Engine</ComponentItemHeaderTitle>
      <ComponentItemHeaderDescription>
        A headless windowing engine rendering {{ ITEM_COUNT.toLocaleString() }} media cells with a
        bounded DOM. Resize cells without mounting every item.
      </ComponentItemHeaderDescription>
    </ComponentItemHeader>

    <div class="flex flex-col gap-8">
      <Card>
        <CardContent>
          <div class="flex flex-col gap-2">
            <Label for="virtualization-size">Item width · {{ itemSize }}rem</Label>
            <Slider
                id="virtualization-size"
                v-model="itemSize"
                :min="7"
                :max="17.5"
                :step="0.5"
                @update:model-value="updateItemSize"
            />
          </div>
        </CardContent>
      </Card>

      <Card class="overflow-hidden bg-background shadow-panel">

        <CardHeader class="border-b border-border bg-surface">
          <CardTitle>{{ ITEM_COUNT.toLocaleString() }} items</CardTitle>
          <CardDescription>
            Only {{ stats.visibleCount }} are currently rendered
          </CardDescription>
          <CardDescription>
            <div class="flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-faint">
              <span>{{ stats.layoutName }}</span>
              <span>{{ stats.columns }} col</span>
              <span>{{ Math.round(stats.itemWidth) }} × {{ stats.itemHeight }}px</span>
              <span>first {{ stats.firstIndex.toLocaleString() }}</span>
            </div>
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div ref="scroller" class="h-128 overflow-auto">
            <Grid virtualized :style="{ height: `${totalSize}px` }">
              <GridItem
                  v-for="item in virtualItems"
                  :key="item.index"
                  :style="itemStyle(item)"
              >
                <GridItemContent type="image" :src="media[item.index % media.length]"/>

                <GridItemOverlay>
                  <span class="absolute right-2 top-2 rounded-2xl bg-overlay/70 px-2 py-1 text-2xs">
                    {{ Math.round(item.width) }}×{{ Math.round(item.height) }}
                  </span>
                </GridItemOverlay>

                <GridItemLabel :name="`#${item.index + 1}`"/>
              </GridItem>
            </Grid>
          </div>
        </CardContent>
      </Card>
    </div>
  </ComponentLayout>
</template>
