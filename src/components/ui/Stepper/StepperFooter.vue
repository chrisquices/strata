<script setup lang="ts">
import { computed, inject } from 'vue';
import { injectStepperRootContext } from 'reka-ui';
import Button from '../Button/Button.vue';

const props = defineProps({
  cancelLabel: { type: String, default: 'Cancel' },
  backLabel: { type: String, default: 'Back' },
  continueLabel: { type: String, default: 'Continue' },
  finishLabel: { type: String, default: 'Finish' },
});

const root = injectStepperRootContext();
const kit = inject('stepperKit', { onCancel: () => {}, onComplete: () => {} });

const total = computed(() => root.totalStepperItems.value.size);
const isFirst = computed(() => root.modelValue.value <= 1);
// Guard total>0: items register on mount, so without it the primary button would flash "Finish" on first paint.
const isLast = computed(() => total.value > 0 && root.modelValue.value >= total.value);
const primaryLabel = computed(() => (isLast.value ? props.finishLabel : props.continueLabel));

function next() {
  if (isLast.value) kit.onComplete();
  else root.changeModelValue(root.modelValue.value + 1);
}
function prev() {
  if (!isFirst.value) root.changeModelValue(root.modelValue.value - 1);
}
</script>

<template>
  <div class="flex items-center border-t border-border px-6 py-4">
    <Button variant="ghost" @click="kit.onCancel()">{{ cancelLabel }}</Button>
    <div class="ml-auto flex items-center gap-2">
      <Button v-if="!isFirst" variant="ghost" @click="prev">{{ backLabel }}</Button>
      <Button variant="primary" @click="next">{{ primaryLabel }}</Button>
    </div>
  </div>
</template>
