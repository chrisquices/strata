<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue';
import { CalendarDays, ChevronDown, Check, AlertCircle, CornerDownLeft, Clock, ChevronsRight, Settings2, Calculator } from '@lucide/vue';
import ComponentHeader from '@app/component/ComponentHeader.vue';
import ComponentHeaderTitle from '@app/component/ComponentHeaderTitle.vue';
import ComponentHeaderDescription from '@app/component/ComponentHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Popover from '../../components/ui/Popover/Popover.vue';
import PopoverTrigger from '../../components/ui/Popover/PopoverTrigger.vue';
import PopoverContent from '../../components/ui/Popover/PopoverContent.vue';
import Slider from '../../components/ui/Slider/Slider.vue';
import Switch from '../../components/ui/Switch/Switch.vue';
import ToggleGroup from '../../components/ui/ToggleGroup/ToggleGroup.vue';
import ToggleGroupItem from '../../components/ui/ToggleGroup/ToggleGroupItem.vue';
import DateTimePanel from './DateTimePanel.vue';
import { createDatePicker, SelectionMode, addDays as addDaysCivil, fromDate, toDate } from '../../lib/datetime-engine/datetime-engine.js';

const datetimeIntro = 'createDatePicker() owns the calendar logic — the visible month grid (each cell tagged isToday / isSelected / isInRange / isDisabled), the single-or-range selection, time-of-day, navigation position and min / max / disabled constraints — and emits that state. A set of pure date-math helpers ships alongside.';
const datetimePrinciples = ['Renders no UI', 'State out, paint in', 'Timezone-independent math', 'Single or range selection', 'Constraint-aware', 'Pure helpers included'];
const datetimeLegend = [
  { name: 'DateValue', desc: 'a civil date { year, month, day, hour?, minute?, second? }' },
  { name: 'PickerState', desc: 'the month grid + selection + time + view + constraints from getState()' },
];
const datetimeGroups = [
  { label: 'Create & state', icon: CalendarDays, methods: [
    { sig: 'createDatePicker(options): Picker', ret: 'Picker', desc: 'options: { mode = "single", min, max, disabledDates, time = false, timeFormat = "24h", weekStart = 0, weekendDays = [0,6], fixedWeeks = false, minRangeLength, maxRangeLength, yearsPerPage = 12, initialDate, initialView, today, clock, onChange }.' },
    { sig: 'getState(): PickerState', ret: 'PickerState', desc: 'The structured month grid, selection, time, view and constraints.' },
    { sig: 'subscribe(callback)', ret: '() => void', desc: 'Push the snapshot on every change; returns an unsubscribe.' },
    { sig: 'destroy()', ret: 'void' },
  ] },
  { label: 'Selection & time', icon: Check, methods: [
    { sig: 'selectDate(date: DateValue)', ret: '{ accepted, reason? }', desc: 'Click a day — builds a single date or a range per mode.' },
    { sig: 'setRange(start: DateValue, end: DateValue)', ret: '{ accepted, reason? }' },
    { sig: 'setDate(date: DateValue | null)', ret: '{ accepted, reason? }', desc: 'Programmatic set (validated).' },
    { sig: 'clear()', ret: 'void' },
    { sig: 'setHovered(date: DateValue)  ·  clearHovered()', ret: 'void', desc: 'Range hover preview.' },
    { sig: 'setTime({ hour, minute, second })', ret: 'void' },
  ] },
  { label: 'View navigation', icon: ChevronsRight, methods: [
    { sig: 'nextMonth()  ·  prevMonth()  ·  nextYear()  ·  prevYear()', ret: 'void' },
    { sig: 'goToMonth(year: number, month: number)', ret: 'void' },
    { sig: 'goToToday()  ·  goToSelected()', ret: 'void' },
    { sig: 'getMonthPickerData()  ·  getYearPickerData()', ret: 'object', desc: 'Data for the month / year switch views.' },
  ] },
  { label: 'Configuration', icon: Settings2, methods: [
    { sig: 'setMode(mode: SelectionMode)', ret: 'void' },
    { sig: 'setWeekStart(weekday: number)', ret: 'void' },
    { sig: 'setMin(date: DateValue)  ·  setMax(date: DateValue)', ret: 'void' },
    { sig: 'setDisabledDates(list | predicate)', ret: 'void', desc: 'A DateValue[] or a (date) => boolean.' },
    { sig: 'setTimeEnabled(on: boolean)', ret: 'void' },
  ] },
  { label: 'Date-math toolkit', icon: Calculator, methods: [
    { sig: 'isLeapYear(year)  ·  daysInMonth(year, month)', ret: 'boolean | number' },
    { sig: 'weekdayOf(date)  ·  compareDates(a, b)  ·  isSameDay(a, b)', ret: 'number | boolean' },
    { sig: 'addDays(date: DateValue, n: number)', ret: 'DateValue' },
    { sig: 'formatISODate(date)  ·  parseISODate(string)', ret: 'string | DateValue | null' },
    { sig: 'fromDate(date: Date)  ·  toDate(value: DateValue)', ret: 'DateValue | Date' },
  ] },
];
const datetimeEnums = [
  { name: 'SelectionMode', values: ['single', 'range'] },
  { name: 'TimeFormat', values: ['24h', '12h'], note: 'Display hint for the time control.' },
  { name: 'Weekday', values: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], note: 'Convenience names for the 0–6 weekday numbers.' },
];

