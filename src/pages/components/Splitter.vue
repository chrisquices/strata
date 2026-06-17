<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import { ChevronLeft, ChevronRight } from '@lucide/vue';
import Splitter from '@ui/Splitter/Splitter.vue';
import SplitterPanel from '@ui/Splitter/SplitterPanel.vue';
import SplitterResizeHandle from '@ui/Splitter/SplitterResizeHandle.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sizes = ref<number[]>([35, 65]);
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Splitter</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Resizable panels split by a draggable handle. Drag it, or Tab to a handle and use the arrow keys (the separator reports its position to screen readers). Panels take <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">min/max/default</code> sizes (percent) and can be collapsible. The group fills its container — give it a height.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Horizontal. Sizes: <strong class="text-foreground">{{ sizes.map(n => Math.round(n)).join(' / ') }}</strong></ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="horizontal">
          <Splitter direction="horizontal" @layout="(s) => (sizes = s)">
            <SplitterPanel :default-size="35" :min-size="20">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Left</div>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize left and right panels" />
            <SplitterPanel :min-size="20">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Right</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Vertical.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="vertical">
          <Splitter direction="vertical">
            <SplitterPanel :default-size="40" :min-size="15">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Top</div>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize top and bottom panels" />
            <SplitterPanel :min-size="15">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Bottom</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Collapsible panel — drag to the edge, or use the chevron.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="collapsible">
          <Splitter direction="horizontal">
            <SplitterPanel v-slot="{ isCollapsed, collapse, expand }" :default-size="30" :min-size="18" collapsible :collapsed-size="8">
              <div class="flex h-full flex-col gap-2 p-2">
                <Button
                  icon
                  variant="muted"
                  size="sm"
                  class="shrink-0 self-end"
                  :aria-label="isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
                  @click="isCollapsed ? expand() : collapse()"
                >
                  <ChevronRight v-if="isCollapsed" class="size-icon-small" aria-hidden="true" />
                  <ChevronLeft v-else class="size-icon-small" aria-hidden="true" />
                </Button>
                <div v-if="!isCollapsed" class="px-2 text-sm text-muted">Sidebar</div>
              </div>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize sidebar" />
            <SplitterPanel :min-size="30">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Main</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Three panels — the second handle is <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">disabled</code>, so the right pair is fixed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="three">
          <Splitter direction="horizontal">
            <SplitterPanel :default-size="25" :min-size="15">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Nav</div>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize nav and content" />
            <SplitterPanel :min-size="30">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Content</div>
            </SplitterPanel>
            <SplitterResizeHandle disabled aria-label="Resize content and details (disabled)" />
            <SplitterPanel :default-size="25" :min-size="15">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Details</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Persisted — <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">autoSaveId</code> remembers your sizes in localStorage across reloads.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="persisted">
          <Splitter direction="horizontal" auto-save-id="splitter-demo">
            <SplitterPanel :default-size="50" :min-size="20">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Resize me…</div>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize persisted panels" />
            <SplitterPanel :min-size="20">
              <div class="grid h-full place-items-center p-4 text-center text-sm text-muted">…then reload — sizes stick</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Nested groups make a grid.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-64 w-full overflow-hidden rounded-large border border-border bg-surface" data-demo="nested">
          <Splitter direction="vertical">
            <SplitterPanel :default-size="60" :min-size="20">
              <Splitter direction="horizontal">
                <SplitterPanel :min-size="20">
                  <div class="grid h-full place-items-center p-4 text-sm text-muted">Top-left</div>
                </SplitterPanel>
                <SplitterResizeHandle aria-label="Resize top-left and top-right panels" />
                <SplitterPanel :min-size="20">
                  <div class="grid h-full place-items-center p-4 text-sm text-muted">Top-right</div>
                </SplitterPanel>
              </Splitter>
            </SplitterPanel>
            <SplitterResizeHandle aria-label="Resize top and bottom rows" />
            <SplitterPanel :min-size="20">
              <div class="grid h-full place-items-center p-4 text-sm text-muted">Bottom</div>
            </SplitterPanel>
          </Splitter>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
