<script setup lang="ts">
import {cn} from '../utils';

defineProps({label: {type: String, default: undefined}});
</script>

<template>
  <kbd :aria-label="label"
       :class="cn('inline-flex h-tag items-center gap-0.5 rounded-small border border-border bg-surface px-tag-x font-mono text-xs text-muted', $attrs.class)">
    <slot/>
  </kbd>
</template>
