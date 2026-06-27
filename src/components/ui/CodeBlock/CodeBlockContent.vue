<script setup lang="ts">
import { computed, inject, onBeforeUnmount, useSlots, watch } from 'vue';
import { codeBlockContextKey } from './context';

const slots = useSlots();
const codeBlock = inject(codeBlockContextKey);

if (!codeBlock) {
  throw new Error('CodeBlockContent must be used inside CodeBlock.');
}

function textFromNodes(nodes: unknown[]): string {
  let text = '';

  for (const node of nodes) {
    text += textFromNode(node);
  }

  return text;
}

function textFromNode(node: unknown): string {
  const candidate = node as { children?: unknown };

  if (typeof candidate.children === 'string') {
    return candidate.children;
  }

  if (Array.isArray(candidate.children)) {
    return textFromNodes(candidate.children);
  }

  return '';
}

function countIndent(line: string): number {
  let index = 0;

  while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
    index++;
  }

  return index;
}

function removeIndent(line: string, indent: number): string {
  let index = 0;
  let remaining = indent;

  while (remaining > 0 && index < line.length && (line[index] === ' ' || line[index] === '\t')) {
    index++;
    remaining--;
  }

  return line.slice(index);
}

function normalizeCode(value: string): string {
  let normalized = value.replace(/^\s*\n/, '').replace(/\n\s*$/, '');
  const normalizedLines = normalized.split('\n');
  let indent: number | null = null;

  for (const line of normalizedLines) {
    if (!line.trim()) continue;

    const lineIndent = countIndent(line);
    indent = indent === null ? lineIndent : Math.min(indent, lineIndent);
  }

  if (indent) {
    normalized = normalizedLines.map(function (line) {
      return removeIndent(line, indent);
    }).join('\n');
  }

  return normalized;
}

const rawCode = computed(function () {
  return normalizeCode(slots.default ? textFromNodes(slots.default()) : '');
});

const lines = computed(function () {
  return rawCode.value.split('\n');
});

watch(rawCode, function (value) {
  codeBlock.setCode(value);
}, { immediate: true });

onBeforeUnmount(function () {
  codeBlock.setCode('');
});
</script>

<template>
  <pre class="overflow-x-auto p-container whitespace-normal [counter-reset:line]">
    <code class="block">
      <span
          v-for="(line, index) in lines"
          :key="index"
          :class="[
            'block whitespace-pre leading-relaxed text-foreground [counter-increment:line]',
            codeBlock.lineNumbers.value ? 'before:mr-4 before:inline-block before:select-none before:text-right before:tabular-nums before:text-faint before:content-[counter(line)]' : '',
          ]"
          v-text="line || ' '"
      />
    </code>
  </pre>
</template>
