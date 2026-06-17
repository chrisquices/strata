<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import NavigationMenu from '@ui/NavigationMenu/NavigationMenu.vue';
import NavigationMenuList from '@ui/NavigationMenu/NavigationMenuList.vue';
import NavigationMenuItem from '@ui/NavigationMenu/NavigationMenuItem.vue';
import NavigationMenuTrigger from '@ui/NavigationMenu/NavigationMenuTrigger.vue';
import NavigationMenuContent from '@ui/NavigationMenu/NavigationMenuContent.vue';
import NavigationMenuLink from '@ui/NavigationMenu/NavigationMenuLink.vue';
import NavigationMenuArrow from '@ui/NavigationMenu/NavigationMenuArrow.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Navigation Menu</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A site navigation bar built on reka — triggers reveal a dropdown panel of links; standalone links support an active state.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Open a trigger to reveal its panel; the last item is a direct active link.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="pb-44" data-demo="nav">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem value="products">
                <NavigationMenuTrigger>Products</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuArrow />
                  <div class="flex flex-col gap-1">
                    <NavigationMenuLink href="#analytics">Analytics</NavigationMenuLink>
                    <NavigationMenuLink href="#automation">Automation</NavigationMenuLink>
                    <NavigationMenuLink href="#reports">Reports</NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem value="resources">
                <NavigationMenuTrigger>Resources</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <NavigationMenuArrow />
                  <div class="flex flex-col gap-1">
                    <NavigationMenuLink href="#docs">Documentation</NavigationMenuLink>
                    <NavigationMenuLink href="#guides">Guides</NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem value="pricing">
                <NavigationMenuLink href="#pricing" active>Pricing</NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
