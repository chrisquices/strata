<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {Heart, Download, Share2} from '@lucide/vue';

import Grid from '@ui/Grid/Grid.vue';
import GridItem from '@ui/Grid/GridItem.vue';
import GridItemContent from '@ui/Grid/GridItemContent.vue';
import GridItemLabel from '@ui/Grid/GridItemLabel.vue';
import GridItemOverlay from '@ui/Grid/GridItemOverlay.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

function picsum(id: number, width: number, height: number) {
  return `https://picsum.photos/id/${id}/${width}/${height}`;
}

const photos = [
  { id: 10, label: 'Forest trail' },
  { id: 15, label: 'Hilltop view' },
  { id: 20, label: 'Sunlit path' },
  { id: 28, label: 'Ocean waves' },
  { id: 37, label: 'Mountain ridge' },
  { id: 42, label: 'Wildflower field' },
  { id: 54, label: 'Stone bridge' },
  { id: 65, label: 'Desert dunes' },
];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Grid</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      Auto-filling responsive grid for media and cards — configurable column sizes, image and video content, overlay labels, action overlays, and interactive items.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Medium-sized items with overlay labels. Columns fill automatically based on available width.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem v-for="photo in photos" :key="photo.id">
            <GridItemContent type="image" :src="picsum(photo.id, 400, 400)" :alt="photo.label" />
            <GridItemLabel>{{ photo.label }}</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Label below -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Label below</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Labels rendered below the content area instead of as an overlay gradient.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem v-for="photo in photos.slice(0, 4)" :key="photo.id">
            <GridItemContent type="image" :src="picsum(photo.id, 400, 400)" :alt="photo.label" />
            <GridItemLabel variant="below">{{ photo.label }}</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Interactive -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Interactive</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Items with interactive get hover, focus, and active styles with a subtle zoom on the content. The element resolves to a button by default, or an anchor when href is present.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem v-for="photo in photos.slice(0, 4)" :key="photo.id" interactive>
            <GridItemContent type="image" :src="picsum(photo.id, 400, 400)" :alt="photo.label" zoom-on-hover />
            <GridItemLabel>{{ photo.label }}</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Overlay on hover -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Overlay on hover</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A scrim overlay that appears on hover, holding action buttons with pointer-events restored.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem v-for="photo in photos.slice(0, 4)" :key="photo.id">
            <GridItemContent type="image" :src="picsum(photo.id, 400, 400)" :alt="photo.label" />
            <GridItemOverlay variant="scrim" visibility="hover">
              <div class="pointer-events-auto flex size-full items-center justify-center gap-2">
                <Button variant="ghost" size="sm" icon class="text-white hover:bg-white/20">
                  <Heart class="size-icon-small" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" icon class="text-white hover:bg-white/20">
                  <Download class="size-icon-small" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="sm" icon class="text-white hover:bg-white/20">
                  <Share2 class="size-icon-small" aria-hidden="true" />
                </Button>
              </div>
            </GridItemOverlay>
            <GridItemLabel>{{ photo.label }}</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Item sizes -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Item sizes</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Small, medium, and large minimum column widths control how many columns fit at a given container width.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-col gap-8">
          <div>
            <p class="mb-2 text-xs font-medium text-muted">Small</p>
            <Grid item-size="sm">
              <GridItem v-for="photo in photos.slice(0, 6)" :key="photo.id">
                <GridItemContent type="image" :src="picsum(photo.id, 300, 300)" :alt="photo.label" />
              </GridItem>
            </Grid>
          </div>
          <div>
            <p class="mb-2 text-xs font-medium text-muted">Medium</p>
            <Grid item-size="md">
              <GridItem v-for="photo in photos.slice(0, 6)" :key="photo.id">
                <GridItemContent type="image" :src="picsum(photo.id, 400, 400)" :alt="photo.label" />
              </GridItem>
            </Grid>
          </div>
          <div>
            <p class="mb-2 text-xs font-medium text-muted">Large</p>
            <Grid item-size="lg">
              <GridItem v-for="photo in photos.slice(0, 6)" :key="photo.id">
                <GridItemContent type="image" :src="picsum(photo.id, 500, 500)" :alt="photo.label" />
              </GridItem>
            </Grid>
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Aspect ratios -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Aspect ratios</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Content area supports square, portrait, landscape, and wide aspect ratios.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem>
            <GridItemContent type="image" :src="picsum(10, 400, 400)" alt="Square" aspect="square" />
            <GridItemLabel variant="below">Square</GridItemLabel>
          </GridItem>
          <GridItem>
            <GridItemContent type="image" :src="picsum(15, 300, 400)" alt="Portrait" aspect="portrait" />
            <GridItemLabel variant="below">Portrait</GridItemLabel>
          </GridItem>
          <GridItem>
            <GridItemContent type="image" :src="picsum(20, 400, 300)" alt="Landscape" aspect="landscape" />
            <GridItemLabel variant="below">Landscape</GridItemLabel>
          </GridItem>
          <GridItem>
            <GridItemContent type="image" :src="picsum(28, 640, 360)" alt="Wide" aspect="wide" />
            <GridItemLabel variant="below">Wide</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Disabled and loading -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Disabled and loading</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Disabled items are visually dimmed and inert. Loading items show the same dimming with an aria-busy flag.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem interactive>
            <GridItemContent type="image" :src="picsum(10, 400, 400)" alt="Normal" />
            <GridItemLabel variant="below">Normal</GridItemLabel>
          </GridItem>
          <GridItem interactive disabled>
            <GridItemContent type="image" :src="picsum(15, 400, 400)" alt="Disabled" />
            <GridItemLabel variant="below">Disabled</GridItemLabel>
          </GridItem>
          <GridItem interactive loading>
            <GridItemContent type="image" :src="picsum(20, 400, 400)" alt="Loading" />
            <GridItemLabel variant="below">Loading</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Generic fallback -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Generic fallback</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Without a media source, GridItemContent renders a file icon placeholder. The default slot overrides the icon.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Grid>
          <GridItem>
            <GridItemContent />
            <GridItemLabel variant="below">Default icon</GridItemLabel>
          </GridItem>
          <GridItem>
            <GridItemContent>
              <Share2 class="size-icon-extra-large text-muted" aria-hidden="true" />
            </GridItemContent>
            <GridItemLabel variant="below">Custom icon</GridItemLabel>
          </GridItem>
        </Grid>
      </ComponentItemSectionExample>
    </ComponentItemSection>

  </ComponentContent>
</template>
