<script setup lang="ts">
import { ref } from 'vue';
import { User, Settings, LogOut, CreditCard } from '@lucide/vue';

import ComponentContent from '@app/component/ComponentContent.vue';
import DropdownMenu from '@ui/DropdownMenu/DropdownMenu.vue';
import DropdownMenuTrigger from '@ui/DropdownMenu/DropdownMenuTrigger.vue';
import DropdownMenuContent from '@ui/DropdownMenu/DropdownMenuContent.vue';
import DropdownMenuItem from '@ui/DropdownMenu/DropdownMenuItem.vue';
import DropdownMenuCheckboxItem from '@ui/DropdownMenu/DropdownMenuCheckboxItem.vue';
import DropdownMenuRadioGroup from '@ui/DropdownMenu/DropdownMenuRadioGroup.vue';
import DropdownMenuRadioItem from '@ui/DropdownMenu/DropdownMenuRadioItem.vue';
import DropdownMenuLabel from '@ui/DropdownMenu/DropdownMenuLabel.vue';
import DropdownMenuSeparator from '@ui/DropdownMenu/DropdownMenuSeparator.vue';
import DropdownMenuGroup from '@ui/DropdownMenu/DropdownMenuGroup.vue';
import Button from '@ui/Button/Button.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const compact = ref(true);
const sort = ref('name');
const lastAction = ref('—');
</script>

<template>

  <!-- Header -->
  <ComponentHeader>
    <!-- Title -->
    <ComponentHeaderTitle>Dropdown Menu</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A click-triggered menu built on reka — positioned items, destructive items, checkbox and radio items, labels and separators.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Last action: {{ lastAction }} · Compact: {{ compact }} · Sort: {{ sort }}</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="secondary">Open menu</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel :icon="User">My account</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem :icon="Settings" @select="lastAction = 'settings'">Settings</DropdownMenuItem>
              <DropdownMenuItem :icon="CreditCard" @select="lastAction = 'billing'">Billing</DropdownMenuItem>
              <DropdownMenuItem :icon="LogOut" destructive @select="lastAction = 'logout'">Log out</DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem v-model="compact">Compact mode</DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup v-model="sort">
              <DropdownMenuRadioItem value="name">Sort by name</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="date">Sort by date</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
