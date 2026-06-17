<script setup lang="ts">
import ComponentLayout from "@app/component/ComponentLayout.vue";
import CodeBlock from '@ui/CodeBlock/CodeBlock.vue';

import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionDescription from '@app/component/ComponentItemSectionDescription.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';

const sample = `function greet(name) {\n  const msg = 'Hello, ' + name;\n\n  return msg;\n}`;
</script>

<template>
  <ComponentLayout>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Code Block</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A monospaced code surface with a language label, a copy button, and optional line numbers.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-14">
    <ComponentItemSection>
      <ComponentItemSectionTitle>Default</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Language label plus a copy button.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-lg" data-demo="default">
          <CodeBlock :code="sample" language="javascript" />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>

    <ComponentItemSection>
      <ComponentItemSectionTitle>Line numbers</ComponentItemSectionTitle>
      <ComponentItemSectionDescription>Numbered via CSS counters; the blank line keeps its row.</ComponentItemSectionDescription>
      <ComponentItemSectionExample>
        <div class="max-w-lg" data-demo="numbered">
          <CodeBlock :code="sample" language="javascript" line-numbers />
        </div>
      </ComponentItemSectionExample>
    </ComponentItemSection>
  </div>
  </ComponentLayout>
</template>
