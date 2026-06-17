<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { FileText, Download, Trash2 } from '@lucide/vue';
import DetailPane from '@ui/DetailPane/DetailPane.vue';
import DetailPaneActions from '@ui/DetailPane/DetailPaneActions.vue';
import DetailPaneContent from '@ui/DetailPane/DetailPaneContent.vue';
import DetailPaneFooter from '@ui/DetailPane/DetailPaneFooter.vue';
import DetailPanePreview from '@ui/DetailPane/DetailPanePreview.vue';
import DetailPaneRow from '@ui/DetailPane/DetailPaneRow.vue';
import DetailPaneSection from '@ui/DetailPane/DetailPaneSection.vue';
import DetailPaneSubtitle from '@ui/DetailPane/DetailPaneSubtitle.vue';
import DetailPaneTitle from '@ui/DetailPane/DetailPaneTitle.vue';
import Button from '@ui/Button/Button.vue';
import FileSize from '@ui/FileSize/FileSize.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Detail Pane</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A side panel of metadata about a selected item — preview, title, property rows, and actions.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Composed from header, preview, sections, rows, and a footer.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="h-96 w-72 overflow-hidden rounded-large border border-border" data-demo="basic">
          <DetailPane class="h-full">
            <DetailPaneActions>
              <Button variant="muted" aria-label="Download"><Download class="size-icon-small" /></Button>
              <Button variant="muted" aria-label="Delete"><Trash2 class="size-icon-small" /></Button>
            </DetailPaneActions>
            <DetailPaneContent>
              <div class="flex flex-col items-center gap-3 px-4 py-6">
                <DetailPanePreview><FileText class="size-icon-large text-muted" /></DetailPanePreview>
                <div class="w-full">
                  <DetailPaneTitle>Q3-report.pdf</DetailPaneTitle>
                  <DetailPaneSubtitle>PDF document</DetailPaneSubtitle>
                </div>
              </div>
              <DetailPaneSection label="Information">
                <DetailPaneRow label="Size"><FileSize :bytes="2_576_384" /></DetailPaneRow>
                <DetailPaneRow label="Kind">PDF document</DetailPaneRow>
                <DetailPaneRow label="Created">May 31, 2026</DetailPaneRow>
                <DetailPaneRow label="Owner">Ada Lovelace</DetailPaneRow>
              </DetailPaneSection>
            </DetailPaneContent>
            <DetailPaneFooter>
              <div class="px-4 py-3"><Button class="w-full">Open</Button></div>
            </DetailPaneFooter>
          </DetailPane>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
