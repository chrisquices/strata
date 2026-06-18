<script setup lang="ts">
// Editable list of tags built on reka's TagsInput. v-model is a string array; type and press
// Enter or comma to add, Backspace or the × to remove. `max` caps the count, `addOnBlur` commits on blur.
import { X } from '@lucide/vue';
import { TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputItemDelete, TagsInputInput } from 'reka-ui';

defineProps({
  placeholder: { type: String, default: 'Add a tag…' },
  disabled: { type: Boolean, default: false },
  max: { type: Number, default: 0 },
  addOnBlur: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
});
const value = defineModel<string[]>({ default: () => [] });
</script>

<template>
  <TagsInputRoot
    v-model="value"
    :disabled="disabled"
    :max="max"
    :add-on-blur="addOnBlur"
    :name="name"
    :required="required"
    delimiter=","
    :class="[
      'flex min-h-control flex-wrap items-center gap-1 rounded-medium border border-border bg-input px-2 py-0.5 transition-colors duration-100 focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/10',
      disabled ? 'opacity-50 pointer-events-none' : 'cursor-text',
    ]"
  >
    <TagsInputItem
      v-for="tag in value"
      :key="tag"
      :value="tag"
      class="flex h-control-small shrink-0 items-center gap-1 rounded-small bg-border pl-2 pr-1 tracking-wide text-xs text-foreground transition-colors duration-100 data-[state=active]:ring-2 data-[state=active]:ring-foreground/30"
    >
      <TagsInputItemText />
      <TagsInputItemDelete
        :aria-label="`Remove ${tag}`"
        class="flex items-center rounded-small text-muted transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"
      >
        <X class="size-icon-extra-small" aria-hidden="true" />
      </TagsInputItemDelete>
    </TagsInputItem>
    <TagsInputInput
      :placeholder="placeholder"
      class="h-control-small min-w-20 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
    />
  </TagsInputRoot>
</template>
