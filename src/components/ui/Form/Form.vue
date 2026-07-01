<script setup lang="ts">
import {cn} from '../utils';
</script>

<template>
  <form :class="cn('grid w-full gap-form', $attrs.class)">
    <slot />
  </form>
</template>