const mode = ref('single');
const weekStart = ref(0);
const disableWeekends = ref(false);
const bounded = ref(false);
const blockSome = ref(false);
const rangeMax = ref(0);
const seconds = ref(false);

const todayCivil = fromDate(new Date());
const cAddDays = (n) => addDaysCivil(todayCivil, n);

const st = ref(null);
const picker = createDatePicker({ mode: SelectionMode.SINGLE, weekStart: 0, time: false, initialDate: todayCivil, onChange: (s) => (st.value = s) });
st.value = picker.getState();
onBeforeUnmount(() => picker.destroy());

watch(mode, () => { picker.setMode(mode.value === 'range' ? SelectionMode.RANGE : SelectionMode.SINGLE); picker.setTimeEnabled(mode.value === 'datetime'); }, { immediate: true });
watch(weekStart, (v) => picker.setWeekStart(v), { immediate: true });
watch(bounded, () => { picker.setMin(bounded.value ? todayCivil : null); picker.setMax(bounded.value ? cAddDays(60) : null); }, { immediate: true });
watch([disableWeekends, blockSome], () => {
  const rules = [];
  if (disableWeekends.value) rules.push((v) => { const wd = toDate(v).getDay(); return wd === 0 || wd === 6; });
  const blocked = blockSome.value ? [cAddDays(3), cAddDays(4), cAddDays(11)] : [];
  picker.setDisabledDates((v) => rules.some((r) => r(v)) || blocked.some((b) => b.year === v.year && b.month === v.month && b.day === v.day));
}, { immediate: true });
watch([rangeMax, st], () => {
  if (mode.value !== 'range' || !rangeMax.value || !st.value?.range?.start || !st.value.range.end) return;
  if (st.value.range.length > rangeMax.value) picker.setRange(st.value.range.start, addDaysCivil(st.value.range.start, rangeMax.value - 1));
});

const toJs = (c) => (c ? toDate(c) : null);
const fmt = (c, style) => { const d = toJs(c); return d ? new Intl.DateTimeFormat(undefined, style).format(d) : ''; };
const MED = { month: 'short', day: 'numeric', year: 'numeric' };
const FULL = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
const label = computed(() => {
  const s = st.value;
  if (!s) return '';
  if (mode.value === 'range') { if (!s.range.start) return 'Pick a date range'; return `${fmt(s.range.start, MED)} → ${s.range.end ? fmt(s.range.end, MED) : '…'}`; }
  if (!s.selected) return mode.value === 'datetime' ? 'Pick date & time' : 'Pick a date';
  return mode.value === 'datetime' ? `${fmt(s.selected, MED)} · ${new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: seconds.value ? '2-digit' : undefined }).format(toJs(s.selected))}` : fmt(s.selected, FULL);
});
const open = ref(false);

