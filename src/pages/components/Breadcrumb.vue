<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import Breadcrumb from '@ui/Breadcrumb/Breadcrumb.vue';
import BreadcrumbList from '@ui/Breadcrumb/BreadcrumbList.vue';
import BreadcrumbItem from '@ui/Breadcrumb/BreadcrumbItem.vue';
import BreadcrumbLink from '@ui/Breadcrumb/BreadcrumbLink.vue';
import BreadcrumbPage from '@ui/Breadcrumb/BreadcrumbPage.vue';
import BreadcrumbSeparator from '@ui/Breadcrumb/BreadcrumbSeparator.vue';
import BreadcrumbEllipsis from '@ui/Breadcrumb/BreadcrumbEllipsis.vue';

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
    <ComponentItemHeaderTitle>Breadcrumb</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A navigation trail — a nav landmark wrapping an ordered list of links, separators, and the current page.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionExample>
        <div data-demo="default">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Collapsed with ellipsis</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Middle items collapse into an ellipsis (announced as "More").</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="ellipsis">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbEllipsis /></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Current</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Custom separator</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The separator slot overrides the default chevron.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div data-demo="custom-sep">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#">Docs</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator><span class="text-faint">/</span></BreadcrumbSeparator>
              <BreadcrumbItem><BreadcrumbLink href="#">Guides</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator><span class="text-faint">/</span></BreadcrumbSeparator>
              <BreadcrumbItem><BreadcrumbPage>Routing</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
