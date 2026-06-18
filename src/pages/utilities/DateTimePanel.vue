<script setup>
import { ref, computed } from 'vue';
import { ChevronLeft, ChevronRight, ChevronDown, CornerDownLeft, AlertCircle, Check, Clock, CalendarDays } from '@lucide/vue';

const props = defineProps({
  picker: { required: true },
  dpState: { required: true },
  showPresets: { type: Boolean, default: false },
  showRelative: { type: Boolean, default: false },
  showTypedInput: { type: Boolean, default: false },
  presets: { default: () => [] },
  onTyped: { default: null },
});

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const view = ref('days');
const yearPage = ref(0);
const hour12 = ref(true);

const toJs = (c) => (c ? new Date(c.year, c.month - 1, c.day, c.hour || 0, c.minute || 0, c.second || 0) : null);
const FMT = { full: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }, medium: { month: 'short', day: 'numeric', year: 'numeric' } };
function fmtDate(c, style = 'full') { const d = toJs(c); return d ? new Intl.DateTimeFormat(undefined, FMT[style]).format(d) : ''; }
function fmtTime(c, seconds) { const d = toJs(c); if (!d) return ''; return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: seconds ? '2-digit' : undefined, hour12: hour12.value }).format(d); }
const REL = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
function relative(c) {
  if (!c || !props.dpState.today) return '';
  const a = new Date(c.year, c.month - 1, c.day), b = new Date(props.dpState.today.year, props.dpState.today.month - 1, props.dpState.today.day);
  const days = Math.round((a - b) / 86400000);
  if (Math.abs(days) >= 365) return REL.format(Math.round(days / 365), 'year');
  if (Math.abs(days) >= 30) return REL.format(Math.round(days / 30), 'month');
  if (Math.abs(days) >= 7) return REL.format(Math.round(days / 7), 'week');
  return REL.format(days, 'day');
}

const typed = ref('');
const parseMsg = ref(null);
const parseOk = ref(false);
function runParse() {
  if (!typed.value.trim()) { parseMsg.value = null; return; }
  const civ = props.onTyped ? props.onTyped(typed.value) : null;
  if (civ) { const res = props.picker.setDate(civ); parseOk.value = res.accepted; parseMsg.value = res.accepted ? fmtDate(civ, 'medium') : (res.reason === 'disabled' ? 'That date is disabled' : 'Out of range'); }
  else { parseOk.value = false; parseMsg.value = null; }
}

const time = computed(() => props.dpState.time);
const displayHour = computed(() => (hour12.value ? (((time.value.hour + 11) % 12) + 1) : time.value.hour));
function setHour(v) { let h = parseInt(v, 10) || 0; if (hour12.value) { const pm = time.value.hour >= 12; h = (h % 12) + (pm ? 12 : 0); } props.picker.setTime({ hour: h }); }
function toggleMeridiem() { props.picker.setTime({ hour: (time.value.hour + 12) % 24 }); }

const headerLabel = computed(() =>
  view.value === 'days' ? `${MONTHS[props.dpState.view.month - 1]} ${props.dpState.view.year}`
    : view.value === 'months' ? `${props.dpState.view.year}`
    : (() => { const y = props.picker.getYearPickerData(yearPage.value); return `${y.startYear}–${y.endYear}`; })(),
);
function headerClick() { view.value = view.value === 'days' ? 'months' : view.value === 'months' ? 'years' : 'days'; }
function prev() { if (view.value === 'days') props.picker.prevMonth(); else if (view.value === 'months') props.picker.prevYear(); else yearPage.value -= 1; }
function next() { if (view.value === 'days') props.picker.nextMonth(); else if (view.value === 'months') props.picker.nextYear(); else yearPage.value += 1; }

const isRange = computed(() => props.dpState.mode === 'range');
</script>

