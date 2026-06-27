<script setup lang="ts">
defineProps({
  alignIcons: {type: Boolean, default: false},
});
</script>

<template>
  <ul class="strata-sidebar-menu-sub ml-5.75 flex flex-col border-l border-border py-1 group-data-[collapsed]/sidebar:hidden"
      :data-align-icons="alignIcons || undefined">
    <slot/>
  </ul>
</template>
