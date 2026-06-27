<script lang="ts">

// Module scope: defineProps is hoisted and can't see <script setup> consts.
const LEVELS = [1, 2, 3, 4, 5, 6];
</script>

<script setup lang="ts">
import {computed} from 'vue';
import {AccordionHeader} from 'reka-ui';

const props = defineProps({
  level: {
    type: [Number, String],
    default: 3,
    validator: function (value: string | number) {
      return LEVELS.includes(Number(value));
    }
  },
});

const headingTag = computed(function () {
  return LEVELS.includes(Number(props.level)) ? `h${Number(props.level)}` : 'h3';
});
</script>

<template>
  <AccordionHeader :as="headingTag" class="flex">
    <slot/>
  </AccordionHeader>
</template>
