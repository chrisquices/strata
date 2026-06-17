<script setup lang="ts">
// Uses native CSS aspect-ratio rather than reka's AspectRatio. reka leans on
// the old padding-bottom trick with an extra inner element and only takes a
// numeric ratio; native aspect-ratio needs no wrapper and accepts any CSS
// value, including string forms like "16 / 9".
defineProps({
  ratio: {
    type: [String, Number],
    default: '16 / 9',
    validator: (value: string | number) => CSS.supports('aspect-ratio', String(value)),
  },
});
</script>

<template>
  <div class="min-h-0 w-full overflow-hidden" :style="{ aspectRatio: ratio }">
    <slot/>
  </div>
</template>
