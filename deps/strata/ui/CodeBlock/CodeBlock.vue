<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';
import { Copy, Check } from '@lucide/vue';

const props = defineProps({
  code: { type: String, default: '' },
  language: { type: String, default: '' },
  lineNumbers: { type: Boolean, default: false },
});

const copied = ref(false);
let copyTimer = null;

function copyCode() {
  navigator.clipboard?.writeText(props.code).catch(() => {});
  if (copyTimer) clearTimeout(copyTimer);
  copied.value = true;
  copyTimer = setTimeout(() => { copied.value = false; }, 1800);
}
onBeforeUnmount(() => { if (copyTimer) clearTimeout(copyTimer); });

// Blank lines stay as empty strings; the template renders a space so they keep their row height.
const lines = computed(() => props.code.split('\n'));
const CopyIcon = computed(() => (copied.value ? Check : Copy));
</script>

<template>
  <div class="overflow-hidden rounded-large border border-border bg-surface font-mono text-xs">
    <div class="flex h-control items-center justify-between border-b border-border px-3">
      <span class="text-faint">{{ language || 'code' }}</span>
      <button
        type="button"
        class="-mr-1.5 flex h-control-small items-center gap-1.5 rounded-medium px-2 text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
        @click="copyCode"
      >
        <component :is="CopyIcon" class="size-icon-small" aria-hidden="true" />
        <span class="text-xs" aria-hidden="true">{{ copied ? 'Copied' : 'Copy' }}</span>
        <span class="sr-only" role="status">{{ copied ? 'Copied to clipboard' : 'Copy code' }}</span>
      </button>
    </div>

    <pre class="overflow-x-auto p-4 [counter-reset:line]"><code><span
      v-for="(line, index) in lines"
      :key="index"
      :class="[
        'block leading-relaxed text-foreground [counter-increment:line]',
        lineNumbers ? 'before:mr-4 before:inline-block before:w-6 before:select-none before:text-right before:tabular-nums before:text-faint before:content-[counter(line)]' : '',
      ]"
    >{{ line || ' ' }}</span></code></pre>
  </div>
</template>
