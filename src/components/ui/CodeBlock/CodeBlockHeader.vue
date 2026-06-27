<script setup lang="ts">
import { inject } from 'vue';
import { Check, Copy } from '@lucide/vue';
import Button from '@ui/Button/Button.vue';
import Caption from '@ui/Caption/Caption.vue';
import { codeBlockContextKey } from './context';

const codeBlock = inject(codeBlockContextKey);

if (!codeBlock) {
  throw new Error('CodeBlockHeader must be used inside CodeBlock.');
}
</script>

<template>
  <div class="flex h-control items-center justify-between border-b border-border pr-1 pl-4">
    <Caption>
      <slot />
    </Caption>
    <Button variant="ghost" size="sm" @click="codeBlock.copyCode">
      <component :is="codeBlock.copied.value ? Check : Copy" class="size-icon-small" aria-hidden="true" />
      <span class="text-xs" aria-hidden="true">{{ codeBlock.copied.value ? 'Copied' : 'Copy' }}</span>
      <span class="sr-only" role="status">{{ codeBlock.copied.value ? 'Copied to clipboard' : 'Copy code' }}</span>
    </Button>
  </div>
</template>
