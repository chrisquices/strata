<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { UploadCloud } from '@lucide/vue';

const props = defineProps({
  label: { type: String, default: 'Drop files to upload' },
  hint: { type: String, default: 'Release to add them to this collection.' },
  disabled: { type: Boolean, default: false },
});
const emit = defineEmits<{ drop: [files: File[]] }>();

const depth = ref(0);
// Visibility is gated on `disabled` here, not in the enter/leave handlers, so the
// depth counter stays balanced even if `disabled` flips mid-drag (otherwise a
// suppressed dragleave could leave the overlay stuck open).
const dragging = computed(() => depth.value > 0 && !props.disabled);

function hasFiles(event) {
  const types = event.dataTransfer?.types;
  return !!types && Array.from(types).includes('Files');
}
function handleEnter(event) { if (!hasFiles(event)) return; event.preventDefault(); depth.value += 1; }
function handleOver(event) { if (!hasFiles(event)) return; event.preventDefault(); }
function handleLeave(event) { if (!hasFiles(event)) return; depth.value = Math.max(0, depth.value - 1); }
function handleDrop(event) {
  depth.value = 0;
  if (!hasFiles(event)) return;
  // Swallow every file drop while mounted so a stray drop never navigates the page; only emit when enabled.
  event.preventDefault();
  if (props.disabled) return;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length) emit('drop', files);
}

onMounted(() => {
  window.addEventListener('dragenter', handleEnter);
  window.addEventListener('dragover', handleOver);
  window.addEventListener('dragleave', handleLeave);
  window.addEventListener('drop', handleDrop);
});

onBeforeUnmount(() => {
  window.removeEventListener('dragenter', handleEnter);
  window.removeEventListener('dragover', handleOver);
  window.removeEventListener('dragleave', handleLeave);
  window.removeEventListener('drop', handleDrop);
});
</script>

<template>
  <slot />

  <div
    :class="['pointer-events-none fixed inset-0 z-modal flex items-center justify-center bg-overlay/40 p-6 backdrop-blur-sm transition-opacity duration-200', dragging ? 'opacity-100' : 'opacity-0']"
    :aria-hidden="!dragging"
  >
    <slot v-if="$slots.overlay" name="overlay" />
    <div
      v-else
      :class="['flex flex-col items-center gap-3 rounded-large border-medium border-dashed border-foreground/40 bg-surface px-12 py-10 text-center shadow-panel transition-transform duration-200 ease-out', dragging ? 'scale-100' : 'scale-95']"
    >
      <UploadCloud class="size-icon-large text-foreground" />
      <p class="text-sm font-medium text-foreground">{{ label }}</p>
      <p class="text-xs text-muted">{{ hint }}</p>
    </div>
  </div>
</template>
