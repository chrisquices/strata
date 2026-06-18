<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import {ref} from 'vue';
import {UploadCloud} from '@lucide/vue';

import DropZone from '@ui/DropZone/DropZone.vue';
import DropZoneOverlay from '@ui/DropZone/DropZoneOverlay.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const accepted = ref([]);
const rejected = ref(false);
const overlayDropped = ref(0);

function onFiles(files) {
  accepted.value = files.map(f => f.name);
  rejected.value = false;
}

function onRejected() {
  accepted.value = [];
  rejected.value = true;
}
</script>

<template>
  <ComponentLayout>
    <ComponentItemHeader>
      <ComponentItemHeaderTitle>Drop Zone</ComponentItemHeaderTitle>
      <ComponentItemHeaderDescription>
        A drag-and-drop / click-to-browse file target with accept filtering and accepted / rejected feedback.
      </ComponentItemHeaderDescription>
    </ComponentItemHeader>

    <div class="flex flex-col gap-14">
      <ComponentItemSection>
        <ComponentItemSectionTitle>Images only</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          accept="image/*". {{
            rejected ? 'Last drop rejected.' : accepted.length ? 'Accepted: ' + accepted.join(', ') : 'Drop or click to browse.'
          }}
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div class="max-w-md" data-demo="zone">
            <DropZone accept="image/*" @files="onFiles" @rejected="onRejected">
              <UploadCloud class="size-icon-large"/>
              <p class="text-sm font-medium">Drop images here</p>
              <p class="text-xs">or click to browse</p>
            </DropZone>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>

      <ComponentItemSection>
        <ComponentItemSectionTitle>Window overlay</ComponentItemSectionTitle>
        <ComponentItemSectionDescription>
          DropZoneOverlay shows a full-window prompt whenever files are dragged anywhere over the page. Files dropped:
          {{ overlayDropped }}
        </ComponentItemSectionDescription>
        <ComponentItemSectionExample>
          <div data-demo="overlay">
            <DropZoneOverlay @drop="files => (overlayDropped += files.length)">
              <div
                  class="rounded-large border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
                Drag a file anywhere over this page to see the overlay.
              </div>
            </DropZoneOverlay>
          </div>
        </ComponentItemSectionExample>
      </ComponentItemSection>
    </div>
  </ComponentLayout>
</template>
