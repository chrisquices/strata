<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { Hexagon } from '@lucide/vue';
import Topbar from '@ui/Topbar/Topbar.vue';
import TopbarStart from '@ui/Topbar/TopbarStart.vue';
import TopbarEnd from '@ui/Topbar/TopbarEnd.vue';
import TopbarTitle from '@ui/Topbar/TopbarTitle.vue';
import Button from '@ui/Button/Button.vue';

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
    <ComponentItemHeaderTitle>Topbar</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>An application header bar with start and end regions and a title slot. Sticky by default.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Brand and title on the left, actions on the right.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="w-full overflow-hidden rounded-large border border-border" data-demo="basic">
          <Topbar :sticky="false">
            <TopbarStart>
              <Hexagon class="size-icon-large text-foreground" />
              <TopbarTitle>Strata</TopbarTitle>
            </TopbarStart>
            <TopbarEnd>
              <Button variant="muted">Docs</Button>
              <Button>New project</Button>
            </TopbarEnd>
          </Topbar>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
