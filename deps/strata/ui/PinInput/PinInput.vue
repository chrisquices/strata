<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, watch } from 'vue';
import { PinInputRoot, PinInputInput } from 'reka-ui';

const props = defineProps({
  length: { type: Number, default: 6 },
  mask: { type: Boolean, default: false },
  otp: { type: Boolean, default: true },
  type: { type: String as PropType<'text' | 'number'>, default: 'text', validator: (value: string) => ['text', 'number'].includes(value) },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
});
const model = defineModel<string>({ default: '' });
// reka's model is an array of chars; we expose a plain string and keep the two in sync via the watches below.
const cells = ref((model.value || '').split(''));

watch(cells, currentCells => { model.value = currentCells.join(''); }, { deep: true });
watch(model, currentModel => {
  const joined = cells.value.join('');
  if ((currentModel || '') !== joined) cells.value = (currentModel || '').split('');
});

const cellClass =
  'flex h-control w-10 items-center justify-center rounded-medium border border-border bg-input text-center text-sm text-foreground transition-colors duration-100 focus:border-foreground focus:outline-none focus:ring-2 focus:ring-foreground/30';
</script>

<template>
  <PinInputRoot
    v-model="cells"
    :mask="mask"
    :otp="otp"
    :type="type"
    :disabled="disabled"
    :name="name"
    :required="required"
    :class="['flex gap-2', disabled ? 'cursor-not-allowed opacity-50' : '']"
  >
    <PinInputInput v-for="cell in length" :key="cell" :index="cell - 1" :class="cellClass" />
  </PinInputRoot>
</template>
