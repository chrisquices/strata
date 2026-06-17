<script setup lang="ts">
import type { PropType } from 'vue';
// Switch between panels of related content. Compose: Tabs > TabsList > TabsTrigger, plus a
// TabsContent per value. v-model holds the active value; arrow keys move between tabs.
import { TabsRoot } from 'reka-ui';

defineProps({
  defaultValue: { type: String, default: undefined },
  orientation: { type: String as PropType<'horizontal' | 'vertical'>, default: 'horizontal', validator: (value: string) => ['horizontal', 'vertical'].includes(value) },
});
const model = defineModel<string>();
</script>

<template>
  <TabsRoot
    v-model="model"
    :default-value="defaultValue"
    :orientation="orientation"
    class="data-[orientation=vertical]:flex data-[orientation=vertical]:gap-4"
  >
    <slot />
  </TabsRoot>
</template>
