<script setup lang="ts">
import {inject} from 'vue';
import {Check, Copy} from '@lucide/vue';
import Button from '@ui/Button/Button.vue';
import Caption from '@ui/Caption/Caption.vue';
import {cn} from '../utils';
import {codeBlockContextKey} from './context';

defineOptions({inheritAttrs: false});

const codeBlock = inject(codeBlockContextKey);

if (!codeBlock) {
  throw new Error('CodeBlockHeader must be used inside CodeBlock.');
}
</script>

<template>
  <div v-bind="$attrs"
       :class="cn('flex h-control items-center justify-between border-b border-border pl-surface pr-control-x-small', $attrs.class)">
    <Caption>
      <slot/>
    </Caption>
    <Button variant="ghost" size="sm" @click="codeBlock.copyCode">
      <component :is="codeBlock.copied.value ? Check : Copy" class="size-icon-small" aria-hidden="true"/>
      <span class="text-xs" aria-hidden="true">{{ codeBlock.copied.value ? 'Copied' : 'Copy' }}</span>
      <span class="sr-only" role="status">{{ codeBlock.copied.value ? 'Copied to clipboard' : 'Copy code' }}</span>
    </Button>
  </div>
</template>
