<script setup lang="ts">

// On/off toggle built on reka's Switch. The default slot renders a SwitchThumb; override it to customize.
// v-model:checked binds the state.
import type { PropType } from 'vue';
import { SwitchRoot } from 'reka-ui';
import SwitchThumb from './SwitchThumb.vue';

defineProps({
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  size: {
    type: String as PropType<'sm' | 'md' | 'lg'>,
    default: 'md',
    validator: (value: string) => ['sm', 'md', 'lg'].includes(value),
  },
});

const trackSizeClass = {sm: 'h-4 w-7', md: 'h-5 w-9', lg: 'h-6 w-11'};

const checked = defineModel<boolean>('checked', { default: false });
</script>

<template>
  <SwitchRoot
    v-model="checked"
    :disabled="disabled"
    :name="name"
    :required="required"
    :class="['relative inline-flex shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 data-[state=checked]:bg-foreground data-[state=unchecked]:bg-border', trackSizeClass[size], disabled ? 'cursor-not-allowed opacity-50' : '']"
  >
    <slot>
      <SwitchThumb :size="size" />
    </slot>
  </SwitchRoot>
</template>
