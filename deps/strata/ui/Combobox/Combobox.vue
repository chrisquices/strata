<script setup lang="ts">
// Searchable select built on reka's Combobox. Data-driven like a native <select>:
// pass `options` and bind a value with v-model — the input shows the chosen label.
// Each option is { value, label, disabled? }; group with { label, options: [...] }.
// Set `multiple` for multi-select: v-model becomes an array and selections show as removable chips.
// For a plain (non-searchable) dropdown, use Select.
import { computed } from 'vue';
import type { PropType } from 'vue';
import { Check, ChevronDown, X } from '@lucide/vue';
import {
  ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxTrigger,
  ComboboxPortal, ComboboxContent, ComboboxViewport,
  ComboboxGroup, ComboboxLabel, ComboboxItem, ComboboxItemIndicator,
  ComboboxSeparator, ComboboxEmpty,
} from 'reka-ui';

defineOptions({ inheritAttrs: false });

interface ComboboxOption { value: string | number; label: string; disabled?: boolean }
interface ComboboxOptionGroup { label: string; options: ComboboxOption[] }

const props = defineProps({
  options: { type: Array as PropType<(ComboboxOption | ComboboxOptionGroup)[]>, default: () => [] },
  placeholder: { type: String, default: 'Search…' },
  emptyText: { type: String, default: 'No results' },
  disabled: { type: Boolean, default: false },
  multiple: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom', validator: (v: string) => ['top', 'right', 'bottom', 'left'].includes(v) },
  sideOffset: { type: Number, default: 4 },
});
const model = defineModel<string | number | (string | number)[]>();

// Flatten groups so we can map a selected value to its label.
const flat = computed(() => props.options.flatMap(o => (Array.isArray(o.options) ? o.options : [o])));
const labelFor = computed(() => new Map(flat.value.map(o => [o.value, o.label])));
// Single-select shows the chosen label in the input; multi-select keeps the input empty (filter only).
const displayValue = (v: any) => (props.multiple || v === undefined || v === null ? '' : (labelFor.value.get(v) ?? String(v)));

const chips = computed(() => (Array.isArray(model.value) ? model.value : []).map(v => ({ value: v, label: labelFor.value.get(v) ?? String(v) })));
function removeChip(value: string | number) {
  if (Array.isArray(model.value)) model.value = model.value.filter(v => v !== value);
}

const anchorClass = computed(() => [
  'group flex w-full items-center gap-2 rounded-medium border border-border bg-input px-3 text-sm transition-colors hover:border-foreground/30 focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background',
  props.multiple ? 'min-h-control flex-wrap gap-1.5 py-1.5' : 'h-control justify-between',
  props.disabled ? 'pointer-events-none opacity-50' : '',
]);
const itemClass = 'flex h-control w-full cursor-default items-center gap-2 rounded-medium px-2 text-sm text-foreground transition-colors duration-100 select-none focus-visible:outline-none hover:bg-border data-[highlighted]:bg-border data-[state=checked]:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint';
</script>

<template>
  <ComboboxRoot v-model="model" :multiple="multiple" :disabled="disabled" :name="name">
    <ComboboxAnchor :class="anchorClass">
      <span
        v-for="chip in chips"
        :key="chip.value"
        class="inline-flex max-w-[10rem] items-center gap-1 rounded-small bg-border px-1.5 py-0.5 text-xs text-foreground"
      >
        <span class="truncate">{{ chip.label }}</span>
        <button
          type="button"
          class="shrink-0 text-muted transition-colors hover:text-foreground focus-visible:outline-none"
          :aria-label="`Remove ${chip.label || 'item'}`"
          @pointerdown.stop
          @click.stop="removeChip(chip.value)"
        >
          <X class="size-3" aria-hidden="true" />
        </button>
      </span>
      <ComboboxInput
        :display-value="displayValue"
        :placeholder="chips.length ? '' : placeholder"
        :disabled="disabled"
        class="min-w-0 flex-1 truncate bg-transparent text-left text-foreground placeholder:text-faint focus-visible:outline-none"
      />
      <ComboboxTrigger class="group flex shrink-0 items-center self-center" aria-label="Toggle options">
        <ChevronDown class="size-icon-small shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
        v-bind="$attrs"
        :side="side"
        :side-offset="sideOffset"
        position="popper"
        class="strata-menu-pop z-popover max-h-60 min-w-[var(--reka-combobox-trigger-width,8rem)] overflow-hidden rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <ComboboxViewport class="max-h-52 overflow-y-auto p-1">
          <ComboboxEmpty class="px-2 py-4 text-center text-xs text-faint">{{ emptyText }}</ComboboxEmpty>
          <template v-for="(entry, i) in options" :key="Array.isArray(entry.options) ? 'g:' + (entry.label ?? i) : 'o:' + entry.value">
            <ComboboxSeparator
              v-if="i > 0 && (Array.isArray(entry.options) || Array.isArray(options[i - 1].options))"
              class="-mx-1 my-1 h-px bg-border"
            />
            <ComboboxGroup v-if="Array.isArray(entry.options)">
              <ComboboxLabel v-if="entry.label" class="px-2 py-1 text-xs text-faint">{{ entry.label }}</ComboboxLabel>
              <ComboboxItem
                v-for="opt in entry.options"
                :key="opt.value"
                :value="opt.value"
                :disabled="opt.disabled"
                :class="itemClass"
              >
                <span class="flex-1 truncate text-left">{{ opt.label }}</span>
                <ComboboxItemIndicator><Check class="size-icon-small shrink-0 text-foreground" /></ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
            <ComboboxItem
              v-else
              :value="entry.value"
              :disabled="entry.disabled"
              :class="itemClass"
            >
              <span class="flex-1 truncate text-left">{{ entry.label }}</span>
              <ComboboxItemIndicator><Check class="size-icon-small shrink-0 text-foreground" /></ComboboxItemIndicator>
            </ComboboxItem>
          </template>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
