<script setup lang="ts">
// A date picker built on the kit's standalone Calendar. v-model is an ISO date string ("2026-06-14").
// The whole field is the popover trigger; Calendar owns the selection state.
import {computed, ref, watch} from 'vue';
import type {PropType} from 'vue';
import {CalendarDays} from '@lucide/vue';
import {PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent} from 'reka-ui';
import {dateFromIso} from '../Shared/utils';
import {cn} from '../utils';
import Calendar from '../Shared/Calendar.vue';

defineOptions({inheritAttrs: false});

const props = defineProps({
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
  minValue: {type: String, default: undefined},
  maxValue: {type: String, default: undefined},
  disabled: {type: Boolean, default: false},
  readonly: {type: Boolean, default: false},
  invalid: {type: Boolean, default: false},
  describedBy: {type: String, default: undefined},
  name: {type: String, default: undefined},
  required: {type: Boolean, default: false},
  locale: {type: String, default: undefined},
});

const model = defineModel<string>({default: ''});

const open = ref(false);

// Calendar owns selection; the picker just closes the popover once a date is set.
watch(model, function (iso) {
  if (iso) open.value = false;
});

const dateFormatter = computed(() => new Intl.DateTimeFormat(props.locale || undefined, {year: 'numeric', month: 'long', day: 'numeric'}));

const label = computed(function () {
  const date = dateFromIso(model.value);

  return date ? dateFormatter.value.format(new Date(date.year, date.month - 1, date.day)) : '';
});

const hasValue = computed(() => !!dateFromIso(model.value));

const sizeClass = {
  sm: 'h-control-small px-control-x-small text-xs',
  md: 'h-control px-control-x text-sm',
  lg: 'h-control-large px-control-x-large text-base',
};

const stateClass = computed(() => props.invalid ? 'border-destructive focus-visible:ring-destructive/40' : 'border-border hover:border-foreground/40 focus-visible:border-foreground focus-visible:ring-foreground/30');
</script>

<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child>
      <button
          v-bind="$attrs"
          type="button"
          :disabled="props.disabled"
          :aria-label="hasValue ? label : 'Open date picker'"
          :aria-invalid="props.invalid || undefined"
          :aria-describedby="props.describedBy"
          :data-invalid="props.invalid || undefined"
          :class="cn('group inline-flex w-full cursor-pointer items-center justify-between gap-cluster-small rounded-medium border bg-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50', sizeClass[props.size], stateClass, $attrs.class)"
      >
        <span :class="['truncate', hasValue ? 'text-foreground' : 'text-faint']">
          <template v-if="hasValue">{{ label }}</template>
          <slot v-else>Pick a date</slot>
        </span>
        <CalendarDays class="size-icon-small shrink-0 text-muted transition-colors group-hover:text-foreground" aria-hidden="true"/>
      </button>
    </PopoverTrigger>

    <input v-if="props.name" type="hidden" :name="props.name" :value="model"/>

    <PopoverPortal>
      <PopoverContent
          :side-offset="6"
          class="strata-menu-pop z-popover rounded-large border border-border bg-surface shadow-panel focus-visible:outline-none"
      >
        <Calendar
            v-model="model"
            :min-value="props.minValue"
            :max-value="props.maxValue"
            :disabled="props.disabled"
            :readonly="props.readonly"
            :locale="props.locale"
            class="border-0 bg-transparent"
        />
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
