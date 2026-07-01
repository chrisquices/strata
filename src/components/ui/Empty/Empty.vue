<script setup lang="ts">
import {cn} from '../utils';
</script>

<template>
  <div
      :class="cn('flex flex-col items-center justify-center gap-stack-small px-container-large py-section-large text-center', $attrs.class)">
    <slot/>
  </div>
</template>
