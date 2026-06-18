<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import {
  Keyboard, Command as CommandIcon, Search, Save, Copy, Scissors,
  Undo, Redo, Trash2, CornerDownLeft, CheckSquare, Layers, X, Play, AlertCircle,
} from '@lucide/vue';
import ComponentItemHeader from '@app/component/ComponentItemHeader.vue';
import ComponentItemHeaderTitle from '@app/component/ComponentItemHeaderTitle.vue';
import ComponentItemHeaderDescription from '@app/component/ComponentItemHeaderDescription.vue';
import ComponentItemSection from '@app/component/ComponentItemSection.vue';
import ComponentItemSectionTitle from '@app/component/ComponentItemSectionTitle.vue';
import ComponentItemSectionExample from '@app/component/ComponentItemSectionExample.vue';
import HeadlessReference from '@app/component/HeadlessReference.vue';
import Kbd from '../../components/ui/Kbd/Kbd.vue';
import Button from '../../components/ui/Button/Button.vue';
import { createHotkeys, eventToCombo } from '../../lib/hotkey-engine/hotkey-engine.js';

const hotkeyIntro = 'createHotkeys() owns keyboard-shortcut matching — single combos and multi-step sequences, a contextual scope stack, cross-platform mod (⌘ / Ctrl), conflict detection and enable / disable — and dispatches to your handlers. The consumer wires the listener (or lets it auto-attach) and renders any hint UI.';
const hotkeyPrinciples = ['Owns matching, not UI', 'Combos + sequences', 'Contextual scope stack', 'Cross-platform mod', 'Conflict detection', 'Headless-dispatchable'];
const hotkeyLegend = [
  { name: 'combo', desc: 'a normalized chord like "meta+shift+p", or a sequence like ["g", "g"]' },
  { name: 'HotkeyState', desc: 'active scopes, bindings, pending sequence and conflicts from getState()' },
];
const hotkeyGroups = [
  {
    label: 'Bindings', icon: Keyboard,
    methods: [
      { sig: 'createHotkeys(options): Hotkeys', ret: 'Hotkeys', desc: 'options: { target, autoAttach = true, clock }.' },
      { sig: 'bind(keys, handler, options?)', ret: '() => void', desc: 'keys: string | string[]; options: { scope, preventDefault, enableOnFormFields, description }. Returns an unbind fn.' },
      { sig: 'unbind(keys, scope?)', ret: 'Hotkeys' },
      { sig: 'unbindAll(scope?)', ret: 'Hotkeys' },
      { sig: 'trigger(keys)', ret: 'boolean', desc: 'Fire a binding programmatically.' },
    ],
  },
  {
    label: 'Scopes', icon: Layers,
    methods: [
      { sig: 'pushScope(name)  ·  popScope()', ret: 'Hotkeys | string', desc: 'Push / pop the contextual stack.' },
      { sig: 'setScope(name)', ret: 'Hotkeys', desc: 'Replace the stack with one scope (falsy clears it).' },
      { sig: 'activateScope(name)  ·  deactivateScope(name)', ret: 'Hotkeys' },
      { sig: 'isScopeActive(name)  ·  getActiveScopes()', ret: 'boolean | string[]' },
    ],
  },
  {
    label: 'Listening & dispatch', icon: Play,
    methods: [
      { sig: 'attach(target?)', ret: 'Hotkeys', desc: 'Wire the keydown listener (auto on construction unless autoAttach: false).' },
      { sig: 'detach()', ret: 'Hotkeys' },
      { sig: 'handleEvent(event)', ret: 'boolean', desc: 'Feed a KeyboardEvent directly — for tests or custom wiring.' },
    ],
  },
  {
    label: 'Enable & state', icon: CheckSquare,
    methods: [
      { sig: 'enable()  ·  disable()  ·  isEnabled()', ret: 'Hotkeys | boolean' },
      { sig: 'getBindings()  ·  getPendingSequence()', ret: 'Binding[] | string[]' },
      { sig: 'getConflicts()', ret: 'object', desc: 'Bindings that clash in the active scope.' },
      { sig: 'getState()  ·  subscribe(callback)  ·  on(type, listener)', ret: 'HotkeyState | () => void' },
      { sig: 'destroy()', ret: 'void' },
    ],
  },
  {
    label: 'Pure helpers', icon: CommandIcon,
    methods: [
      { sig: 'parseHotkey(keys, options?)', ret: 'string[]', desc: 'Normalize to combos; resolves "mod" to ⌘ / Ctrl per OS.' },
      { sig: 'eventToCombo(event)', ret: 'string | null', desc: 'A KeyboardEvent → its combo string (null for modifier-only).' },
      { sig: 'defaultClock()', ret: '{ now, setTimeout, clearTimeout }', desc: 'The real clock; swap a fake one in for tests.' },
    ],
  },
];

