<script setup lang="ts">
import ComponentContent from "@app/component/ComponentContent.vue";
import CodeBlock from '@ui/CodeBlock/CodeBlock.vue';
import CodeBlockContent from '@ui/CodeBlock/CodeBlockContent.vue';
import CodeBlockHeader from '@ui/CodeBlock/CodeBlockHeader.vue';

import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sample = `function greet(name) {\n  const msg = 'Hello, ' + name;\n\n  return msg;\n}`;
</script>

<template>

  <!-- Header -->
  <ComponentHeader>

    <!-- Title -->
    <ComponentHeaderTitle>Code Block</ComponentHeaderTitle>

    <!-- Description -->
    <ComponentHeaderDescription>
      A monospaced code surface with a language label, a copy button, and optional line numbers.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <ComponentContent>
    <!-- Default -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Language label plus a copy button.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <CodeBlock>
          <CodeBlockHeader>
            JavaScript
          </CodeBlockHeader>
          <CodeBlockContent>
            {{ sample }}
          </CodeBlockContent>
        </CodeBlock>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <!-- Line numbers -->
    <ComponentItemSection>
      <ComponentItemSectionTitle>Line numbers</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>
        Numbered via CSS counters; the blank line keeps its row.
      </ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <CodeBlock line-numbers>
          <CodeBlockHeader>
            JavaScript
          </CodeBlockHeader>
          <CodeBlockContent>
            {{ sample }}
          </CodeBlockContent>
        </CodeBlock>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </ComponentContent>
</template>
