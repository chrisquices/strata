<script setup lang="ts">
import type {PropType} from 'vue';
import {
  ColorAreaRoot, ColorAreaArea, ColorAreaThumb,
  ColorSliderRoot, ColorSliderTrack, ColorSliderThumb,
  ColorFieldRoot, ColorFieldInput,
  ColorSwatchPickerRoot, ColorSwatchPickerItem, ColorSwatchPickerItemSwatch,
} from 'reka-ui';
import {cn} from '../utils';

defineOptions({inheritAttrs: false});

const props = defineProps({
  disabled: {type: Boolean, default: false},
  swatches: {
    type: Array as PropType<string[]>,
    default: () => ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#64748b', '#1c1d21', '#ffffff']
  },
});

const model = defineModel<string>({default: '#3b82f6'});

const thumbClass = 'size-indicator rounded-full border-2 border-white shadow ring-1 ring-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex w-60 flex-col gap-cluster', props.disabled ? 'pointer-events-none opacity-50' : '', $attrs.class)"
       :aria-disabled="props.disabled || undefined">
    <ColorAreaRoot v-model="model" v-slot="{ style }" color-space="hsb" x-channel="saturation" y-channel="brightness"
                   :disabled="props.disabled" aria-label="Saturation and brightness"
                   class="h-40 w-full overflow-hidden rounded-medium border border-border">
      <ColorAreaArea class="relative size-full" :style="style">
        <ColorAreaThumb :class="['absolute -translate-x-1/2 -translate-y-1/2', thumbClass]"/>
      </ColorAreaArea>
    </ColorAreaRoot>

    <div class="flex items-center gap-cluster">
      <ColorSliderRoot v-model="model" channel="hue" color-space="hsb" :disabled="props.disabled" aria-label="Hue"
                       class="relative flex h-indicator flex-1 items-center">
        <ColorSliderTrack class="relative h-indicator-small w-full rounded-full border border-border">
          <ColorSliderThumb :class="['absolute top-1/2 -translate-y-1/2', thumbClass]"/>
        </ColorSliderTrack>
      </ColorSliderRoot>
      <div class="size-control shrink-0 rounded-medium border border-border" :style="{ backgroundColor: model }"
           aria-hidden="true"></div>
    </div>

    <ColorFieldRoot v-model="model" :disabled="props.disabled">
      <ColorFieldInput
          class="h-control w-full rounded-medium border border-border bg-input px-control-x text-sm uppercase tabular-nums text-foreground transition-colors hover:border-foreground/40 focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30"/>
    </ColorFieldRoot>

    <ColorSwatchPickerRoot v-model="model" class="flex flex-wrap gap-1.5">
      <ColorSwatchPickerItem
          v-for="swatch in props.swatches"
          :key="swatch"
          :value="swatch"
          class="size-6 cursor-pointer rounded-full border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[state=checked]:ring-2 data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-1 data-[state=checked]:ring-offset-background"
      >
        <ColorSwatchPickerItemSwatch class="size-full rounded-full" :style="{ backgroundColor: swatch }"/>
      </ColorSwatchPickerItem>
    </ColorSwatchPickerRoot>
  </div>
</template>