const REG = [
  { id: 'palette', keys: 'mod+k', display: ['mod', 'K'], label: 'Open command palette', icon: CommandIcon, group: 'General', scope: 'global', opts: { preventDefault: true } },
  { id: 'search', keys: '/', display: ['/'], label: 'Focus search', icon: Search, group: 'General', scope: 'global' },
  { id: 'save', keys: 'mod+s', display: ['mod', 'S'], label: 'Save', icon: Save, group: 'General', scope: 'global', opts: { preventDefault: true, enableInInput: true } },
  { id: 'help', keys: '?', display: ['?'], label: 'Toggle shortcuts', icon: Keyboard, group: 'General', scope: 'global' },
  { id: 'copy', keys: 'mod+c', display: ['mod', 'C'], label: 'Copy', icon: Copy, group: 'Editing', scope: 'global' },
  { id: 'cut', keys: 'mod+x', display: ['mod', 'X'], label: 'Cut', icon: Scissors, group: 'Editing', scope: 'global' },
  { id: 'undo', keys: 'mod+z', display: ['mod', 'Z'], label: 'Undo', icon: Undo, group: 'Editing', scope: 'global' },
  { id: 'redo', keys: ['mod+shift+z', 'mod+y'], display: ['mod', '⇧', 'Z'], extra: 1, label: 'Redo', icon: Redo, group: 'Editing', scope: 'global' },
  { id: 'delete', keys: ['backspace', 'delete'], display: ['⌫'], extra: 1, label: 'Delete selection', icon: Trash2, group: 'Editing', scope: 'global', opts: { repeat: true } },
  { id: 'all', keys: 'mod+a', display: ['mod', 'A'], label: 'Select all', icon: CheckSquare, group: 'Editing', scope: 'global', opts: { preventDefault: true } },
  { id: 'goInbox', keys: 'g i', display: ['G', 'I'], seq: true, label: 'Go to inbox', icon: CornerDownLeft, group: 'Navigation', scope: 'global' },
  { id: 'goProjects', keys: 'g p', display: ['G', 'P'], seq: true, label: 'Go to projects', icon: CornerDownLeft, group: 'Navigation', scope: 'global' },
  { id: 'goSettings', keys: 'g s', display: ['G', 'S'], seq: true, label: 'Go to settings', icon: CornerDownLeft, group: 'Navigation', scope: 'global' },
  { id: 'modalConfirm', keys: 'enter', display: ['⏎'], label: 'Confirm dialog', icon: CheckSquare, group: 'Dialog', scope: 'modal', opts: { enableInInput: true } },
  { id: 'modalClose', keys: 'escape', display: ['Esc'], label: 'Close dialog', icon: X, group: 'Dialog', scope: 'modal', opts: { enableInInput: true } },
  { id: 'modalPalette', keys: 'mod+k', display: ['mod', 'K'], label: 'Dialog quick-find', icon: CommandIcon, group: 'Dialog', scope: 'modal', opts: { preventDefault: true } },
];
const byId = Object.fromEntries(REG.map((r) => [r.id, r]));
const groupNames = ['General', 'Editing', 'Navigation', 'Dialog'];
const codeTriggers = [
  { id: 'palette', keys: 'mod+k' }, { id: 'save', keys: 'mod+s' }, { id: 'copy', keys: 'mod+c' },
  { id: 'undo', keys: 'mod+z' }, { id: 'goInbox', keys: 'g i' },
];

const isMac = ref(true);
let hk = null;
const state = ref({ enabled: true, scopes: ['global'], pending: [], mod: 'meta', bindingCount: 0 });
const conflicts = ref([]);
const firedId = ref(null);
const log = ref([]);
const pressed = ref([]);
let flashTimer = null;
let offFire = null;

function build() {
  hk?.destroy();
  hk = createHotkeys({
    os: isMac.value ? 'mac' : 'windows',
    autoAttach: true,
    onChange: (s) => { state.value = s; conflicts.value = hk.getConflicts(); },
  });
  for (const r of REG) {
    const run = r.id === 'modalClose' ? () => hk.popScope() : () => {};
    hk.bind(r.keys, run, { id: r.id, scope: r.scope, description: r.label, ...(r.opts || {}) });
  }
  offFire?.();
  offFire = hk.on('fire', (ctx) => {
    const id = ctx.binding.id;
    firedId.value = id;
    log.value = [{ key: id + '-' + Date.now(), id, from: ctx.event ? 'key' : 'code', at: Date.now() }, ...log.value].slice(0, 6);
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => (firedId.value = null), 700);
  });
  state.value = hk.getState();
  conflicts.value = hk.getConflicts();
}

