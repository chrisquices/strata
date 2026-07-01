<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import type {PropType} from 'vue';
import {Check, ChevronDown} from '@lucide/vue';
import {
  ComboboxRoot, ComboboxAnchor, ComboboxInput, ComboboxTrigger,
  ComboboxPortal, ComboboxContent, ComboboxViewport,
  ComboboxGroup, ComboboxLabel, ComboboxItem, ComboboxItemIndicator,
  ComboboxSeparator, ComboboxEmpty,
} from 'reka-ui';
import Chip from '../Chip/Chip.vue';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

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
    default: () => []
  },
  disabled: {type: Boolean, default: false},
  multiple: {type: Boolean, default: false},
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  placeholder: {type: String, default: undefined},
  ariaLabel: {type: String, default: undefined},
  ariaLabelledby: {type: String, default: undefined},
  side: {
    type: String as PropType<'top' | 'right' | 'bottom' | 'left'>,
    default: 'bottom',
    validator: (value: string) => ['top', 'right', 'bottom', 'left'].includes(value)
  },
  sideOffset: {type: Number, default: 4},
});

const model = defineModel<string | number | (string | number)[]>();

const flat = computed(() => props.options.flatMap(option => Array.isArray(option.options) ? option.options : [option])); // Flatten groups so we can map a selected value to its label.

const labelFor = computed(() => new Map(flat.value.map(option => [option.value, option.label])));

const chips = computed(() => (Array.isArray(model.value) ? model.value : []).map(value => ({
  value,
  label: labelFor.value.get(value) ?? String(value)
})));

const paddingClass = {sm: 'px-control-x-small', md: 'px-control-x', lg: 'px-control-x-large'};

const textClass = {sm: 'text-xs', md: 'text-sm', lg: 'text-base'};

const heightClass = {sm: 'h-control-small', md: 'h-control', lg: 'h-control-large'};

const minHeightClass = {sm: 'min-h-control-small', md: 'min-h-control', lg: 'min-h-control-large'};

const chevronClass = {sm: 'size-[calc(var(--spacing-control-small)-2px)] -mr-control-x-small', md: 'size-[calc(var(--spacing-control)-2px)] -mr-control-x', lg: 'size-[calc(var(--spacing-control-large)-2px)] -mr-control-x-large'};

const anchorRef = ref();

const isWrapped = ref(false);

const anchorClass = computed(function () {
  return [
    'group flex w-full items-center gap-cluster-small rounded-medium border border-border bg-input transition-colors hover:border-foreground/30 focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30 focus-within:ring-offset-2 focus-within:ring-offset-background',
    textClass[props.size],
    props.multiple ? `${minHeightClass[props.size]} flex-wrap gap-1.5 px-1.5 ${isWrapped.value ? 'py-1.5' : ''}` : `${heightClass[props.size]} ${paddingClass[props.size]} justify-between`,
    props.disabled ? 'pointer-events-none opacity-50' : '',
  ];
});

const baseClass = 'flex w-full cursor-default items-center gap-cluster-small rounded-medium text-foreground transition-colors duration-100 select-none focus-visible:outline-none hover:bg-border data-[disabled]:cursor-not-allowed data-[disabled]:text-faint';

const open = ref(false);

// Single-select shows the chosen label in the input; multi-select keeps the input empty (filter only).
function displayValue(value: any) {
  return props.multiple || value === undefined || value === null ? '' : (labelFor.value.get(value) ?? String(value));
}

function removeChip(value: string | number) {
  if (Array.isArray(model.value)) model.value = model.value.filter(function (item) {
    return item !== value;
  });
}

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

// Only pad the field once chips wrap to a second row — a single row stays at the control height,
// wrapped rows get breathing space. items-center makes same-row items differ by a couple px, so a
// row jump is anything clearing a 4px threshold below the first child.
function measureWrap() {
  const el = anchorRef.value?.$el ?? anchorRef.value;

  if (!el || !el.children || el.children.length < 2) {
    isWrapped.value = false;
    return;
  }

  const children = Array.from(el.children) as HTMLElement[];
  const firstTop = children[0].offsetTop;
  isWrapped.value = children.some(child => child.offsetTop - firstTop > 4);
}

let wrapObserver: ResizeObserver | null = null;

onMounted(function () {
  const el = anchorRef.value?.$el ?? anchorRef.value;

  if (!el || typeof ResizeObserver === 'undefined') return;

  wrapObserver = new ResizeObserver(measureWrap);
  wrapObserver.observe(el);
  measureWrap();
});

onBeforeUnmount(function () {
  if (wrapObserver) wrapObserver.disconnect();
});

// Chips added/removed at constant width reflow without a resize, so re-measure after the DOM updates.
watch(chips, function () {
  nextTick(measureWrap);
});
</script>

<template>
  <ComboboxRoot v-model="model" v-model:open="open" :multiple="props.multiple" :disabled="props.disabled"
                :name="props.name"
                :required="props.required">
    <ComboboxAnchor ref="anchorRef" v-bind="$attrs" :class="cn(anchorClass, $attrs.class)" @focusin="onAnchorFocusIn"
                    @focusout="onAnchorFocusOut">
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
          :disabled="props.disabled"
          :placeholder="props.placeholder"
          :aria-label="props.ariaLabel"
          :aria-labelledby="props.ariaLabelledby"
          class="min-w-0 flex-1 truncate bg-transparent text-left text-foreground placeholder:text-faint focus-visible:outline-none"
      />
      <ComboboxTrigger v-if="!props.multiple"
                       :class="['group flex shrink-0 items-center justify-center', chevronClass[props.size]]"
                       aria-label="Toggle options">
        <ChevronDown
            class="size-icon-small shrink-0 text-muted transition-transform duration-200 group-data-[state=open]:rotate-180"
            aria-hidden="true"/>
      </ComboboxTrigger>
    </ComboboxAnchor>

    <ComboboxPortal>
      <ComboboxContent
          :side="props.side"
          :side-offset="props.sideOffset"
          position="popper"
          @mousedown="keepFocus"
          class="strata-menu-pop z-popover max-h-96 min-w-[var(--reka-combobox-trigger-width,8rem)] overflow-hidden rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <ComboboxViewport class="max-h-52 overflow-y-auto p-cluster-small">
          <ComboboxEmpty class="px-control-x-small py-4 text-center text-xs text-faint">
            <slot>No results</slot>
          </ComboboxEmpty>
          <template v-for="(entry, i) in props.options"
                    :key="Array.isArray(entry.options) ? 'g:' + (entry.label ?? i) : 'o:' + entry.value">
            <ComboboxSeparator
                v-if="i > 0 && (Array.isArray(entry.options) || Array.isArray(props.options[i - 1].options))"
                class="-mx-cluster-small my-cluster-small h-px bg-border"
            />
            <ComboboxGroup v-if="Array.isArray(entry.options)">
              <ComboboxLabel v-if="entry.label" :class="[heightClass[props.size], paddingClass[props.size], 'items-center flex text-xs text-faint']">
                {{ entry.label }}
              </ComboboxLabel>
              <ComboboxItem
                  v-for="opt in entry.options"
                  :key="opt.value"
                  :value="opt.value"
                  :disabled="opt.disabled"
                  :class="[baseClass, heightClass[props.size], paddingClass[props.size], textClass[props.size]]"
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
                :class="[baseClass, heightClass[props.size], paddingClass[props.size], textClass[props.size]]"
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
