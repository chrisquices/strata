<script setup lang="ts">
// A color picker built on reka's Color primitives: a saturation/brightness area + a hue slider +
// a hex field + preset swatches. v-model is a hex string ("#3b82f6"). reka's color components accept
// a string directly and emit hex back, so all four pieces bind the same model and stay in sync.
import { computed } from 'vue';
import type { PropType } from 'vue';
import {
  ColorAreaRoot, ColorAreaArea, ColorAreaThumb,
  ColorSliderRoot, ColorSliderTrack, ColorSliderThumb,
  ColorFieldRoot, ColorFieldInput,
  ColorSwatchPickerRoot, ColorSwatchPickerItem, ColorSwatchPickerItemSwatch,
} from 'reka-ui';

defineProps({
  disabled: { type: Boolean, default: false },
  swatches: { type: Array as PropType<string[]>, default: () => ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#64748b', '#1c1d21', '#ffffff'] },
});
const model = defineModel<string>({ default: '#3b82f6' });

// Hue (0–360) from the hex, computed directly so the area gradient tracks the current color.
function hexHue(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
  if (!m) return 0;
  const r = parseInt(m[1], 16) / 255, g = parseInt(m[2], 16) / 255, b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  if (d === 0) return 0;
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = Math.round(h * 60);
  return h < 0 ? h + 360 : h;
}
// reka doesn't paint the area gradient — build the sat/bright plane for the current hue ourselves.
const areaStyle = computed(() => ({
  backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hexHue(model.value)}, 100%, 50%))`,
}));

const thumb = 'size-4 rounded-full border-2 border-white shadow ring-1 ring-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground';
</script>

<template>
  <div :class="['flex w-60 flex-col gap-3', disabled ? 'pointer-events-none opacity-50' : '']" :aria-disabled="disabled || undefined">
    <ColorAreaRoot v-model="model" color-space="hsb" x-channel="saturation" y-channel="brightness" :disabled="disabled" aria-label="Saturation and brightness" class="h-40 w-full overflow-hidden rounded-medium border border-border">
      <ColorAreaArea class="relative size-full" :style="areaStyle">
        <ColorAreaThumb :class="['absolute -translate-x-1/2 -translate-y-1/2', thumb]" />
      </ColorAreaArea>
    </ColorAreaRoot>

    <div class="flex items-center gap-3">
      <ColorSliderRoot v-model="model" channel="hue" color-space="hsb" :disabled="disabled" aria-label="Hue" class="relative flex h-4 flex-1 items-center">
        <ColorSliderTrack class="relative h-3 w-full rounded-full border border-border">
          <ColorSliderThumb :class="['absolute top-1/2 -translate-y-1/2', thumb]" />
        </ColorSliderTrack>
      </ColorSliderRoot>
      <div class="size-9 shrink-0 rounded-medium border border-border" :style="{ backgroundColor: model }" aria-hidden="true"></div>
    </div>

    <ColorFieldRoot v-model="model" :disabled="disabled">
      <ColorFieldInput class="h-control w-full rounded-medium border border-border bg-input px-3 text-sm uppercase tabular-nums text-foreground transition-colors hover:border-foreground/40 focus-visible:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30" />
    </ColorFieldRoot>

    <ColorSwatchPickerRoot v-model="model" class="flex flex-wrap gap-1.5">
      <ColorSwatchPickerItem
        v-for="s in swatches"
        :key="s"
        :value="s"
        class="size-6 cursor-pointer rounded-medium border border-border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 data-[state=checked]:ring-2 data-[state=checked]:ring-foreground data-[state=checked]:ring-offset-1 data-[state=checked]:ring-offset-background"
      >
        <ColorSwatchPickerItemSwatch class="size-full rounded-[5px]" :style="{ backgroundColor: s }" />
      </ColorSwatchPickerItem>
    </ColorSwatchPickerRoot>
  </div>
</template>
