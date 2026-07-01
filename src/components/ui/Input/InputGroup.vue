<script lang="ts">
let uid = 0;
</script>

<script setup lang="ts">
import type {PropType} from 'vue';
import {reactive, computed, provide, ref} from 'vue';
import FieldErrorTooltip from '../Shared/FieldErrorTooltip.vue';
import {cn} from '../utils';

const props = defineProps({
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: function (value: string) {
      return ['sm', 'md', 'lg'].includes(value);
    }
  },
  invalid: {type: Boolean, default: false},
});

const groupError = ref('');
const groupErrorId = `strata-input-group-error-${++uid}`;

provide('inputGroup', reactive({
  size: computed(function () {
    return props.size;
  }),
  invalid: computed(function () {
    return props.invalid || !!groupError.value;
  }),
  errorId: groupErrorId,
  registerError: function (msg: string) {
    groupError.value = msg;
  },
  clearError: function () {
    groupError.value = '';
  },
}));

const sizeClass = {sm: 'h-control-small text-xs', md: 'h-control text-sm', lg: 'h-control-large text-base'};
const isInvalid = computed(function () {
  return props.invalid || !!groupError.value;
});
const borderClass = computed(function () {
  return isInvalid.value
      ? 'border-destructive focus-within:ring-2 focus-within:ring-destructive/40'
      : 'border-border focus-within:border-foreground focus-within:ring-2 focus-within:ring-foreground/30';
});
</script>

<template>
  <FieldErrorTooltip :id="groupErrorId" :message="groupError">
    <div
        :class="cn('flex overflow-hidden rounded-medium border transition-colors duration-100', borderClass, sizeClass[size] ?? sizeClass.md, $attrs.class)">
      <slot/>
    </div>
  </FieldErrorTooltip>
</template>
