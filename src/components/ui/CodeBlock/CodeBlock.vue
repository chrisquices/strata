<script setup lang="ts">
import { onBeforeUnmount, provide, ref, toRef } from 'vue';
import { codeBlockContextKey } from './context';

const props = defineProps({
  lineNumbers: { type: Boolean, default: false },
});

const code = ref('');
const copied = ref(false);
let copyTimer: ReturnType<typeof setTimeout> | null = null;

function setCode(value: string) {
  code.value = value;
}

async function copyCode() {
  if (!navigator.clipboard) return;

  try {
    await navigator.clipboard.writeText(code.value);
  } catch {
    return;
  }

  if (copyTimer) clearTimeout(copyTimer);
  copied.value = true;
  copyTimer = setTimeout(function () {
    copied.value = false;
    copyTimer = null;
  }, 1800);
}

onBeforeUnmount(function () {
  if (copyTimer) clearTimeout(copyTimer);
});

provide(codeBlockContextKey, {
  code,
  lineNumbers: toRef(props, 'lineNumbers'),
  copied,
  setCode,
  copyCode,
});
</script>

<template>
  <div class="overflow-hidden rounded-large border border-border bg-surface font-mono text-xs">
    <slot />
  </div>
</template>
