<script setup lang="ts">
import {cn} from '../utils';

defineOptions({inheritAttrs: false});
</script>

<!-- Gains a second column only when a CardAction is present (the has-[] hook). -->
<template>
  <div
      v-bind="$attrs"
      :class="cn('grid auto-rows-min grid-rows-[auto_auto] items-start gap-stack-small p-container has-[[data-card-action]]:grid-cols-[1fr_auto]', $attrs.class)">
    <slot/>
  </div>
</template>
