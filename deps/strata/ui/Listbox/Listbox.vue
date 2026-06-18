<script setup lang="ts">
// An always-visible selectable list. Compose: Listbox > ListboxItem (optionally grouped with
// ListboxGroup > ListboxGroupLabel; or virtualized with ListboxVirtualizer for large lists).
// v-model holds the chosen value (an array when `multiple`). reka owns roving focus, typeahead,
// Home/End, and ARIA (role=listbox/option). `name` enables form submission.
import type { PropType } from 'vue';
import { ListboxRoot, ListboxContent } from 'reka-ui';

defineProps({
  multiple: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical', validator: (value: string) => ['vertical', 'horizontal'].includes(value) },
  // Move the keyboard highlight to the item under the pointer (reka). Off keeps highlight keyboard-driven.
  highlightOnHover: { type: Boolean, default: true },
  // Compare values for equality — a key string or comparator fn. Needed when binding object values.
  by: { type: [String, Function] as PropType<string | ((a: any, b: any) => boolean)>, default: undefined },
});
const model = defineModel<string | number | (string | number)[]>();
</script>

<template>
  <ListboxRoot
    v-model="model"
    :multiple="multiple"
    :disabled="disabled"
    :name="name"
    :required="required"
    :orientation="orientation"
    :highlight-on-hover="highlightOnHover"
    :by="by"
    :class="['rounded-large border border-border bg-surface', disabled ? 'opacity-50' : '']"
  >
    <ListboxContent class="flex max-h-72 flex-col gap-0.5 overflow-y-auto p-1 focus-visible:outline-none data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:flex-wrap">
      <slot />
    </ListboxContent>
  </ListboxRoot>
</template>