const WEEK_OPTS = [{ v: 0, l: 'Sunday' }, { v: 1, l: 'Monday' }, { v: 6, l: 'Saturday' }];
const panelWidth = computed(() => (mode.value === 'range' ? 'w-[21rem]' : 'w-[16.5rem]'));

const presets = [
  { label: 'Today', apply: () => picker.setRange(todayCivil, todayCivil) },
  { label: 'Last 7 days', apply: () => picker.setRange(cAddDays(-6), todayCivil) },
  { label: 'Last 30 days', apply: () => picker.setRange(cAddDays(-29), todayCivil) },
  { label: 'This month', apply: () => picker.setRange({ year: todayCivil.year, month: todayCivil.month, day: 1 }, todayCivil) },
];

const WD = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const MO = {};
['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'].forEach((m, i) => { MO[m] = i + 1; MO[m.slice(0, 3)] = i + 1; });
function parseNL(input) {
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  const base = new Date(todayCivil.year, todayCivil.month - 1, todayCivil.day);
  const out = (d) => fromDate(d);
  if (s === 'today') return out(base);
  if (s === 'tomorrow' || s === 'tmr') return out(new Date(base.getTime() + 86400000));
  if (s === 'yesterday') return out(new Date(base.getTime() - 86400000));
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return { year: +m[1], month: +m[2], day: +m[3] };
  m = s.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (m) { let y = m[3] ? +m[3] : todayCivil.year; if (m[3] && m[3].length === 2) y += 2000; return { year: y, month: +m[1], day: +m[2] }; }
  m = s.match(/^in\s+(\d+)\s+(day|week|month|year)s?$/);
  if (m) { const n = +m[1] * (m[2] === 'week' ? 7 : 1); const d = new Date(base); if (m[2] === 'month') d.setMonth(d.getMonth() + +m[1]); else if (m[2] === 'year') d.setFullYear(d.getFullYear() + +m[1]); else d.setDate(d.getDate() + n); return out(d); }
  m = s.match(/^(\d+)\s+(day|week)s?\s+ago$/);
  if (m) { const n = +m[1] * (m[2] === 'week' ? 7 : 1); return out(new Date(base.getTime() - n * 86400000)); }
  m = s.match(/^(next|last|this)\s+([a-z]+)$/);
  if (m && WD[m[2]] != null) { const cur = base.getDay(); let delta = (WD[m[2]] - cur + 7) % 7; if (m[1] === 'next' && delta === 0) delta = 7; if (m[1] === 'last') delta = delta === 0 ? -7 : delta - 7; return out(new Date(base.getTime() + delta * 86400000)); }
  if (WD[s] != null) { const cur = base.getDay(); let delta = (WD[s] - cur + 7) % 7; if (delta === 0) delta = 7; return out(new Date(base.getTime() + delta * 86400000)); }
  m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?$/);
  if (m && MO[m[1]] != null) return { year: m[3] ? +m[3] : todayCivil.year, month: MO[m[1]], day: +m[2] };
  return null;
}

