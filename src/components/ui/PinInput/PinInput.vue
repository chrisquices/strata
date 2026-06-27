<script setup lang="ts">
import type { PropType } from 'vue';
import { ref, watch } from 'vue';
import { PinInputRoot } from 'reka-ui';

defineProps({
  mask: { type: Boolean, default: false },
  otp: { type: Boolean, default: true },
  type: {
    type: String as PropType<'text' | 'number'>,
    default: 'text',
    validator: function (value) { return ['text', 'number'].includes(value); },
  },
  disabled: { type: Boolean, default: false },
  name: { type: String, default: undefined },
  required: { type: Boolean, default: false },
  placeholder: { type: String, default: undefined },
  id: { type: String, default: undefined },
});

const emit = defineEmits(['complete']);
const model = defineModel<string>({ default: '' });

// reka's model is an array of chars; we expose a plain string and keep the two in sync via the watches below.
const cells = ref((model.value || '').split(''));

watch(cells, function (currentCells) { model.value = currentCells.join(''); }, { deep: true });
watch(model, function (currentModel) {
  const joined = cells.value.join('');
  if ((currentModel || '') !== joined) cells.value = (currentModel || '').split('');
});

function onComplete(value) {
  emit('complete', value.join(''));
}
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
    :placeholder="placeholder"
    :id="id"
    :class="['flex gap-2', disabled ? 'cursor-not-allowed opacity-50' : '']"
    @complete="onComplete"
  >
    <slot />
  </PinInputRoot>
</template>
