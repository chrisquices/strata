<script setup lang="ts">
defineProps({
  file: { type: String, default: '' },
  intro: { type: String, default: '' },
  principles: { type: Array, default: () => [] },
  legend: { type: Array, default: () => [] },
  groups: { type: Array, default: () => [] },
  enums: { type: Array, default: () => [] },
});
</script>

<template>
  <section class="order-2 flex flex-col gap-7">
    <div class="flex flex-col gap-2 border-b border-border pb-5">
      <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Headless</span>
      <h3 class="text-xl font-medium tracking-tight text-foreground">The engine API</h3>
      <p class="max-w-2xl text-sm leading-relaxed text-muted">
        <code class="rounded-small bg-input px-1.5 py-0.5 font-mono text-[12px] text-foreground">{{ file }}</code>
        <template v-if="intro"> {{ intro }}</template>
      </p>
    </div>

    <div v-if="principles.length" class="flex flex-wrap gap-2">
      <span v-for="p in principles" :key="String(p)" class="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-muted">
        <span class="size-1.5 rounded-full bg-success"></span>{{ p }}
      </span>
    </div>

    <div v-if="legend.length" class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div v-for="item in legend" :key="item.name" class="rounded-large border border-border bg-surface p-4">
        <code class="font-mono text-[12px] text-foreground">{{ item.name }}</code>
        <p class="mt-1 text-[12px] leading-relaxed text-muted">{{ item.desc }}</p>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4">
      <div v-for="group in groups" :key="group.label" class="flex flex-col gap-4 rounded-large border border-border bg-surface p-5">
        <div class="flex items-center gap-2">
          <component :is="group.icon" v-if="group.icon" class="size-icon-small text-faint" />
          <h4 class="text-xs font-medium uppercase tracking-widest text-faint">{{ group.label }}</h4>
        </div>
        <div class="flex flex-col divide-y divide-border/50">
          <div v-for="method in group.methods" :key="method.sig" class="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
            <code class="font-mono text-[12.5px] leading-snug text-foreground">{{ method.sig }}</code>
            <span v-if="method.ret" class="font-mono text-[11px] text-muted">→ {{ method.ret }}</span>
            <p v-if="method.desc" class="mt-0.5 text-[12px] leading-relaxed text-muted">{{ method.desc }}</p>
          </div>
        </div>
      </div>

      <div v-if="enums.length" class="rounded-large border border-border bg-surface p-5">
        <h4 class="mb-4 text-xs font-medium uppercase tracking-widest text-faint">Enums</h4>
        <div class="flex flex-col gap-4">
          <div v-for="en in enums" :key="en.name" class="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
            <code class="w-28 shrink-0 pt-0.5 font-mono text-[12.5px] text-foreground">{{ en.name }}</code>
            <div class="flex flex-col gap-1.5">
              <div class="flex flex-wrap gap-1.5">
                <span v-for="val in en.values" :key="val" class="rounded-full border border-border bg-input px-2 py-0.5 font-mono text-[10.5px] text-muted">{{ val }}</span>
              </div>
              <p v-if="en.note" class="text-[11px] text-faint">{{ en.note }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