<template>
  <div class="flex w-full flex-col gap-2.5">
    <div v-if="showTypedInput" class="flex flex-col gap-1.5">
      <div :class="['flex h-control items-center gap-2 rounded-medium border bg-input px-2.5 transition-colors', typed && parseMsg && !parseOk ? 'border-destructive' : 'border-border focus-within:border-foreground']">
        <input v-model="typed" placeholder="Try “next friday”, “03/15”, “in 2 weeks”…" spellcheck="false" class="w-full bg-transparent text-sm text-foreground placeholder:text-faint focus-visible:outline-none" @input="runParse" @keydown="(e) => e.key === 'Enter' && runParse()" />
        <CornerDownLeft class="size-icon-small shrink-0 text-faint" />
      </div>
      <p v-if="parseMsg && parseOk" class="flex items-center gap-1 text-[11px] text-success"><Check class="size-icon-extra-small" /> Understood → {{ parseMsg }}</p>
      <p v-else-if="typed && parseMsg" class="flex items-center gap-1 text-[11px] text-destructive"><AlertCircle class="size-icon-extra-small" /> {{ parseMsg }}</p>
      <p v-else-if="typed" class="flex items-center gap-1 text-[11px] text-destructive"><AlertCircle class="size-icon-extra-small" /> Couldn't read that date.</p>
    </div>

    <div class="flex gap-3">
      <div v-if="showPresets && isRange" class="flex w-[5.5rem] shrink-0 flex-col gap-0.5 border-r border-border pr-2">
        <button v-for="p in presets" :key="p.label" type="button" class="rounded-medium px-2 py-1 text-left text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none" @click="p.apply()">{{ p.label }}</button>
      </div>

      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex items-center justify-between">
          <button type="button" :disabled="view === 'days' && !dpState.canGoPrev" aria-label="Previous" :class="['grid size-6 place-items-center rounded-medium transition-colors focus-visible:outline-none', view === 'days' && !dpState.canGoPrev ? 'cursor-not-allowed text-faint/30' : 'text-muted hover:bg-surface hover:text-foreground']" @click="prev"><ChevronLeft class="size-icon-small" /></button>
          <button type="button" class="flex items-center gap-1 rounded-medium px-2 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-surface focus-visible:outline-none" @click="headerClick">{{ headerLabel }}<ChevronDown class="size-icon-small text-faint" /></button>
          <button type="button" :disabled="view === 'days' && !dpState.canGoNext" aria-label="Next" :class="['grid size-6 place-items-center rounded-medium transition-colors focus-visible:outline-none', view === 'days' && !dpState.canGoNext ? 'cursor-not-allowed text-faint/30' : 'text-muted hover:bg-surface hover:text-foreground']" @click="next"><ChevronRight class="size-icon-small" /></button>
        </div>

        <div v-if="view === 'days'" class="grid grid-cols-7">
          <div v-for="w in dpState.weekdays" :key="w.index" class="grid h-6 place-items-center text-[10px] font-medium uppercase tracking-wider text-faint">{{ WD[w.index][0] }}</div>
          <div v-for="cell in dpState.cells" :key="cell.key" :class="['relative flex justify-center py-0.5', cell.isInRange ? 'bg-foreground/12' : '', cell.isInRange && cell.isRangeStart ? 'rounded-l-medium' : '', cell.isInRange && cell.isRangeEnd ? 'rounded-r-medium' : '']">
            <button
              type="button"
              :disabled="cell.isDisabled"
              :class="['relative grid size-7 place-items-center rounded-medium text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40',
                cell.isDisabled ? 'cursor-not-allowed text-faint/40 line-through' : 'cursor-default',
                !cell.isCurrentMonth && !cell.isSelected ? 'text-faint' : cell.isDisabled ? '' : 'text-foreground',
                cell.isSelected ? 'bg-foreground font-medium text-background' : cell.isDisabled ? '' : 'hover:bg-surface']"
              @click="picker.selectDate(cell.date)"
              @pointerenter="isRange && picker.setHovered(cell.date)"
            >
              {{ cell.day }}
              <span v-if="cell.isToday && !cell.isSelected" class="absolute bottom-1 size-1 rounded-full bg-foreground"></span>
            </button>
          </div>
        </div>
        <div v-else-if="view === 'months'" class="grid grid-cols-3 gap-1.5 py-0.5">
          <button v-for="m in picker.getMonthPickerData().months" :key="m.month" type="button" :disabled="m.isDisabled" :class="['rounded-medium py-2 text-[11px] transition-colors focus-visible:outline-none', m.isDisabled ? 'cursor-not-allowed text-faint/30' : m.isCurrentMonth ? 'bg-foreground text-background' : 'text-muted hover:bg-surface hover:text-foreground']" @click="picker.goToMonth(picker.getMonthPickerData().year, m.month); view = 'days';">{{ MONTHS[m.month - 1].slice(0, 3) }}</button>
        </div>
        <div v-else class="grid grid-cols-3 gap-1.5 py-0.5">
          <button v-for="y in picker.getYearPickerData(yearPage).years" :key="y.year" type="button" :disabled="y.isDisabled" :class="['rounded-medium py-2 text-[11px] transition-colors focus-visible:outline-none', y.isDisabled ? 'cursor-not-allowed text-faint/30' : y.isCurrentYear ? 'bg-foreground text-background' : 'text-muted hover:bg-surface hover:text-foreground']" @click="picker.goToMonth(y.year, dpState.view.month); view = 'months';">{{ y.year }}</button>
        </div>
      </div>
    </div>

    <div v-if="time.enabled" class="flex items-center gap-2 border-t border-border pt-3">
      <Clock class="size-icon-small text-faint" />
      <div class="flex items-center gap-1 rounded-medium border border-border bg-input px-1.5">
        <input :value="String(displayHour).padStart(2, '0')" class="w-7 bg-transparent py-1 text-center font-mono text-xs text-foreground focus-visible:outline-none" @change="(e) => setHour(e.currentTarget.value)" />
        <span class="text-faint">:</span>
        <input :value="String(time.minute).padStart(2, '0')" class="w-7 bg-transparent py-1 text-center font-mono text-xs text-foreground focus-visible:outline-none" @change="(e) => picker.setTime({ minute: parseInt(e.currentTarget.value, 10) || 0 })" />
      </div>
      <button v-if="hour12" type="button" class="rounded-medium border border-border px-2 py-1 text-xs text-foreground transition-colors hover:bg-surface focus-visible:outline-none" @click="toggleMeridiem">{{ time.period.toUpperCase() }}</button>
      <div class="ml-auto inline-flex overflow-hidden rounded-medium border border-border text-[11px]">
        <button type="button" :class="['px-2 py-1', hour12 ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="hour12 = true">12h</button>
        <button type="button" :class="['px-2 py-1', !hour12 ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="hour12 = false">24h</button>
      </div>
    </div>

    <div class="flex items-center gap-1.5">
      <button type="button" class="rounded-medium border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none" @click="picker.goToToday()">Today</button>
      <button v-if="isRange ? dpState.range.start : dpState.selected" type="button" class="inline-flex items-center gap-1 rounded-medium border border-border px-2 py-1 text-[11px] text-muted transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none" @click="picker.goToSelected()"><CalendarDays class="size-icon-extra-small" /> Go to selection</button>
    </div>

    <div class="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border pt-3 text-xs">
      <template v-if="isRange">
        <template v-if="dpState.range.start">
          <span class="font-medium text-foreground">{{ fmtDate(dpState.range.start, 'medium') }}</span><span class="text-faint">→</span>
          <span class="font-medium text-foreground">{{ dpState.range.end ? fmtDate(dpState.range.end, 'medium') : (dpState.provisionalRange ? fmtDate(dpState.provisionalRange.end, 'medium') : '…') }}</span>
          <span v-if="dpState.range.length" class="text-muted">· {{ dpState.range.length }} days</span>
          <span v-else-if="dpState.provisionalRange" class="text-muted">· {{ dpState.provisionalRange.length }} days</span>
        </template>
        <span v-else class="text-faint">Select a start date</span>
      </template>
      <template v-else-if="dpState.selected">
        <span class="font-medium text-foreground">{{ fmtDate(dpState.selected, 'full') }}</span>
        <span v-if="time.enabled" class="text-muted">· {{ fmtTime(dpState.selected, false) }}</span>
        <span v-if="showRelative" class="rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted">{{ relative(dpState.selected) }}</span>
      </template>
      <span v-else class="text-faint">No date selected</span>
    </div>
  </div>
</template>
