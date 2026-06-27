<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import StatusDot from '@ui/StatusDot/StatusDot.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const states = [
  {variant: 'success', text: 'Online'},
  {variant: 'warning', text: 'Degraded'},
  {variant: 'destructive', text: 'Offline'},
  {variant: 'muted', text: 'Idle'},
  {variant: 'primary', text: 'Unknown'},
];
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Status Dot</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A small status indicator dot with tone variants and an optional pulse.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Variants -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Variants</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A tone variant for each common system state.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-6 text-sm text-foreground">
          <span v-for="state in states" :key="state.variant" class="inline-flex items-center gap-2">
            <StatusDot :variant="state.variant"/> {{ state.text }}
          </span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Standalone -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Standalone</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Without adjacent text, set label to give the dot an accessible name.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-6">
          <StatusDot variant="success" label="Online"/>
          <StatusDot variant="warning" label="Degraded"/>
          <StatusDot variant="destructive" label="Offline"/>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Pulse -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Pulse</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A pulsing ring draws attention to a live status.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="flex flex-wrap items-center gap-6 text-sm text-foreground">
          <span class="inline-flex items-center gap-2"><StatusDot variant="success" pulse/> Live</span>
          <span class="inline-flex items-center gap-2"><StatusDot variant="destructive" pulse/> Recording</span>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
