<script setup lang="ts">
import type { PropType } from 'vue';
// Mutually exclusive options. Compose: RadioGroup > RadioGroupItem. v-model holds the chosen value;
// arrow keys move between items. `orientation` sets layout + arrow direction; `name` enables form submission.
import { computed } from 'vue';
import { RadioGroupRoot } from 'reka-ui';

const props = defineProps({
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical', validator: (value: string) => ['vertical', 'horizontal'].includes(value) },
});
const model = defineModel<string>();

// Provide a sensible default layout; orientation also drives reka's arrow-key direction.
const layout = computed(() => (props.orientation === 'horizontal' ? 'flex flex-row flex-wrap gap-x-5 gap-y-2' : 'flex flex-col gap-3'));
</script>

<template>
  <RadioGroupRoot
    v-model="model"
    :disabled="disabled"
    :name="name"
    :required="required"
    :orientation="orientation"
    :class="layout"
  >
    <slot />
  </RadioGroupRoot>
</template>
