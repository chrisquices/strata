<script setup lang="ts">
import type { PropType } from 'vue';
import { Primitive } from 'reka-ui';

defineProps({
  asChild: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String as PropType<'button' | 'submit' | 'reset'>, default: 'button', validator: (value: string) => ['button', 'submit', 'reset'].includes(value) },
});
</script>

<template>
  <Primitive
    :as-child="asChild"
    as="button"
    :type="asChild ? undefined : type"
    :disabled="!asChild && disabled ? true : undefined"
    :aria-disabled="asChild && disabled ? 'true' : undefined"
    :data-disabled="disabled || undefined"
    class="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-small text-muted transition-colors duration-100 hover:bg-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 data-[disabled]:pointer-events-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 group-data-[collapsed]/sidebar:hidden"
  >
    <slot />
  </Primitive>
</template>
