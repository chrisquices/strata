<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import {reactive} from 'vue';
import {UploadCloud} from '@lucide/vue';

import type {DropzoneMessage, DropzoneState} from '@ui/DropZone/types';
import DropZone from '@ui/DropZone/DropZone.vue';
import DropZoneOverlay from '@ui/DropZone/DropZoneOverlay.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const dropzoneDemo = reactive({
  imageExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  accepted: [] as string[],
  rejected: false,
  overlayDropped: 0,
  onChange: function (state: DropzoneState) {
    dropzoneDemo.accepted = state.files.map(function (file) {
      return file.name;
    });
    dropzoneDemo.rejected = false;
  },
  onMessages: function (messages: DropzoneMessage[]) {
    dropzoneDemo.rejected = messages.length > 0;
  },
  onOverlayDrop: function (files: File[]) {
    dropzoneDemo.overlayDropped += files.length;
  },
});
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Drop Zone</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A drag-and-drop / click-to-browse file target with accept filtering and accepted / rejected feedback.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Images Only -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Images only</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        accept: .jpg, .jpeg, .png, .gif, .webp. {{
          dropzoneDemo.rejected ? 'Last drop rejected.' : dropzoneDemo.accepted.length ? 'Accepted: ' + dropzoneDemo.accepted.join(', ') : 'Drop or click to browse.'
        }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-md">
          <DropZone :accept="dropzoneDemo.imageExtensions" @change="dropzoneDemo.onChange"
                    @messages="dropzoneDemo.onMessages">
            <UploadCloud class="size-icon-large"/>
            <p class="text-sm font-medium">Drop images here</p>
            <p class="text-xs">or click to browse</p>
          </DropZone>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Window Overlay -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Window overlay</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        DropZoneOverlay shows a full-window prompt whenever files are dragged anywhere over the page. Files dropped:
        {{ dropzoneDemo.overlayDropped }}
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <DropZoneOverlay @drop="dropzoneDemo.onOverlayDrop">
          <div class="rounded-large border border-dashed border-border bg-surface p-6 text-center text-sm text-muted">
            Drag a file anywhere over this page to see the overlay.
          </div>
        </DropZoneOverlay>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
