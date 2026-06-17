<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref } from 'vue';
import Button from '@ui/Button/Button.vue';
import Toaster from '@ui/Toast/Toaster.vue';
import { toast } from '@ui/Toast/toast';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const positions = ['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as const;
const position = ref<(typeof positions)[number]>('bottom-right');
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Toast</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>Transient notifications built on reka's Toast — timing, swipe-to-dismiss, and screen-reader announcements are handled for you. Mount one <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">&lt;Toaster /&gt;</code> near your app root, then call <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">toast()</code> from anywhere.</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionDescription>Variants. Each call pushes a toast; they stack and auto-dismiss.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-3">
          <Button variant="secondary" @click="toast({ title: 'Heads up', description: 'This is a default notification.' })">Default</Button>
          <Button variant="success" @click="toast.success('Profile updated')">Success</Button>
          <Button variant="warning" @click="toast.warning({ title: 'Storage almost full', description: 'You have used 92% of your quota.' })">Warning</Button>
          <Button variant="destructive" @click="toast.error({ title: 'Upload failed', description: 'The connection was interrupted.' })">Error</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>With an action button, and a sticky toast that stays until dismissed.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            @click="toast({ title: 'Item deleted', description: 'The file was moved to trash.', action: { label: 'Undo', onClick: () => toast.success('Restored') } })"
          >
            With action
          </Button>
          <Button variant="secondary" @click="toast({ title: 'Syncing…', description: 'This one stays until you dismiss it.', duration: 0 })">Sticky</Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionDescription>Position — set <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">&lt;Toaster :position="…" /&gt;</code>. The slide and swipe direction follow the edge. (Currently <strong class="text-foreground">{{ position }}</strong>.)</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap gap-2">
          <Button
            v-for="p in positions"
            :key="p"
            :variant="p === position ? 'primary' : 'secondary'"
            size="sm"
            @click="position = p; toast.success({ title: p, description: 'Shown at ' + p })"
          >
            {{ p }}
          </Button>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>

  <Toaster :position="position" />
  </ComponentLayout>
</template>