function display(e) {
  const out = [];
  if (e.metaKey) out.push(isMac.value ? '⌘' : 'Win');
  if (e.ctrlKey) out.push('Ctrl');
  if (e.altKey) out.push(isMac.value ? '⌥' : 'Alt');
  if (e.shiftKey) out.push('⇧');
  const k = e.key;
  const map = { ' ': 'Space', Escape: 'Esc', Backspace: '⌫', Enter: '⏎', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  if (!['Meta', 'Control', 'Shift', 'Alt'].includes(k)) out.push(map[k] ?? (k.length === 1 ? k.toUpperCase() : k));
  return out;
}
function onKeyEcho(e) { if (eventToCombo(e)) pressed.value = display(e); }

onMounted(() => {
  build();
  window.addEventListener('keydown', onKeyEcho, true);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyEcho, true);
  offFire?.();
  hk?.destroy();
  clearTimeout(flashTimer);
});
watch(isMac, () => { if (hk) build(); });

const MOD = computed(() => (state.value.mod === 'meta' ? '⌘' : 'Ctrl'));
const modalActive = computed(() => state.value.scopes.includes('modal'));
const tok = (t) => (t === 'mod' ? MOD.value : t);
const liveIds = computed(() => new Set(REG.filter((r) => state.value.scopes.includes(r.scope)).map((r) => r.id)));
function shadowed(r) {
  if (!liveIds.value.has(r.id)) return false;
  const myRank = state.value.scopes.indexOf(r.scope);
  return REG.some((o) => o.id !== r.id && liveIds.value.has(o.id) && JSON.stringify(o.keys) === JSON.stringify(r.keys) && state.value.scopes.indexOf(o.scope) > myRank);
}
function overrides(r) {
  const myRank = state.value.scopes.indexOf(r.scope);
  return REG.some((o) => o.id !== r.id && liveIds.value.has(o.id) && JSON.stringify(o.keys) === JSON.stringify(r.keys) && state.value.scopes.indexOf(o.scope) < myRank);
}
const firedBinding = computed(() => (firedId.value ? byId[firedId.value] : null));
function regIn(g) { return REG.filter((r) => r.group === g); }
</script>

