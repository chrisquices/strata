<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue';

const props = defineProps({
  accept: { type: String, default: undefined },
  multiple: { type: Boolean, default: true },
});
const emit = defineEmits<{ files: [files: File[]]; rejected: [files: File[]] }>();

const dropState = ref('idle'); // 'idle' | 'dragover' | 'accepted' | 'rejected'
const fileInput = ref(null);
let resetTimer = null;

function fileMatchesAccept(file) {
  if (!props.accept) return true;
  const parts = props.accept.split(',').map(part => part.trim());
  return parts.some(pattern => {
    if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    if (pattern.endsWith('/*')) return file.type.startsWith(pattern.slice(0, -1));
    return file.type === pattern;
  });
}

function takeFiles(files) {
  clearTimeout(resetTimer);
  const allowed = props.multiple ? files : files.slice(0, 1);
  const allMatch = allowed.length > 0 && allowed.every(fileMatchesAccept);
  dropState.value = allMatch ? 'accepted' : 'rejected';
  if (allMatch) emit('files', allowed);
  else emit('rejected', allowed);
  resetTimer = setTimeout(() => { dropState.value = 'idle'; }, 1500);
}

function onDragOver(event) { event.preventDefault(); dropState.value = 'dragover'; }
function onDragEnter(event) { event.preventDefault(); dropState.value = 'dragover'; }
function onDragLeave(event) {
  // Only reset when leaving the zone entirely; a relatedTarget inside it means we're moving between children (avoids flicker).
  if (!event.currentTarget.contains(event.relatedTarget)) dropState.value = 'idle';
}
function onDrop(event) {
  event.preventDefault();
  takeFiles(Array.from(event.dataTransfer?.files ?? []));
}

function openPicker() { fileInput.value?.click(); }
function onPicked(event) {
  takeFiles(Array.from(event.target.files ?? []));
  event.target.value = '';
}

onBeforeUnmount(() => clearTimeout(resetTimer));

const zoneClass = computed(() => ({
  idle: 'border-border bg-background text-muted hover:border-foreground/30 hover:bg-surface',
  dragover: 'border-foreground bg-surface text-foreground',
  accepted: 'border-success bg-success/10 text-success',
  rejected: 'border-destructive bg-destructive/10 text-destructive',
}[dropState.value]));
</script>

<template>
  <div
    role="button"
    tabindex="0"
    aria-label="Drop files or browse"
    :class="['flex cursor-pointer flex-col items-center justify-center gap-3 rounded-large border-medium border-dashed p-8 transition-colors duration-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background', zoneClass]"
    @dragover="onDragOver"
    @dragenter="onDragEnter"
    @dragleave="onDragLeave"
    @drop="onDrop"
    @click="openPicker"
    @keydown.enter.prevent="openPicker"
    @keydown.space.prevent="openPicker"
  >
    <input ref="fileInput" type="file" class="sr-only" :accept="accept" :multiple="multiple" tabindex="-1" aria-hidden="true" @change="onPicked" />
    <slot />
  </div>
</template>
