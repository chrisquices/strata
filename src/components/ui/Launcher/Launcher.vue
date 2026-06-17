<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DialogRoot, DialogPortal, DialogContent, DialogTitle, DialogDescription } from 'reka-ui';
import { Search } from '@lucide/vue';

const props = defineProps({
  open: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Search apps…' },
});
const query = defineModel<string>('query', { default: '' });
const emit = defineEmits<{ close: [] }>();

const inputElement = ref(null);

// Parent-controlled: `open` drives visibility; a reka-initiated close (escape/outside) emits `close` for the parent to flip it.
const openProxy = computed({
  get: () => props.open,
  set: value => { if (!value) emit('close'); },
});

watch(() => props.open, open => {
  if (open) query.value = '';
});

function focusSearch() {
  inputElement.value?.focus();
}
</script>

<template>
  <DialogRoot v-model:open="openProxy">
    <DialogPortal>
      <DialogContent
        class="strata-overlay-fade fixed inset-0 z-modal flex flex-col items-center gap-10 overflow-y-auto bg-overlay/80 px-5 py-20 backdrop-blur-xl focus-visible:outline-none md:px-8"
        @open-auto-focus.prevent="focusSearch"
      >
        <DialogTitle class="sr-only">App launcher</DialogTitle>
        <DialogDescription class="sr-only">Search for an app and press Enter to open it.</DialogDescription>
        <div class="relative w-full max-w-md shrink-0">
          <Search aria-hidden="true" class="pointer-events-none absolute left-4 top-1/2 size-icon-small -translate-y-1/2 text-faint" />
          <input
            ref="inputElement"
            v-model="query"
            type="search"
            :placeholder="placeholder"
            class="h-control w-full rounded-large border border-border bg-input/80 pl-11 pr-4 text-sm text-foreground placeholder:text-faint shadow-overlay transition-colors focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
          />
        </div>

        <div class="strata-menu-pop w-full max-w-3xl">
          <slot />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
