<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Stat from '@ui/Stat/Stat.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Stat</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>A headline metric with a label and an optional trend delta (up/down).</ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionExample>
        <div class="grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3" data-demo="stats">
          <div class="rounded-large border border-border bg-surface p-5">
            <Stat value="$48,120" label="Revenue this month" trend="up" delta="12.4%" />
          </div>
          <div class="rounded-large border border-border bg-surface p-5">
            <Stat value="2,310" label="Active users" trend="down" delta="3.1%" />
          </div>
          <div class="rounded-large border border-border bg-surface p-5">
            <Stat value="98.2%" label="Uptime" />
          </div>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
