<script setup lang="ts">
// Editable list of tags built on reka's TagsInput. v-model is a string array; type and press
// Enter or comma to add, Backspace or the × to remove. `max` caps the count, `addOnBlur` commits on blur.
import {TagsInputRoot, TagsInputItem, TagsInputItemText, TagsInputInput} from 'reka-ui';
import Chip from '../Chip/Chip.vue';

defineProps({
  placeholder: {type: String, default: 'Add a tag…'},
  disabled: {type: Boolean, default: false},
  max: {type: Number, default: 0},
  addOnBlur: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
});
const value = defineModel<string[]>({
  default: function () {
    return [];
  }
});

const rootClass = 'group py-1.5 flex w-full items-center gap-2 rounded-medium border border-border bg-input px-control-x text-sm transition-colors hover:border-foreground/30 focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background min-h-control flex-wrap gap-1.5';

function removeTag(tag: string) {
  value.value = value.value.filter(function (item) {
    return item !== tag;
  });
}

function keepFocus(event: MouseEvent) {
  event.preventDefault();
}
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
      rootClass,
      disabled ? 'opacity-50 pointer-events-none' : 'cursor-text',
    ]"
  >
    <TagsInputItem
        v-for="tag in value"
        :key="tag"
        :value="tag"
        as-child
    >
      <Chip
          variant="secondary"
          size="sm"
          dismissible
          @mousedown="keepFocus"
          @dismiss="removeTag(tag)"
      >
        <TagsInputItemText/>
      </Chip>
    </TagsInputItem>
    <TagsInputInput
        :placeholder="placeholder"
        class="min-w-0 flex-1 truncate bg-transparent text-left text-foreground focus-visible:outline-none"
    />
  </TagsInputRoot>
</template>
