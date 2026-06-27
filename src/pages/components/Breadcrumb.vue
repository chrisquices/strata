<script setup lang="ts">
import { RouterLink } from 'vue-router';
import ComponentContent from "@app/component/ComponentContent.vue";
import Breadcrumb from '@ui/Breadcrumb/Breadcrumb.vue';
import BreadcrumbList from '@ui/Breadcrumb/BreadcrumbList.vue';
import BreadcrumbItem from '@ui/Breadcrumb/BreadcrumbItem.vue';
import BreadcrumbLink from '@ui/Breadcrumb/BreadcrumbLink.vue';
import BreadcrumbPage from '@ui/Breadcrumb/BreadcrumbPage.vue';
import BreadcrumbSeparator from '@ui/Breadcrumb/BreadcrumbSeparator.vue';
import BreadcrumbEllipsis from '@ui/Breadcrumb/BreadcrumbEllipsis.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Breadcrumb</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A navigation trail — a nav landmark wrapping an ordered list of links, separators, and the current page.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Links and separators lead to a final current-page item.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink href="#">Components</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Router links -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Router links</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        BreadcrumbLink renders an anchor by default; pass a component to its as prop — here the app's RouterLink — to
        navigate client-side.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink :as="RouterLink" to="/components/accordion">Accordion</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbLink :as="RouterLink" to="/components/badge">Badge</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Breadcrumb</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Collapsed with ellipsis -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Collapsed with ellipsis</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Middle items collapse into an ellipsis (announced as "More").</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Home</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbEllipsis />
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Current</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Custom separator -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Custom separator</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>The separator slot overrides the default chevron.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Docs</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator><span>/</span></BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbLink href="#">Guides</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator><span>/</span></BreadcrumbSeparator>
            <BreadcrumbItem><BreadcrumbPage>Routing</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Truncated page label -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Truncated page label</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        A long current-page label can be constrained so the trail keeps its layout.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="#">Files</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage class="block max-w-[14rem] truncate">
                2026-quarterly-financial-report-final-v3.xlsx
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
