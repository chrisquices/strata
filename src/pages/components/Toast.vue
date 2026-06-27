<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import { ref } from 'vue';
import Button from '@ui/Button/Button.vue';
import Toaster from '@ui/Toast/Toaster.vue';
import { toast } from '@ui/Toast/toast';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;
const position = ref<(typeof positions)[number]>('bottom-right');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Toast</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>Transient notifications built on reka's Toast — timing, swipe-to-dismiss, and screen-reader announcements are handled for you. Mount one <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">&lt;Toaster /&gt;</code> near your app root, then call <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">toast()</code> from anywhere.</ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Variants -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Each call pushes a toast; they stack and auto-dismiss.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-3">
          <Button variant="secondary" @click="toast({ title: 'Heads up', description: 'This is a default notification.' })">Default</Button>
          <Button variant="success" @click="toast.success('Profile updated')">Success</Button>
          <Button variant="warning" @click="toast.warning({ title: 'Storage almost full', description: 'You have used 92% of your quota.' })">Warning</Button>
          <Button variant="destructive" @click="toast.error({ title: 'Upload failed', description: 'The connection was interrupted.' })">Error</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Action and sticky -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Action and sticky</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>With an action button, and a sticky toast that stays until dismissed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            @click="toast({ title: 'Item deleted', description: 'The file was moved to trash.', action: { label: 'Undo', onClick: function () { toast.success('Restored'); } } })"
          >
            With action
          </Button>
          <Button variant="secondary" @click="toast({ title: 'Syncing…', description: 'This one stays until you dismiss it.', duration: 0 })">Sticky</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Position -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Position</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">&lt;Toaster :position="…" /&gt;</code>; the slide and swipe direction follow the edge. (Currently <strong class="text-foreground">{{ position }}</strong>.)</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="placement in positions"
            :key="placement"
            :variant="placement === position ? 'primary' : 'secondary'"
            size="sm"
            @click="position = placement; toast.success({ title: placement, description: 'Shown at ' + placement })"
          >
            {{ placement }}
          </Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <Toaster :position="position" />
  </ComponentContent>
</template>
