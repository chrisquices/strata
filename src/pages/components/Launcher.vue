<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import { ref, computed } from 'vue';
import { LayoutGrid, Image, Music, Film, Settings, Mail } from '@lucide/vue';

import Launcher from '@ui/Launcher/Launcher.vue';
import LauncherGrid from '@ui/Launcher/LauncherGrid.vue';
import LauncherItem from '@ui/Launcher/LauncherItem.vue';
import Button from '@ui/Button/Button.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const open = ref(false);
const query = ref('');
const apps = [
  { icon: Image, label: 'Photos', description: 'Library & albums' },
  { icon: Music, label: 'Music', description: 'Songs & playlists' },
  { icon: Film, label: 'Movies', description: 'Watch & rent' },
  { icon: Mail, label: 'Mail', description: 'Inbox' },
  { icon: Settings, label: 'Settings', description: 'Preferences' },
];
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? apps.filter(a => a.label.toLowerCase().includes(q)) : apps;
});
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Launcher</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A full-screen app launcher / command surface built on reka's Dialog — a focused search field over a grid of items.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Opens full-screen with the search focused; Escape closes.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="launcher">
          <Button @click="open = true">Open launcher</Button>
          <Launcher :open="open" v-model:query="query" @close="open = false">
            <LauncherGrid>
              <LauncherItem
                v-for="app in filtered"
                :key="app.label"
                :icon="app.icon"
                :label="app.label"
                :description="app.description"
                @click="open = false"
              />
            </LauncherGrid>
          </Launcher>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