const fmtTarget = computed(() => (mode.value === 'range' ? st.value?.range?.start : st.value?.selected) || todayCivil);
const FORMAT_STYLES = [['full', 'Full', FULL], ['long', 'Long', { month: 'long', day: 'numeric', year: 'numeric' }], ['medium', 'Medium', MED], ['iso', 'ISO', null], ['numeric', 'Numeric', { month: '2-digit', day: '2-digit', year: 'numeric' }]];
const TIMEZONES = [{ id: 'America/Los_Angeles', label: 'Los Angeles' }, { id: 'America/New_York', label: 'New York' }, { id: 'Europe/London', label: 'London' }, { id: 'Asia/Tokyo', label: 'Tokyo' }];
const tz = ref('America/New_York');
function fmtStyle(c, style, opts) {
  const d = toJs(c); if (!d) return '';
  if (style === 'iso') return `${String(c.year).padStart(4, '0')}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
  return new Intl.DateTimeFormat(undefined, opts).format(d);
}
const typedPG = ref('next friday');
const parsedPG = computed(() => parseNL(typedPG.value));
const tzLabel = computed(() => new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz.value, timeZoneName: 'short' }).format(toJs(fmtTarget.value)));
const pgExamples = ['today', 'tomorrow', 'next monday', 'in 3 weeks', '12/25', '2 days ago'];
function onMode(v) { if (v) mode.value = v; }
</script>

<template>
  <ComponentHeader>
    <ComponentHeaderTitle>DateTime Engine</ComponentHeaderTitle>
    <ComponentHeaderDescription>
      A consumer of the headless date-picker engine. One instance owns the grid geometry
      (spillover days, fixed weeks, any week-start), selection / range progression with hover
      preview, bounds and blocked days, range limits, month/year jumping and time-of-day — and
      emits that whole state. The page drives it and formats the output. Configure it live below.
    </ComponentHeaderDescription>
  </ComponentHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Pick single dates or ranges, switch month / year views, set min / max and disabled days, and parse / format values — the engine does the calendar logic; this page only paints and humanizes.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Trigger &amp; popover</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="flex flex-col gap-4">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs text-faint">Mode</span>
                <ToggleGroup type="single" :model-value="mode" variant="secondary" @update:model-value="onMode">
                  <ToggleGroupItem value="single">Single</ToggleGroupItem>
                  <ToggleGroupItem value="range">Range</ToggleGroupItem>
                  <ToggleGroupItem value="datetime">Date + time</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <Popover v-if="st" v-model:open="open">
                <PopoverTrigger class="inline-flex h-control w-fit items-center gap-2.5 rounded-medium border border-border bg-surface px-3 text-sm text-foreground transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30">
                  <CalendarDays class="size-icon-small text-faint" /><span>{{ label }}</span><ChevronDown class="size-icon-small text-faint" />
                </PopoverTrigger>
                <PopoverContent :class="['p-3', panelWidth]" align="start">
                  <DateTimePanel :picker="picker" :dp-state="st" :show-presets="mode === 'range'" :show-relative="mode !== 'range'" :presets="presets" />
                </PopoverContent>
              </Popover>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Configuration</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
              <div class="grid grid-cols-1 gap-x-10 gap-y-6 self-start rounded-large border border-border bg-surface p-6 sm:grid-cols-2">
                <div class="flex flex-col gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Week starts on</span>
                  <div class="inline-flex overflow-hidden rounded-medium border border-border text-xs">
                    <button v-for="o in WEEK_OPTS" :key="o.v" type="button" :class="['flex-1 px-2.5 py-1.5 transition-colors', weekStart === o.v ? 'bg-foreground text-background' : 'text-muted hover:text-foreground']" @click="weekStart = o.v">{{ o.l }}</button>
                  </div>
                </div>
                <div class="flex flex-col gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Allowed window</span>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Bound to next 60 days</span><Switch v-model:checked="bounded" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Disable weekends</span><Switch v-model:checked="disableWeekends" /></label>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Block 3 sample days</span><Switch v-model:checked="blockSome" /></label>
                </div>
                <div class="flex flex-col gap-2.5">
                  <div class="flex items-center justify-between"><span class="text-xs font-medium uppercase tracking-wider text-faint">Max range length</span><span class="font-mono text-[11px] text-muted">{{ rangeMax === 0 ? 'none' : rangeMax + ' days' }}</span></div>
                  <Slider v-model="rangeMax" :min="0" :max="30" :step="1" :disabled="mode !== 'range'" />
                  <p class="text-[11px] text-faint">{{ mode === 'range' ? 'An over-long range is trimmed to the cap.' : 'Switch to Range mode to use.' }}</p>
                </div>
                <div class="flex flex-col gap-2.5">
                  <span class="text-xs font-medium uppercase tracking-wider text-faint">Time precision</span>
                  <label class="flex items-center justify-between"><span class="text-xs text-muted">Show seconds</span><Switch v-model:checked="seconds" :disabled="mode !== 'datetime'" /></label>
                  <p class="text-[11px] text-faint">{{ mode === 'datetime' ? '12 / 24-hour toggles inside the panel.' : 'Switch to Date + time mode to use.' }}</p>
                </div>
              </div>

              <div v-if="st" :class="['shrink-0 rounded-large border border-border bg-surface p-3 shadow-panel', panelWidth]">
                <DateTimePanel :picker="picker" :dp-state="st" :show-presets="mode === 'range'" :show-relative="mode !== 'range'" :presets="presets" :show-typed-input="mode !== 'range'" :on-typed="parseNL" />
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Parsing &amp; formatting</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Natural-language parse</span>
                <div :class="['flex h-control items-center gap-2 rounded-medium border bg-input px-2.5', typedPG && !parsedPG ? 'border-destructive' : 'border-border focus-within:border-foreground']">
                  <input v-model="typedPG" spellcheck="false" placeholder="“next friday”, “in 2 weeks”, “03/15”…" class="w-full bg-transparent text-sm text-foreground placeholder:text-faint focus-visible:outline-none" />
                  <CornerDownLeft class="size-icon-small shrink-0 text-faint" />
                </div>
                <template v-if="parsedPG">
                  <p class="flex items-center gap-1.5 text-xs text-success"><Check class="size-icon-small" /> Parsed → <span class="font-medium text-foreground">{{ fmtStyle(parsedPG, 'medium', MED) }}</span></p>
                  <button type="button" class="self-start rounded-medium border border-border px-2.5 py-1 text-xs text-foreground transition-colors hover:bg-background" @click="picker.setDate(parsedPG)">Hand to engine →</button>
                </template>
                <p v-else-if="typedPG" class="flex items-center gap-1.5 text-xs text-destructive"><AlertCircle class="size-icon-small" /> Couldn't parse — try “Jun 4” or “2025-06-04”.</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="ex in pgExamples" :key="ex" type="button" class="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted transition-colors hover:text-foreground" @click="typedPG = ex">{{ ex }}</button>
                </div>
              </div>

              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Format styles · <span class="font-normal normal-case tracking-normal text-muted">{{ fmtStyle(fmtTarget, 'medium', MED) }}</span></span>
                <div class="flex flex-col gap-1.5">
                  <div v-for="[style, lbl, opts] in FORMAT_STYLES" :key="style" class="flex items-center gap-2 text-xs"><span class="w-16 shrink-0 text-faint">{{ lbl }}</span><span class="font-mono text-foreground">{{ fmtStyle(fmtTarget, style, opts) }}</span></div>
                  <div class="my-1 h-px bg-border"></div>
                  <div class="flex items-center gap-2">
                    <Clock class="size-icon-small text-faint" />
                    <select v-model="tz" class="h-control-small flex-1 rounded-medium border border-border bg-input px-2 text-xs text-foreground focus-visible:border-foreground focus-visible:outline-none"><option v-for="z in TIMEZONES" :key="z.id" :value="z.id">{{ z.label }}</option></select>
                    <span class="font-mono text-[11px] text-muted">{{ tzLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="datetime-engine.js"
      :intro="datetimeIntro"
      :principles="datetimePrinciples"
      :legend="datetimeLegend"
      :groups="datetimeGroups"
      :enums="datetimeEnums"
    />
  </div>
</template>
