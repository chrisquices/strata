<script setup lang="ts">

// Searchable select built on reka's Combobox. Data-driven like a native <select>:
// pass `options` and bind a value with v-model — the input shows the chosen label.
// Each option is { value, label, disabled? }; group with { label, options: [...] }.
// Set `multiple` for multi-select: v-model becomes an array and selections show as removable chips.
// For a plain (non-searchable) dropdown, use Select.
import {computed, ref} from 'vue';
import type {PropType} from 'vue';
import {Check, ChevronDown} from '@lucide/vue';
import {
  ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxTrigger,
  ComboboxPortal, ComboboxContent, ComboboxViewport,
  ComboboxGroup, ComboboxLabel, ComboboxItem, ComboboxItemIndicator,
  ComboboxSeparator, ComboboxEmpty,
} from 'reka-ui';
import Chip from '../Chip/Chip.vue';

interface ComboboxOption {
  value: string | number;
  label: string;
  disabled?: boolean
}

interface ComboboxOptionGroup {
  label: string;
  options: ComboboxOption[]
}

const props = defineProps({
  options: {
    type: Array as PropType<(ComboboxOption | ComboboxOptionGroup)[]>,
    default: function () {
      return [];
    }
  },
  disabled: {type: Boolean, default: false},
  multiple: {type: Boolean, default: false},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  ariaLabel: {type: String, default: undefined},
  ariaLabelledby: {type: String, default: undefined},
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
    validator: function (value: string) {
      return ['top', 'right', 'bottom', 'left'].includes(value);
    }
  },
  sideOffset: {type: Number, default: 4},
});
const model = defineModel<string | number | (string | number)[]>();

// Flatten groups so we can map a selected value to its label.
const flat = computed(function () {
  return props.options.flatMap(function (option) {
    return Array.isArray(option.options) ? option.options : [option];
  });
});
const labelFor = computed(function () {
  return new Map(flat.value.map(function (option) {
    return [option.value, option.label];
  }));
});

// Single-select shows the chosen label in the input; multi-select keeps the input empty (filter only).
function displayValue(value: any) {
  return props.multiple || value === undefined || value === null ? '' : (labelFor.value.get(value) ?? String(value));
}

const chips = computed(function () {
  return (Array.isArray(model.value) ? model.value : []).map(function (value) {
    return {
      value: value,
      label: labelFor.value.get(value) ?? String(value)
    };
  });
});

function removeChip(value: string | number) {
  if (Array.isArray(model.value)) model.value = model.value.filter(function (item) {
    return item !== value;
  });
}

const anchorClass = computed(function () {
  return [
    'group py-1.5 flex w-full items-center gap-2 rounded-medium border border-border bg-input px-control-x text-sm transition-colors hover:border-foreground/30 focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background',
    props.multiple ? 'min-h-control flex-wrap gap-1.5' : 'h-control justify-between',
    props.disabled ? 'pointer-events-none opacity-50' : '',
  ];
});
const itemClass = 'flex h-control w-full cursor-default items-center gap-2 rounded-medium px-3 text-sm text-foreground transition-colors duration-100 select-none focus-visible:outline-none hover:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint';

const open = ref(false);

// Clicks inside the popover (options, group labels, empty areas) keep the search
// input focused instead of blurring it — so the menu never closes mid-interaction.
// The click still fires, so selection and chip removal keep working.
function keepFocus(event: MouseEvent) {
  if (props.multiple) event.preventDefault();
}

function onAnchorFocusIn() {
  if (props.multiple) open.value = true;
}

function onAnchorFocusOut() {
  if (props.multiple) open.value = false;
}
</script>

<template>
  <ComboboxRoot v-model="model" v-model:open="open" :multiple="multiple" :disabled="disabled" :name="name"
                :required="required">
    <ComboboxAnchor :class="anchorClass" @focusin="onAnchorFocusIn" @focusout="onAnchorFocusOut">
      <Chip
          v-for="chip in chips"
          :key="chip.value"
          variant="secondary"
          size="sm"
          dismissible
          @mousedown="keepFocus"
          @dismiss="removeChip(chip.value)"
      >
        {{ chip.label }}
      </Chip>
      <ComboboxInput
          :display-value="displayValue"
          :disabled="disabled"
          :aria-label="ariaLabel"
          :aria-labelledby="ariaLabelledby"
          class="min-w-0 flex-1 truncate bg-transparent text-left text-foreground focus-visible:outline-none"
      />
      <ComboboxTrigger v-if="!multiple"
                       class="group flex size-[calc(var(--spacing-control)-2px)] shrink-0 items-center justify-center -mr-control-x"
                       aria-label="Toggle options">
        <ChevronDown
            class="size-icon-small shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"/>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
          :side="side"
          :side-offset="sideOffset"
          position="popper"
          @mousedown="keepFocus"
          class="strata-menu-pop z-popover max-h-96 min-w-[var(--reka-combobox-trigger-width,8rem)] overflow-hidden rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <ComboboxViewport class="max-h-52 overflow-y-auto p-1">
          <ComboboxEmpty class="px-2 py-4 text-center text-xs text-faint">
            <slot>No results</slot>
          </ComboboxEmpty>
          <template v-for="(entry, i) in options"
                    :key="Array.isArray(entry.options) ? 'g:' + (entry.label ?? i) : 'o:' + entry.value">
            <ComboboxSeparator
                v-if="i > 0 && (Array.isArray(entry.options) || Array.isArray(options[i - 1].options))"
                class="-mx-1 my-1 h-px bg-border"
            />
            <ComboboxGroup v-if="Array.isArray(entry.options)">
              <ComboboxLabel v-if="entry.label" class="h-control px-control-x items-center flex text-xs text-faint">
                {{ entry.label }}
              </ComboboxLabel>
              <ComboboxItem
                  v-for="opt in entry.options"
                  :key="opt.value"
                  :value="opt.value"
                  :disabled="opt.disabled"
                  :class="itemClass"
              >
                <span class="flex-1 truncate text-left">{{ opt.label }}</span>
                <ComboboxItemIndicator>
                  <Check class="size-icon-small shrink-0 text-foreground"/>
                </ComboboxItemIndicator>
              </ComboboxItem>
            </ComboboxGroup>
            <ComboboxItem
                v-else
                :value="entry.value"
                :disabled="entry.disabled"
                :class="itemClass"
            >
              <span class="flex-1 truncate text-left">{{ entry.label }}</span>
              <ComboboxItemIndicator>
                <Check class="size-icon-small shrink-0 text-foreground"/>
              </ComboboxItemIndicator>
            </ComboboxItem>
          </template>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