<template>
  <ComponentItemHeader>
    <ComponentItemHeaderTitle>Hotkey Engine</ComponentItemHeaderTitle>
    <ComponentItemHeaderDescription>
      A consumer of the headless hotkey engine. It registers bindings — <strong class="font-medium text-foreground">chords</strong>
      (<Kbd>{{ MOD }}</Kbd><Kbd>K</Kbd>), <strong class="font-medium text-foreground">sequences</strong>
      (<Kbd>G</Kbd> then <Kbd>I</Kbd>) and several combos per action — and the engine handles parsing,
      exact-modifier matching, the scope stack, the typing-guard (<Kbd>Esc</Kbd> and chords still pass),
      cross-platform <code class="rounded-small bg-surface px-1 py-0.5 font-mono text-xs">mod</code>, conflicts and dispatch.
    </ComponentItemHeaderDescription>
  </ComponentItemHeader>

  <div class="flex flex-col gap-16">
    <section class="order-1 flex flex-col gap-10">
      <div class="flex flex-col gap-2 border-b border-border pb-5">
        <span class="text-[11px] font-medium uppercase tracking-[0.2em] text-faint">Examples</span>
        <h3 class="text-xl font-medium tracking-tight text-foreground">The engine, wired up</h3>
        <p class="max-w-2xl text-sm leading-relaxed text-muted">Press shortcuts to fire bound actions, watch multi-step sequences resolve, switch scopes and see conflicts — the engine matches every keystroke while this page lists the bindings and reflects what fired.</p>
      </div>
      <div class="flex flex-col gap-14">
        <ComponentItemSection>
          <ComponentItemSectionTitle>Live capture</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="mb-4 flex flex-wrap items-center gap-3">
              <Button :variant="state.enabled ? 'primary' : 'secondary'" size="sm" @click="state.enabled ? hk.disable() : hk.enable()">
                <Keyboard class="size-icon-small" />{{ state.enabled ? 'Engine on — press keys' : 'Engine disabled' }}
              </Button>
              <div class="ml-auto flex items-center gap-2 text-xs text-faint">
                <span>Platform</span>
                <div class="flex overflow-hidden rounded-medium border border-border">
                  <button type="button" :class="['px-2 py-1 transition-colors', isMac ? 'bg-foreground text-background' : 'bg-surface text-muted hover:text-foreground']" @click="isMac = true">macOS</button>
                  <button type="button" :class="['px-2 py-1 transition-colors', !isMac ? 'bg-foreground text-background' : 'bg-surface text-muted hover:text-foreground']" @click="isMac = false">Windows</button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
              <div :class="['relative flex min-h-44 flex-col items-center justify-center gap-4 rounded-large border-2 border-dashed px-6 py-8 text-center transition-colors duration-200', state.enabled ? 'border-border bg-input' : 'border-border/60 bg-surface']">
                <div v-if="pressed.length" class="flex items-center gap-1.5"><kbd v-for="(k, i) in pressed" :key="i" class="inline-flex min-w-9 items-center justify-center rounded-medium border border-foreground/30 bg-surface px-2.5 py-2 font-mono text-base text-foreground shadow-card">{{ k }}</kbd></div>
                <div v-else class="flex items-center gap-1.5 opacity-40"><kbd class="inline-flex min-w-9 items-center justify-center rounded-medium border border-border bg-surface px-2.5 py-2 font-mono text-base text-muted">{{ MOD }}</kbd><kbd class="inline-flex min-w-9 items-center justify-center rounded-medium border border-border bg-surface px-2.5 py-2 font-mono text-base text-muted">K</kbd></div>

                <div v-if="firedBinding" class="flex items-center gap-2 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-sm text-success">
                  <component :is="firedBinding.icon" class="size-icon-small" /><span class="font-medium">{{ firedBinding.label }}</span>
                  <span class="rounded-full bg-success/15 px-1.5 text-[10px] uppercase tracking-wider">{{ firedBinding.scope }}</span>
                </div>
                <p v-else class="text-sm text-faint">{{ state.enabled ? 'Listening… try ' : 'Enable the engine, then try ' }}<span class="text-muted">{{ MOD }}K</span>, <span class="text-muted">?</span>, or <span class="text-muted">G</span> then <span class="text-muted">I</span></p>

                <input placeholder="Type here — letter shortcuts are ignored; ⌘S and Esc still fire" class="w-full max-w-sm rounded-medium border border-border bg-background px-3 py-1.5 text-center text-xs text-foreground placeholder:text-faint focus-visible:border-foreground focus-visible:outline-none" />

                <div v-if="state.pending.length" class="absolute bottom-2 left-3 flex items-center gap-1 text-xs text-faint"><span>sequence:</span><Kbd v-for="(s, i) in state.pending" :key="i">{{ s.toUpperCase() }}</Kbd></div>
              </div>

              <div class="flex flex-col rounded-large border border-border bg-surface">
                <div class="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted">Recent</div>
                <div class="flex-1 p-2">
                  <ul v-if="log.length" class="flex flex-col gap-1">
                    <li v-for="entry in log" :key="entry.key" class="flex items-center gap-2 rounded-medium px-2 py-1.5 text-sm">
                      <Play v-if="entry.from === 'code'" class="size-icon-extra-small shrink-0 text-faint" />
                      <span class="min-w-0 flex-1 truncate text-foreground">{{ byId[entry.id].label }}</span>
                      <span class="inline-flex items-center gap-1"><template v-for="(k, i) in byId[entry.id].display" :key="i"><Kbd>{{ tok(k) }}</Kbd><span v-if="byId[entry.id].seq && i < byId[entry.id].display.length - 1" class="text-faint">then</span></template></span>
                    </li>
                  </ul>
                  <div v-else class="grid h-full min-h-28 place-items-center text-center text-xs text-faint">Fired shortcuts show up here</div>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Scopes &amp; triggering from code</ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <div class="flex items-center justify-between"><span class="text-xs font-medium uppercase tracking-wider text-faint">Active scope stack</span><Layers class="size-icon-small text-faint" /></div>
                <div class="flex items-center gap-1.5">
                  <template v-for="(sc, i) in state.scopes" :key="sc">
                    <span :class="['rounded-medium border px-2.5 py-1 text-xs', i === state.scopes.length - 1 ? 'border-foreground bg-foreground text-background' : 'border-border text-muted']">{{ sc }}</span>
                    <span v-if="i < state.scopes.length - 1" class="text-faint">▸</span>
                  </template>
                </div>
                <p class="text-[11px] text-faint">The topmost scope wins. Pushing <em>modal</em> re-binds <Kbd>{{ MOD }}</Kbd><Kbd>K</Kbd> to <em>Dialog quick-find</em>, shadowing the global palette, and adds <Kbd>Esc</Kbd> / <Kbd>⏎</Kbd>.</p>
                <div class="flex items-center gap-2">
                  <Button v-if="modalActive" variant="secondary" size="sm" @click="hk.popScope()"><X class="size-icon-small" /> Pop modal scope</Button>
                  <Button v-else variant="primary" size="sm" @click="hk.pushScope('modal')"><Layers class="size-icon-small" /> Push modal scope</Button>
                </div>
              </div>

              <div class="flex flex-col gap-3 rounded-large border border-border bg-surface p-4">
                <span class="text-xs font-medium uppercase tracking-wider text-faint">Trigger from code</span>
                <p class="text-[11px] text-faint">Buttons call <code class="text-[11px]">hk.trigger(keys)</code> — the engine fires the active-scope handler directly, no synthetic events.</p>
                <div class="flex flex-wrap gap-2">
                  <button v-for="ct in codeTriggers" :key="ct.id" type="button" class="inline-flex items-center gap-1.5 rounded-medium border border-border bg-background px-2.5 py-1.5 text-xs text-foreground transition-colors hover:bg-surface focus-visible:outline-none" @click="hk.trigger(ct.keys)"><component :is="byId[ct.id].icon" class="size-icon-small text-muted" />{{ byId[ct.id].label }}</button>
                </div>
              </div>
            </div>
          </ComponentItemSectionExample>
        </ComponentItemSection>

        <ComponentItemSection>
          <ComponentItemSectionTitle>Registered shortcuts <span class="font-normal normal-case tracking-normal text-faint">· {{ state.bindingCount }} bound</span></ComponentItemSectionTitle>
          <ComponentItemSectionExample>
            <div class="grid grid-cols-1 gap-x-10 gap-y-8 md:grid-cols-2">
              <div v-for="g in groupNames" :key="g" class="flex flex-col">
                <h4 class="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-faint">{{ g }}<span v-if="g === 'Dialog'" :class="['rounded-full border px-1.5 text-[9px] normal-case tracking-normal', modalActive ? 'border-foreground/40 text-muted' : 'border-border text-faint/60']">{{ modalActive ? 'active' : 'modal scope' }}</span></h4>
                <div class="flex flex-col divide-y divide-border/60">
                  <div v-for="b in regIn(g)" :key="b.id" :class="['flex items-center gap-3 py-2.5', liveIds.has(b.id) ? '' : 'opacity-40']">
                    <component :is="b.icon" class="size-icon-small shrink-0 text-muted" />
                    <span class="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-foreground">
                      {{ b.label }}
                      <span v-if="b.opts && b.opts.enableInInput" class="rounded border border-border px-1 text-[9px] text-faint" title="Fires even while typing">in-field</span>
                      <span v-if="b.opts && b.opts.repeat" class="rounded border border-border px-1 text-[9px] text-faint" title="Repeats while held">hold</span>
                      <span v-if="liveIds.has(b.id) && overrides(b)" class="rounded border border-success/40 px-1 text-[9px] text-success" title="Shadows a lower scope">overrides</span>
                      <span v-if="liveIds.has(b.id) && shadowed(b)" class="rounded border border-warning/50 px-1 text-[9px] text-warning" title="Shadowed by a higher scope">shadowed</span>
                    </span>
                    <div class="flex items-center gap-1.5">
                      <span class="inline-flex items-center gap-1"><template v-for="(k, i) in b.display" :key="i"><Kbd>{{ tok(k) }}</Kbd><span v-if="b.seq && i < b.display.length - 1" class="text-faint">then</span></template></span>
                      <span v-if="b.extra" class="text-[10px] text-faint">+{{ b.extra }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="conflicts.length" class="mt-5 flex items-center gap-1.5 text-xs text-warning"><AlertCircle class="size-icon-small" /> {{ conflicts.length }} same-scope conflict{{ conflicts.length === 1 ? '' : 's' }} reported by <code class="text-[11px]">getConflicts()</code>.</p>
            <p v-else class="mt-5 text-xs text-faint">No same-scope conflicts. Cross-scope collisions (modal vs. global <Kbd>{{ MOD }}</Kbd><Kbd>K</Kbd>) are resolved by precedence — the engine flags the override above rather than a conflict.</p>
          </ComponentItemSectionExample>
        </ComponentItemSection>
      </div>
    </section>

    <HeadlessReference
      file="hotkey-engine.js"
      :intro="hotkeyIntro"
      :principles="hotkeyPrinciples"
      :legend="hotkeyLegend"
      :groups="hotkeyGroups"
    />
  </div>
</template>
