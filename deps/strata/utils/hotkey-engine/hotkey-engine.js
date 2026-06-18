// hotkey-engine.js
// A headless KEYBOARD-SHORTCUT engine — the framework-agnostic core that turns key
// presses into fired handlers. The consumer registers bindings (a key combo or a
// multi-key sequence + a handler + a scope + options); the engine listens for keydown,
// normalizes each event into a canonical key representation, matches it against the
// registered bindings (respecting active scopes and the typing-guard), resolves chords
// vs. sequences vs. conflicts, and fires the matching handler. It renders nothing: no
// UI, no CSS, no command palette, no cheatsheet — it exposes the registered bindings and
// the live matching state for a consumer to render those itself.
//
// This is the FULL version, not a shallow key→handler map. The value is in the parts
// shallow versions skip, and each is implemented here:
//   • MULTI-KEY SEQUENCES (Vim-style `g g`, `g i`, `ctrl+x ctrl+s`) with a timeout-driven
//     state machine and standalone-vs-prefix precedence (fire the longer match if it
//     completes within the timeout, else the shorter).
//   • CHORDS WITH MODIFIERS (`cmd+shift+p`) matched on the EXACT modifier set — `ctrl+k`
//     fires on Ctrl+K but not Ctrl+Shift+K (the classic loose-matching bug, avoided).
//   • SCOPES / CONTEXTS — a binding is active only in active scopes; a global scope is
//     always active, plus a scopeStack of contextual scopes where the topmost shadows the
//     rest (modal layering). A modal-only shortcut works only while its scope is pushed.
//   • THE TYPING-GUARD — bare letter/sequence shortcuts do NOT fire while the user types
//     in an <input>/<textarea>/contentEditable; modifier-chords (Cmd+S) still do. The #1
//     real-world correctness requirement.
//   • CONFLICT RESOLUTION — two bindings on the same key in the same scope: last-registered
//     wins (deterministic override), with getConflicts() to report them.
//   • CROSS-PLATFORM `mod` — `mod+s` is Cmd+S on macOS and Ctrl+S on Windows/Linux. One
//     binding, both platforms. OS detected once, overridable for tests.
//
// THE CORE IS PURE AND HEADLESS (read first). All the hard logic — string→canonical
// parsing, event-shape→combo normalization, the sequence state machine, scope resolution,
// the typing-guard, conflict resolution — is reachable WITHOUT a DOM. handleEvent(event)
// takes an event-LIKE object ({ key, ctrlKey, metaKey, shiftKey, altKey, repeat,
// target }) and runs the whole match pipeline; the live keydown listener simply funnels
// real KeyboardEvents into that same method. So a `node`-runnable suite feeds synthetic
// event shapes and asserts exactly which binding matches, with no browser. The only DOM
// the engine ever touches — attaching the real keydown/blur listeners, reading the event
// target / navigator for the typing-guard and OS detection — lives inside method bodies
// behind capability checks, never at module scope. Constructing the engine and registering
// bindings must not throw with no `document` (SSR/Node).
//
// Testability of the sequence timeout hinges on an INJECTABLE CLOCK (mirroring
// toast-engine): createHotkeys({ clock }) takes { now(), setTimeout(handler,milliseconds)->id,
// clearTimeout(id) } (defaulting to the real one), so a fake clock makes the
// partial-sequence timeout deterministic without real waiting.
//
// Shared primitives live in ../shared/*. This file imports only Emitter from there.
//
// Exports: { createHotkeys, defaultClock, parseHotkey, eventToCombo }

import { Emitter } from '../shared/emitter.js';

// ============================================================================
// Clock (injectable; the sequence-timeout is the only timer). Same shape as
// toast-engine's clock so a fake clock makes the timeout deterministic in Node.
// None of this is DOM — it works in Node and the browser. Built lazily inside a
// call, never at module scope.
// ============================================================================

/** @returns {{ now: () => number, setTimeout: (handler: Function, milliseconds: number) => any, clearTimeout: (id: any) => void }} */
export function defaultClock() {
  const now = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? () => performance.now()
    : () => Date.now();
  return {
    now,
    setTimeout: (handler, milliseconds) => setTimeout(handler, milliseconds),
    clearTimeout: (id) => clearTimeout(id),
  };
}

// ============================================================================
// Pure key parsing & normalization (NO DOM — module scope is safe in Node).
//
// A canonical "combo" is a string: the held modifiers (in a fixed order) plus the
// main key, joined with '+'. e.g. "meta+shift+p", "ctrl+k", "g", "?", "arrowup".
// Both sides — a registered binding string AND a live key event — are reduced to
// this same form, so matching a keystroke is a Map lookup, not a scan.
// ============================================================================

// Fixed modifier order so `shift+cmd+p` and `cmd+shift+p` produce the same combo.
const MODIFIER_ORDER = ['meta', 'ctrl', 'alt', 'shift'];

// Modifier aliases → canonical token. `mod` is special: it resolves per-OS at parse time.
const MODIFIER_ALIASES = {
  mod: '__mod__',
  cmd: 'meta', command: 'meta', meta: 'meta', super: 'meta', win: 'meta', windows: 'meta', os: 'meta',
  ctrl: 'ctrl', control: 'ctrl', ctl: 'ctrl',
  alt: 'alt', opt: 'alt', option: 'alt',
  shift: 'shift',
};

// Main-key aliases → canonical name. event.key already gives e.g. "ArrowUp"/"Escape"
// (lowercased here to "arrowup"/"escape"); these let the consumer also write "up"/"esc".
const MAIN_KEY_ALIASES = {
  esc: 'escape', escape: 'escape',
  del: 'delete', delete: 'delete',
  ins: 'insert', insert: 'insert',
  up: 'arrowup', arrowup: 'arrowup',
  down: 'arrowdown', arrowdown: 'arrowdown',
  left: 'arrowleft', arrowleft: 'arrowleft',
  right: 'arrowright', arrowright: 'arrowright',
  enter: 'enter', return: 'enter',
  space: 'space', spacebar: 'space',
  tab: 'tab',
  backspace: 'backspace', bksp: 'backspace',
  plus: '+',
  pageup: 'pageup', pgup: 'pageup',
  pagedown: 'pagedown', pgdn: 'pagedown',
  home: 'home', end: 'end',
};

/** event.key values that are modifiers or locks: pressing one alone never fires and never disturbs a pending sequence. */
const IGNORE_KEYS = new Set([
  'Shift', 'Control', 'Alt', 'AltGraph', 'Meta', 'OS', 'Hyper', 'Super', 'Fn', 'FnLock',
  'CapsLock', 'NumLock', 'ScrollLock', 'Dead', 'Unidentified', 'Process',
]);

/** Resolve a main-key segment through the alias table (already lowercased). */
function canonicalMainKey(segment) {
  return Object.prototype.hasOwnProperty.call(MAIN_KEY_ALIASES, segment) ? MAIN_KEY_ALIASES[segment] : segment;
}

/** Build the canonical combo string from a modifier Set + main key. */
function buildCombo(modifiers, mainKey) {
  const parts = [];
  for (const modifier of MODIFIER_ORDER) if (modifiers.has(modifier)) parts.push(modifier);
  parts.push(mainKey);
  return parts.join('+');
}

/**
 * Compile a single chord token (e.g. "cmd+shift+p", "ctrl++", "?", "ArrowUp", "g")
 * into a { combo } object (the canonical combo string). Throws a descriptive Error on an
 * invalid token (no main key, or more than one main key).
 * @param {string} token
 * @param {() => string} resolveMod  returns 'meta' or 'ctrl' for the cross-platform `mod`
 */
function compileChord(token, resolveMod) {
  let text = String(token).trim().toLowerCase();
  if (!text) throw new Error('hotkey: empty key segment');

  // Plus handling: "+" is the plus key; "ctrl++" means ctrl + the plus key; a trailing
  // "+" is treated as the plus key too. Normalize so split('+') is unambiguous.
  if (text === "+") text = "plus";
  else {
    text = text.replace(/\+\+/g, "+plus");
    // Keep the trailing separator so split('+') still sees a distinct "plus" segment:
    // "ctrl+" → "ctrl+plus" → ["ctrl","plus"] (combo "ctrl++"), "a+" → ["a","plus"]
    // (a loud multiple-main-keys error). Dropping the "+" instead produced an
    // unmatchable single token like "ctrlplus".
    if (text.length > 1 && text.endsWith("+")) text = text.slice(0, -1) + "+plus";
  }

  const segments = text.split('+').filter((part) => part.length > 0);
  const modifiers = new Set();
  const mainKeys = [];
  for (const segment of segments) {
    // Own-property lookup only: a bare object lookup let '__proto__'/'constructor'
    // segments resolve through the prototype chain and be silently swallowed as
    // "modifiers", binding a different key than the caller wrote.
    const modifierToken = Object.prototype.hasOwnProperty.call(MODIFIER_ALIASES, segment) ? MODIFIER_ALIASES[segment] : undefined;
    if (modifierToken === "__mod__") modifiers.add(resolveMod());
    else if (modifierToken) modifiers.add(modifierToken);
    else mainKeys.push(canonicalMainKey(segment));
  }
  if (mainKeys.length === 0) throw new Error(`hotkey: "${token}" has no main key (a chord needs one non-modifier key)`);
  if (mainKeys.length > 1) throw new Error(`hotkey: "${token}" has multiple main keys (${mainKeys.join(', ')})`);
  const mainKey = mainKeys[0];

  // Shift-symbol normalization. event.key already bakes Shift into a printable symbol
  // (Shift+/ ⇒ "?"). So for a single printable NON-LETTER key, Shift is part of the
  // character and is dropped from the modifier set — bind the produced glyph ("?"), not
  // "shift+/". Letters keep Shift (shift+a is a distinct, deliberate binding) and named
  // keys keep Shift (shift+enter ≠ enter).
  if (mainKey.length === 1 && !/[a-z]/.test(mainKey)) modifiers.delete('shift');

  // Only `combo` is read by the sole caller (compileSteps); the intermediate
  // `modifiers`/`mainKey` are consumed here to build it and are not returned.
  return { combo: buildCombo(modifiers, mainKey) };
}

/**
 * Compile a full hotkey string into an ordered list of canonical step combos.
 * Space-separated tokens are sequence steps: "g g" → ["g","g"]; "ctrl+x ctrl+s" →
 * ["ctrl+x","ctrl+s"]; a single chord "mod+s" → ["meta+s"] (a length-1 sequence).
 * @param {string} keys
 * @param {() => string} resolveMod
 * @returns {string[]}
 */
function compileSteps(keys, resolveMod) {
  const steps = String(keys).trim().split(/\s+/).filter(Boolean);
  if (!steps.length) throw new Error('hotkey: empty hotkey string');
  return steps.map((token) => compileChord(token, resolveMod).combo);
}

/** True if an OS hint string looks like macOS/iOS. */
function osLooksMac(os) {
  return /mac|darwin|ios|iphone|ipad|ipod/i.test(String(os || ''));
}

/** Detect macOS from the environment. Guarded — returns false with no `navigator` (Node/SSR). */
function detectIsMac() {
  try {
    if (typeof navigator === 'undefined') return false;
    const userAgentData = navigator.userAgentData;
    const platformText = (userAgentData && userAgentData.platform) || navigator.platform || navigator.userAgent || '';
    return /mac|iphone|ipad|ipod/i.test(platformText);
  } catch {
    return false;
  }
}

/**
 * Parse a hotkey string to its canonical step combos (the form the engine stores and
 * matches against). Exported for testing the parser headlessly.
 * @param {string} keys           e.g. "Cmd+Shift+P", "g g", "shift+/"
 * @param {Object} [options]
 * @param {string} [options.os]      force the OS for `mod` resolution ('mac' | 'windows' | 'linux' | …); else detected
 * @returns {string[]}            e.g. ["meta+shift+p"], ["g","g"], ["/"]
 */
export function parseHotkey(keys, options = {}) {
  const isMac = options.os != null ? osLooksMac(options.os) : detectIsMac();
  return compileSteps(keys, () => (isMac ? 'meta' : 'ctrl'));
}

/**
 * Normalize a key EVENT (or event-like object) into its canonical pieces. Pure: takes the
 * event as data, touches no DOM. Returns `{ modifierOnly:true }` for a lone modifier/lock
 * keydown (which must never fire or disturb a sequence).
 * @param {{ key?: string, ctrlKey?: boolean, metaKey?: boolean, shiftKey?: boolean, altKey?: boolean }} event
 */
function normalizeKeyEvent(event) {
  const rawKey = event && event.key;
  if (!rawKey || IGNORE_KEYS.has(rawKey)) return { modifierOnly: true };

  const modifiers = new Set();
  if (event.ctrlKey) modifiers.add('ctrl');
  if (event.metaKey) modifiers.add('meta');
  if (event.altKey) modifiers.add('alt');
  if (event.shiftKey) modifiers.add('shift');

  let mainKey;
  if (rawKey === ' ' || rawKey === 'Spacebar') {
    mainKey = 'space'; // keep Shift as a real modifier for shift+space
  } else if (rawKey.length === 1) {
    if (/[a-zA-Z]/.test(rawKey)) {
      mainKey = rawKey.toLowerCase(); // letter: lowercase base, Shift stays a modifier
    } else {
      mainKey = rawKey; // printable symbol/digit: the char already encodes Shift
      modifiers.delete('shift');
    }
  } else {
    mainKey = canonicalMainKey(rawKey.toLowerCase()); // named key: canonical name, Shift stays
  }

  const hasNonShiftModifier = modifiers.has('ctrl') || modifiers.has('meta') || modifiers.has('alt');
  // `modifiers` is fully consumed locally (it built `combo` and `hasNonShiftModifier`); no caller
  // reads it, so it is not returned.
  return { modifierOnly: false, mainKey, combo: buildCombo(modifiers, mainKey), hasNonShiftModifier };
}

/**
 * Reduce a key event (or event-like object) to its canonical combo string, or `null` for a
 * lone modifier/lock keydown. Exported for testing the normalization headlessly.
 * @returns {string | null}
 */
export function eventToCombo(event) {
  const normalized = normalizeKeyEvent(event);
  return normalized.modifierOnly ? null : normalized.combo;
}

// ============================================================================
// createHotkeys
// ============================================================================

/**
 * @typedef {Object} HotkeyState  the emitted, read-only matching state
 * @property {boolean} enabled       global matching on/off
 * @property {boolean} attached      a real keydown listener is attached
 * @property {string} platform       'mac' | 'other' (drives `mod`)
 * @property {string} mod            the modifier `mod` resolves to here: 'meta' | 'ctrl'
 * @property {string[]} scopes       active scopes, lowest precedence first (global, then the scopeStack bottom→top)
 * @property {string[]} pending      the in-progress sequence as canonical combos (empty when idle)
 * @property {number} bindingCount   how many bindings are registered
 */

/**
 * Create a headless hotkey engine instance.
 *
 * @param {Object} [options]
 * @param {EventTarget} [options.target]           element/window/document to attach to (default: document, if present)
 * @param {boolean} [options.autoAttach=true]      attach a keydown listener on construction when a target is resolvable
 * @param {number} [options.sequenceTimeout=1000]  milliseconds a partial sequence waits for its next key before resetting
 * @param {string} [options.defaultScope='global'] the always-active scope; bindings default to it
 * @param {string} [options.os]                    force OS for `mod` ('mac' | 'windows' | …); else detected (overridable for tests)
 * @param {boolean} [options.enabled=true]         start enabled
 * @param {boolean} [options.preventDefault=true]  default preventDefault for bindings (per-binding overrides)
 * @param {Object} [options.inputGuard]            typing-guard config (see below)
 * @param {boolean} [options.inputGuard.enabled=true]
 * @param {boolean} [options.inputGuard.contentEditable=true]   treat contentEditable as typing
 * @param {string[]} [options.inputGuard.tags]      tag names that count as typing (default input/textarea/select)
 * @param {string[]} [options.inputGuard.textInputTypes]        which <input type> values count as typing
 * @param {string[]} [options.inputGuard.allowKeys] bare keys still allowed in inputs (default ['escape'])
 * @param {(target:any)=>boolean} [options.inputGuard.isTyping] custom predicate; overrides the built-in detection
 * @param {Object} [options.clock]                  injectable { now, setTimeout, clearTimeout }
 * @param {(state: HotkeyState) => void} [options.onChange]     called with state on every change
 * @returns {Object} the hotkey instance
 */
export function createHotkeys(options = {}) {
  const clock = options.clock || defaultClock();
  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;

  const GLOBAL_SCOPE = options.defaultScope || 'global';
  const osIsMac = options.os != null ? osLooksMac(options.os) : detectIsMac();
  const resolveMod = () => (osIsMac ? 'meta' : 'ctrl');

  const inputGuard = {
    enabled: !(options.inputGuard && options.inputGuard.enabled === false),
    contentEditable: !(options.inputGuard && options.inputGuard.contentEditable === false),
    tags: (options.inputGuard && options.inputGuard.tags) || ['input', 'textarea', 'select'],
    // A type-less <input> reports type 'text' (both in the DOM and via the
    // `|| 'text'` below), so no '' entry is needed here.
    textInputTypes: (options.inputGuard && options.inputGuard.textInputTypes) || [
      'text', 'search', 'email', 'url', 'tel', 'password', 'number',
      'date', 'datetime-local', 'month', 'week', 'time',
    ],
    // allowKeys are canonicalized through the same alias table so 'esc' works.
    allowKeys: new Set(
      ((options.inputGuard && options.inputGuard.allowKeys) || ['escape']).map((k) => canonicalMainKey(String(k).toLowerCase())),
    ),
    isTyping: (options.inputGuard && typeof options.inputGuard.isTyping === 'function') ? options.inputGuard.isTyping : null,
  };

  const config = {
    // Finite-guard: a non-finite (NaN/Infinity) consumer value would coerce to a
    // degenerate delay in the host setTimeout, resetting partial sequences on the next
    // macrotask and making every multi-key sequence un-completable. Fall back to 1000.
    sequenceTimeout: (Number.isFinite(options.sequenceTimeout) && options.sequenceTimeout >= 0) ? options.sequenceTimeout : 1000,
    preventDefault: options.preventDefault !== false,
  };

  // ---- binding store ------------------------------------------------------
  // One Binding may carry several `variants` (canonical step-arrays) that all map to the
  // same handler — the ["mod+s","ctrl+s"]-to-one-handler case. Lookups are O(1):
  //   exactIndex[stepKey]   → bindings whose full sequence is exactly stepKey
  //   prefixIndex[stepKey] → bindings for which stepKey is a PROPER prefix (a longer seq)
  // Both are kept in registration order so "last-registered wins" is just the last entry.

  /** @type {Map<string, Object>} id → Binding */
  const bindings = new Map();
  /** @type {Map<string, Object[]>} stepKey → bindings (registration order) */
  const exactIndex = new Map();
  /** @type {Map<string, Object[]>} proper-prefix stepKey → bindings */
  const prefixIndex = new Map();
  let idSequence = 0;

  // ---- scopes -------------------------------------------------------------
  // A global scope (config.defaultScope) is always active. On top of it sits a STACK of
  // contextual scopes; the topmost has the highest precedence and shadows the rest.
  /** @type {string[]} */
  const scopeStack = [];

  // ---- runtime state ------------------------------------------------------
  let enabled = options.enabled !== false;
  let destroyed = false;
  // True only during construction: suppresses synchronous emits (e.g. the auto-attach's
  // notify) so a `const hk = createHotkeys({ onChange })` never fires onChange before the
  // assignment completes (the TDZ trap). The first emit is always the deferred microtask.
  let constructing = true;
  let attached = false;
  let removeKeydownListener = null;
  let removeBlurListener = null;
  // Monotonic counter bumped by detach(): a teardown signal the synchronous fallback-fire paths
  // (sequence-timeout, interrupt) can detect even though detach()'s resetPending() cannot reach
  // their already-captured local `fallback`. They snapshot it before fanning out onChange and
  // bail if it advanced — so a fallback whose onChange detached cannot fire after detach. It is
  // never reset (re-attaching only moves it forward), so attach→detach→attach stays correct.
  let detachEpoch = 0;

  // sequence machine
  /** @type {string[]} */
  let pending = [];
  /** @type {Object[]} the exact match for the CURRENT pending seq, fired if it times out / is interrupted */
  let pendingFallback = [];
  let pendingEvent = null; // the event that created the current pending (for the fallback fire context)
  let sequenceTimer = null;

  // ---- scope helpers ------------------------------------------------------

  const scopeActive = (s) => s === GLOBAL_SCOPE || scopeStack.includes(s);

  /** Active scopes from HIGHEST precedence to lowest: scopeStack top → … → bottom, then global. */
  function activeHighToLow() {
    const out = [];
    for (let i = scopeStack.length - 1; i >= 0; i--) out.push(scopeStack[i]);
    out.push(GLOBAL_SCOPE);
    return out;
  }

  // ---- typing-guard -------------------------------------------------------

  /** Is the event target a text-entry context (input/textarea/select/contentEditable)? */
  function isTypingContext(target) {
    if (!inputGuard.enabled || !target) return false;
    if (inputGuard.isTyping) return !!inputGuard.isTyping(target);

    if (inputGuard.contentEditable) {
      if (target.isContentEditable === true) return true;
      const ce = typeof target.getAttribute === 'function' ? target.getAttribute('contenteditable') : target.contentEditable;
      if (ce === '' || ce === 'true' || ce === 'plaintext-only') return true;
    }
    const tag = String(target.tagName || '').toLowerCase();
    if (!inputGuard.tags.includes(tag)) return false;
    if (tag === 'input') {
      const type = String(target.type || 'text').toLowerCase();
      return inputGuard.textInputTypes.includes(type);
    }
    return true; // textarea / select (and any other configured tag)
  }

  // ---- match resolution ---------------------------------------------------
  // `guardPass` is computed once per event: true when NOT typing, or the event carries a
  // non-shift modifier, or its main key is on the allow-list (Escape by default). A binding
  // is firable when guardPass holds OR it is flagged enableInInput.

  function firableUnderGuard(binding, guardPass) {
    return guardPass || binding.enableInInput;
  }

  /**
   * The highest-precedence active scope that OWNS `stepKey` — i.e. the topmost active scope
   * holding ANY candidate (an exact match OR a proper-prefix of a longer sequence) for it.
   * That scope shadows every lower scope for this key, so both the exact-fallback resolution
   * and the live-prefix test must restrict themselves to it (otherwise a sequence registered
   * in a shadowed lower scope would still keep the key alive or fire, leaking through the
   * topmost owner — the very thing the scope model forbids). Returns null if no active scope
   * owns the key. Note: ownership is independent of the typing-guard (a guard-suppressed
   * owner still shadows lower scopes; cf. resolveExactTopmost's contract).
   */
  function topmostOwningScope(stepKey) {
    const exact = exactIndex.get(stepKey);
    const prefix = prefixIndex.get(stepKey);
    if ((!exact || !exact.length) && (!prefix || !prefix.length)) return null;
    for (const scope of activeHighToLow()) {
      if (exact) for (const binding of exact) if (binding.scope === scope) return scope;
      if (prefix) for (const binding of prefix) if (binding.scope === scope) return scope;
    }
    return null;
  }

  /**
   * The single binding to fire for an exact sequence `stepKey`, honoring scope precedence
   * (topmost active scope wins, shadowing lower scopes) and last-registered-wins within a
   * scope. Returns null if nothing matches/firable.
   */
  function resolveExactTopmost(stepKey, guardPass) {
    const candidates = exactIndex.get(stepKey);
    if (!candidates || !candidates.length) return null;
    // Scope shadowing is independent of the typing-guard: the topmost active scope that owns
    // ANY binding for this key (exact OR prefix) shadows every lower scope. Pick that scope's
    // last-registered EXACT binding (last wins) and fire it only if the guard lets it — if
    // that owning binding is guard-suppressed (or the owning scope holds only a prefix, no
    // exact), the key is still shadowed, so fire NOTHING rather than leaking a lower-scope
    // binding through (a modal's key must not fall through to a global one).
    const owningScope = topmostOwningScope(stepKey);
    if (owningScope == null) return null;
    let owner = null;
    for (const binding of candidates) if (binding.scope === owningScope) owner = binding; // last wins
    if (!owner) return null; // the owning scope owns only a longer (prefix) sequence, not this exact key
    return firableUnderGuard(owner, guardPass) ? owner : null;
  }

  /**
   * Is there an active, firable binding for which `stepKey` is a proper prefix (a longer seq
   * could still complete)? Only the topmost scope that owns the key counts: a prefix in a
   * shadowed lower scope must NOT keep the key alive (it would swallow a topmost-scope
   * standalone and fire through the shadow).
   */
  function hasLivePrefix(stepKey, guardPass) {
    const candidates = prefixIndex.get(stepKey);
    if (!candidates || !candidates.length) return false;
    const owningScope = topmostOwningScope(stepKey);
    if (owningScope == null) return false;
    for (const binding of candidates) if (binding.scope === owningScope && firableUnderGuard(binding, guardPass)) return true;
    return false;
  }

  /**
   * The sequence-timeout to use while waiting on `stepKey`: the min per-binding override
   * among live prefixes, else the engine default. Honors the same typing-guard filter as
   * hasLivePrefix — a binding the guard suppresses must not shrink the timeout either.
   */
  function resolveSequenceTimeout(stepKey, guardPass) {
    const candidates = prefixIndex.get(stepKey);
    // Only the topmost scope that owns the key contributes a timeout — a shadowed lower-scope
    // prefix is not live (hasLivePrefix ignores it) and so must not shrink the timeout either.
    const owningScope = topmostOwningScope(stepKey);
    let timeout = null;
    if (candidates && owningScope != null) {
      for (const binding of candidates) {
        // Ignore non-finite per-binding overrides (NaN/Infinity) — Math.min would let a
        // NaN poison the result; a non-finite override should not shrink the timeout.
        if (binding.scope === owningScope && firableUnderGuard(binding, guardPass)
            && Number.isFinite(binding.sequenceTimeout) && binding.sequenceTimeout >= 0) {
          timeout = timeout == null ? binding.sequenceTimeout : Math.min(timeout, binding.sequenceTimeout);
        }
      }
    }
    return timeout == null ? config.sequenceTimeout : timeout;
  }

  // ---- firing -------------------------------------------------------------

  /** preventDefault when possible; reports whether it actually happened (it used to claim true even with no event). */
  function doPreventDefault(event) {
    if (event && typeof event.preventDefault === 'function') {
      event.preventDefault();
      return true;
    }
    return false;
  }

  function publicBinding(binding) {
    return {
      id: binding.id,
      keys: binding.keyStrings.slice(),
      description: binding.description,
      scope: binding.scope,
      sequence: binding.maxLength > 1,
      length: binding.maxLength,
      preventDefault: binding.preventDefault,
      stopPropagation: binding.stopPropagation,
      enableInInput: binding.enableInInput,
      repeat: binding.repeat,
      sequenceTimeout: binding.sequenceTimeout,
      data: binding.data,
    };
  }

  /** Invoke one binding's handler with a context object; apply preventDefault/stopPropagation; emit 'fire'. */
  function fireOne(binding, event, sequenceSteps) {
    const context = {
      event: event || null,
      keys: binding.keyStrings.slice(),
      combo: sequenceSteps.join(' '),
      sequence: sequenceSteps.slice(),
      scope: binding.scope,
      data: binding.data,
      binding: publicBinding(binding),
    };
    let prevented = false;
    if (binding.preventDefault !== false) prevented = doPreventDefault(event);
    if (binding.stopPropagation && event && typeof event.stopPropagation === 'function') event.stopPropagation();
    try {
      binding.handler(context);
    } catch (err) {
      // One bad handler must not break the engine (or, on the timer path, escape uncatchably).
      if (typeof console !== 'undefined' && console.error) console.error('[hotkey-engine] handler error', err);
    }
    emit('fire', context);
    return prevented;
  }

  function fireMany(list, event, sequenceSteps) {
    let prevented = false;
    for (const binding of list) prevented = fireOne(binding, event, sequenceSteps) || prevented;
    return prevented;
  }

  // ---- sequence machine ---------------------------------------------------

  function clearSequenceTimer() {
    if (sequenceTimer != null) { clock.clearTimeout(sequenceTimer); sequenceTimer = null; }
  }

  function setPending(steps, fallback, event) {
    pending = steps;
    pendingFallback = fallback;
    pendingEvent = event;
    notifySequence();
  }

  function resetPending() {
    if (pending.length || pendingFallback.length || pendingEvent) {
      pending = [];
      pendingFallback = [];
      pendingEvent = null;
      clearSequenceTimer();
      notifySequence();
    } else {
      clearSequenceTimer();
    }
  }

  function handleSequenceTimeout() {
    sequenceTimer = null;
    const fallback = pendingFallback;
    const event = pendingEvent;
    const interruptedSequence = pending;
    const detachAtArm = detachEpoch;
    // Reset BEFORE firing so a handler that rebinds/triggers sees a clean machine.
    pending = []; pendingFallback = []; pendingEvent = null;
    notifySequence();
    // notifySequence() synchronously fans out onChange/'change'/'sequence', which a consumer
    // may use to destroy()/disable()/detach() the engine. Re-check liveness before the captured
    // fallback fires — the timer already nulled sequenceTimer, so teardown's clearSequenceTimer()
    // is a no-op and cannot stop this; without the guard the handler runs after teardown.
    // The detachEpoch check also catches detach(): detach()'s resetPending() can't reach the
    // already-captured local `fallback`, but detach() bumps detachEpoch, so a fallback whose
    // onChange detached is recognized as stale and dropped (detach()'s documented contract).
    if (fallback.length && !destroyed && enabled && detachEpoch === detachAtArm) fireMany(fallback, event, interruptedSequence); // standalone fires when the timeout elapses
  }

  /**
   * Core matcher for a single combo (already past the lone-modifier and repeat short-circuits).
   * Returns a small result object describing what happened (for tests/consumers).
   */
  function processCombo(combo, event, guardPass) {
    const step = pending.concat([combo]);
    const stepKey = step.join(' ');
    const live = hasLivePrefix(stepKey, guardPass);
    const exact = resolveExactTopmost(stepKey, guardPass);

    if (live) {
      // The sequence can still grow — wait. Remember the exact match (if any) as the
      // standalone fallback to fire on timeout / interruption. Consume the key.
      setPending(step, exact ? [exact] : [], event);
      clearSequenceTimer();
      // setPending() synchronously fans out onChange, which a consumer commonly uses to
      // destroy()/detach()/disable() the engine on a state change. Each of those tears the
      // pending sequence down (resetPending() empties `pending`), so only re-arm the timer
      // when the sequence is still live — otherwise we'd leak a host timer past teardown.
      if (!destroyed && enabled && pending.length) {
        const seqTimeout = resolveSequenceTimeout(stepKey, guardPass);
        sequenceTimer = clock.setTimeout(handleSequenceTimeout, (Number.isFinite(seqTimeout) && seqTimeout >= 0) ? seqTimeout : config.sequenceTimeout);
      }
      const prevented = maybePreventConsumed(stepKey, exact, event, guardPass);
      return { matched: true, fired: [], prevented, pending: pending.slice() };
    }

    if (exact) {
      // Completes a binding and nothing longer can continue — fire now.
      resetPending();
      const prevented = fireOne(exact, event, step);
      return { matched: true, fired: [publicBinding(exact)], prevented, pending: [] };
    }

    // Dead end for `step`.
    if (pending.length) {
      // A non-continuing key arrived: fire the pending standalone fallback, then reprocess
      // THIS key from a clean slate (it may start a new sequence or fire on its own).
      const fallbackBindings = pendingFallback;
      const fallbackEvent = pendingEvent;
      const interruptedSequence = pending;
      const detachAtArm = detachEpoch; // snapshot so a fallback that detach()es bails below
      pending = []; pendingFallback = []; pendingEvent = null;
      clearSequenceTimer();
      notifySequence();
      let fallbackPrevented = false;
      if (fallbackBindings.length) {
        fallbackPrevented = fireMany(fallbackBindings, fallbackEvent, interruptedSequence);
      }
      // The fallback is consumer code: it may synchronously re-enter handleEvent and start a
      // BRAND-NEW sequence (repopulating `pending` and arming its own timer). If it did, the
      // interrupting key has already been superseded — recursing here would re-enter this same
      // branch against the wrong base, wipe that fresh sequence and clear its just-armed timer.
      // Only reprocess this key when the slate is still clean.
      if (pending.length) {
        return {
          matched: fallbackBindings.length > 0,
          fired: fallbackBindings.map(publicBinding),
          prevented: fallbackPrevented,
          pending: pending.slice(),
        };
      }
      // The fallback may have torn the engine down (disable()/detach()/destroy()): disable()
      // empties pending but keeps the bindings, so without this re-check the interrupting key
      // would re-match and fire while the engine is disabled — violating "disabled matches
      // nothing". detach() likewise leaves enabled/destroyed untouched, so detachEpoch (bumped
      // by detach()) is checked too — without it the interrupting key would fire after detach.
      // processCombo has no liveness guard of its own (only handleEvent's top does,
      // already passed), so bail here returning just the fallback's outcome.
      if (destroyed || !enabled || detachEpoch !== detachAtArm) {
        return {
          matched: fallbackBindings.length > 0,
          fired: fallbackBindings.map(publicBinding),
          prevented: fallbackPrevented,
          pending: pending.slice(),
        };
      }
      // Re-run this key from the clean slate, then merge the interrupted fallback's
      // outcome into the result — it used to be silently dropped from `fired`.
      const result = processCombo(combo, event, guardPass); // pending is empty now → terminates
      return {
        matched: result.matched || fallbackBindings.length > 0,
        fired: [...fallbackBindings.map(publicBinding), ...result.fired],
        prevented: result.prevented || fallbackPrevented,
        pending: result.pending,
      };
    }

    // `combo` alone matches nothing.
    return { matched: false, fired: [], prevented: false, pending: [] };
  }

  /**
   * preventDefault a consumed sequence step if any live prefix candidate wants it — or if
   * the exact standalone fallback for this step wants it (a fallback that fires on timeout
   * with preventDefault intent used to lose that intent when the step was consumed as a
   * prefix). Default intent is true.
   */
  function maybePreventConsumed(stepKey, exactFallback, event, guardPass) {
    if (exactFallback && exactFallback.preventDefault !== false) {
      return doPreventDefault(event);
    }
    const candidates = prefixIndex.get(stepKey);
    // Only the topmost owning scope's prefix counts — a shadowed lower-scope prefix is not the
    // live one keeping this step pending, so its preventDefault intent must not apply.
    const owningScope = topmostOwningScope(stepKey);
    if (candidates && owningScope != null) {
      for (const binding of candidates) {
        if (binding.scope === owningScope && firableUnderGuard(binding, guardPass) && binding.preventDefault !== false) {
          return doPreventDefault(event);
        }
      }
    }
    return false;
  }

  // ---- the dispatch entry point (real listener AND tests call this) --------

  /**
   * Run a key event (a real KeyboardEvent or a synthetic event-like object) through the full
   * match pipeline: normalize → typing-guard → repeat/lone-modifier guards → sequence/chord
   * matching → fire. This is the seam that makes the engine provable headlessly.
   * @param {Object} event  { key, ctrlKey?, metaKey?, shiftKey?, altKey?, repeat?, target?, preventDefault?, stopPropagation? }
   * @returns {{ matched: boolean, fired: Object[], prevented: boolean, pending: string[] }}
   */
  function handleEvent(event) {
    if (destroyed || !enabled) return { matched: false, fired: [], prevented: false, pending: pending.slice() };

    const normalized = normalizeKeyEvent(event);
    if (normalized.modifierOnly) {
      // Lone modifier/lock: ignore entirely, and DON'T disturb a pending sequence.
      return { matched: false, fired: [], prevented: false, pending: pending.slice() };
    }

    const typing = isTypingContext(event && event.target);
    const guardPass = !typing || normalized.hasNonShiftModifier || inputGuard.allowKeys.has(normalized.mainKey);

    // Auto-repeat (held key): fire only repeat-enabled chords; never advance/reset a sequence.
    if (event && event.repeat) {
      const hit = resolveExactTopmost(normalized.combo, guardPass);
      if (hit && hit.repeat) {
        const prevented = fireOne(hit, event, [normalized.combo]);
        return { matched: true, fired: [publicBinding(hit)], prevented, pending: pending.slice() };
      }
      // A matched but repeat-disabled binding still owns the key: keep preventing the
      // browser default on the held repeats (the first press prevented it; letting
      // repeats through would e.g. open the save dialog while Ctrl+S is held).
      if (hit && hit.preventDefault !== false) {
        const prevented = doPreventDefault(event);
        return { matched: false, fired: [], prevented, pending: pending.slice() };
      }
      return { matched: false, fired: [], prevented: false, pending: pending.slice() };
    }

    return processCombo(normalized.combo, event, guardPass);
  }

  // ---- registration -------------------------------------------------------

  function indexBinding(binding) {
    for (const variant of binding.variants) {
      const key = variant.join(' ');
      let list = exactIndex.get(key);
      if (!list) exactIndex.set(key, (list = []));
      list.push(binding);
      // every PROPER prefix → this binding
      for (let k = 1; k < variant.length; k++) {
        const prefixKey = variant.slice(0, k).join(' ');
        let prefixList = prefixIndex.get(prefixKey);
        if (!prefixList) prefixIndex.set(prefixKey, (prefixList = []));
        prefixList.push(binding);
      }
    }
  }

  function deindexBinding(binding) {
    for (const variant of binding.variants) {
      const key = variant.join(' ');
      const list = exactIndex.get(key);
      if (list) {
        const filtered = list.filter((x) => x !== binding);
        if (filtered.length) exactIndex.set(key, filtered); else exactIndex.delete(key);
      }
      for (let k = 1; k < variant.length; k++) {
        const prefixKey = variant.slice(0, k).join(' ');
        const prefixList = prefixIndex.get(prefixKey);
        if (prefixList) {
          const filtered = prefixList.filter((x) => x !== binding);
          if (filtered.length) prefixIndex.set(prefixKey, filtered); else prefixIndex.delete(prefixKey);
        }
      }
    }
  }

  /**
   * Register a binding.
   * @param {string|string[]} keys   a hotkey string ("mod+s", "g g") or an array of strings → one handler
   * @param {(context:Object)=>void} handler
   * @param {Object} [bindOptions]
   * @param {string} [bindOptions.scope]            scope name (default the global scope)
   * @param {boolean} [bindOptions.preventDefault]  default = engine default (true)
   * @param {boolean} [bindOptions.stopPropagation=false]
   * @param {boolean} [bindOptions.enableInInput=false]  fire even while typing in an input
   * @param {boolean} [bindOptions.repeat=false]    fire on auto-repeat (held key) too
   * @param {number} [bindOptions.sequenceTimeout]  per-binding override for the partial-sequence timeout
   * @param {string} [bindOptions.description]      for a consumer-rendered cheatsheet
   * @param {*} [bindOptions.data]                  arbitrary data carried on the binding
   * @param {string} [bindOptions.id]               explicit id (else auto)
   * @returns {Function} an unbind handle: call it to remove this binding. It also carries `.id` and `.keys`.
   */
  function bind(keys, handler, bindOptions = {}) {
    if (destroyed) return makeUnbindHandle(null, []);
    if (typeof handler !== 'function') throw new Error('hotkey: bind(keys, handler) requires a handler function');

    const keyStrings = Array.isArray(keys) ? keys.slice() : [keys];
    if (!keyStrings.length) throw new Error('hotkey: bind requires at least one key string');
    // Dedupe variants that compile to the same canonical steps — ['mod+s','ctrl+s'] on
    // Windows both become 'ctrl+s', and double-indexing made getConflicts() report the
    // binding as conflicting with itself.
    const variants = [];
    const seenVariantKeys = new Set();
    for (const keyString of keyStrings) {
      const steps = compileSteps(keyString, resolveMod);
      const variantKey = steps.join(' ');
      if (seenVariantKeys.has(variantKey)) continue;
      seenVariantKeys.add(variantKey);
      variants.push(steps);
    }
    const maxLength = variants.reduce((longest, variant) => Math.max(longest, variant.length), 0);

    const id = bindOptions.id != null ? String(bindOptions.id) : `hk${++idSequence}`;
    // If a consumer supplies an explicit id matching our auto-id format `hk<N>`, advance the
    // auto counter past it so a future auto id can never reuse (and silently clobber) it.
    if (bindOptions.id != null) {
      const reserved = /^hk(\d+)$/.exec(id);
      // An overlong digit id (~309+ digits) overflows Number() to Infinity; letting that reach
      // the persistent counter would make every later auto id `hkInfinity`, colliding and
      // silently clobbering bindings. Only advance past a safe integer.
      if (reserved) {
        const reservedNum = Number(reserved[1]);
        if (Number.isSafeInteger(reservedNum)) idSequence = Math.max(idSequence, reservedNum);
      }
    }
    const binding = {
      id,
      keyStrings,
      variants,
      maxLength,
      handler,
      scope: bindOptions.scope || GLOBAL_SCOPE,
      preventDefault: bindOptions.preventDefault != null ? bindOptions.preventDefault : config.preventDefault,
      stopPropagation: !!bindOptions.stopPropagation,
      enableInInput: !!bindOptions.enableInInput,
      repeat: !!bindOptions.repeat,
      sequenceTimeout: bindOptions.sequenceTimeout != null ? bindOptions.sequenceTimeout : null,
      description: bindOptions.description || '',
      data: bindOptions.data,
    };

    // An explicit id replaces any existing binding with that id (re-bind in place).
    let wasReplaced = false;
    if (bindings.has(id)) {
      const replaced = bindings.get(id);
      deindexBinding(replaced);
      wasReplaced = true;
      // The clobbered binding must not fire later from stale sequence state: it may still be
      // the pending standalone fallback waiting on a timeout/interruption (cf. removeById).
      if (pendingFallback.length) {
        pendingFallback = pendingFallback.filter((candidate) => candidate !== replaced);
      }
    }
    bindings.set(id, binding);
    indexBinding(binding);
    // The clobbered binding may have been the live prefix of the in-progress sequence; clear the
    // stale pending/timer (mirrors unbind()/unbindAll()/the unbind handle) so the emitted pending
    // never reports a prefix no longer backed by any binding, and no orphaned timer survives.
    if (wasReplaced) resetPending();
    notify();
    return makeUnbindHandle(id, keyStrings);
  }

  function makeUnbindHandle(id, keyStrings) {
    // Removing via the handle emits a change just like unbind() does, so a consumer
    // re-rendering its cheatsheet from getState()/getBindings() stays in sync.
    const handle = () => { if (id != null && removeById(id)) { resetPending(); notify(); } };
    handle.id = id;
    handle.keys = keyStrings;
    return handle;
  }

  function removeById(id) {
    const binding = bindings.get(String(id));
    if (!binding) return false;
    deindexBinding(binding);
    bindings.delete(String(id));
    // A removed binding must not fire later from stale sequence state: it may still be
    // the pending standalone fallback waiting on a timeout/interruption.
    if (pendingFallback.length) {
      pendingFallback = pendingFallback.filter((candidate) => candidate !== binding);
    }
    return true;
  }

  /**
   * Remove binding(s) by id or by key string. Passing a key string removes every binding
   * registered with that exact string. Returns the number removed.
   * @param {string} idOrKeys
   */
  function unbind(idOrKeys) {
    if (destroyed) return 0;
    let removed = 0;
    if (bindings.has(String(idOrKeys))) {
      if (removeById(idOrKeys)) removed++;
    } else {
      // match by original key string
      for (const binding of [...bindings.values()]) {
        if (binding.keyStrings.includes(idOrKeys)) { if (removeById(binding.id)) removed++; }
      }
    }
    // A removed binding may have been the live prefix of the in-progress sequence; clear the
    // stale pending/timer (mirrors disable() and the scope mutators) so the emitted pending
    // never reports a prefix no longer backed by any binding.
    if (removed) { resetPending(); notify(); }
    return removed;
  }

  /** Remove all bindings, or all in one scope. Returns the number removed. */
  function unbindAll(scope) {
    if (destroyed) return 0;
    let removed = 0;
    for (const binding of [...bindings.values()]) {
      if (scope == null || binding.scope === scope) { if (removeById(binding.id)) removed++; }
    }
    // Clear any in-progress sequence whose live prefix we just removed (see unbind()).
    if (removed) { resetPending(); notify(); }
    return removed;
  }

  // ---- programmatic trigger -----------------------------------------------

  /**
   * Fire the binding(s) for a key string programmatically, bypassing the keyboard and the
   * typing-guard (useful for tests, chaining, or "run this action"). Resolves the exact
   * match in the active scopes (topmost wins, last-registered wins). Returns true if a
   * handler fired.
   * @param {string} keys
   */
  function trigger(keys) {
    if (destroyed || !enabled) return false;
    let step;
    try { step = compileSteps(keys, resolveMod); } catch { return false; }
    const hit = resolveExactTopmost(step.join(' '), true);
    if (!hit) return false;
    fireOne(hit, null, step);
    return true;
  }

  // ---- scopes -------------------------------------------------------------

  // The structural global scope is always active and lives OUTSIDE scopeStack (getActiveScopes
  // prepends it). Pushing its name onto the stack would duplicate it in the emitted `scopes`,
  // so the global name is a no-op on the contextual stack.
  function pushScope(name) { if (!destroyed && name && name !== GLOBAL_SCOPE) { scopeStack.push(name); resetPending(); notify(); } return instance; }
  function popScope() {
    if (destroyed || !scopeStack.length) return null;
    const popped = scopeStack.pop();
    resetPending();
    notify();
    return popped;
  }
  /** Replace the whole contextual scopeStack with a single scope (or clear it with a falsy name). */
  function setScope(name) {
    if (destroyed) return instance;
    scopeStack.length = 0;
    if (name && name !== GLOBAL_SCOPE) scopeStack.push(name);
    resetPending();
    notify();
    return instance;
  }
  function activateScope(name) { if (!destroyed && name && name !== GLOBAL_SCOPE && !scopeStack.includes(name)) { scopeStack.push(name); resetPending(); notify(); } return instance; }
  function deactivateScope(name) {
    if (destroyed || !name) return instance;
    let changed = false;
    for (let i = scopeStack.length - 1; i >= 0; i--) if (scopeStack[i] === name) { scopeStack.splice(i, 1); changed = true; }
    if (changed) { resetPending(); notify(); }
    return instance;
  }
  function isScopeActive(name) { return scopeActive(name); }
  /** Active scopes, lowest precedence first: global, then the scopeStack bottom→top. */
  function getActiveScopes() { return [GLOBAL_SCOPE, ...scopeStack]; }

  // ---- enable / disable ---------------------------------------------------

  function enable() { if (!destroyed && !enabled) { enabled = true; notify(); } return instance; }
  function disable() { if (!destroyed && enabled) { enabled = false; resetPending(); notify(); } return instance; }
  function isEnabled() { return enabled; }

  // ---- reads / state ------------------------------------------------------

  /** Registered bindings (optionally one scope) as plain objects for a cheatsheet. Never exposes handlers. */
  function getBindings(scope) {
    const out = [];
    for (const binding of bindings.values()) if (scope == null || binding.scope === scope) out.push(publicBinding(binding));
    return out;
  }

  /** The in-progress sequence as canonical combos (empty when idle). */
  function getPendingSequence() { return pending.slice(); }

  /**
   * Conflicts: groups of >1 binding sharing the same exact key in the same scope (the loser
   * is shadowed by last-registered-wins). For a settings UI that wants to warn "already bound".
   * @returns {Array<{ keys: string, scope: string, bindings: string[] }>}
   */
  function getConflicts() {
    const out = [];
    for (const [stepKey, list] of exactIndex) {
      const byScope = new Map();
      for (const binding of list) {
        let group = byScope.get(binding.scope);
        if (!group) byScope.set(binding.scope, (group = []));
        group.push(binding.id);
      }
      for (const [scope, ids] of byScope) if (ids.length > 1) out.push({ keys: stepKey, scope, bindings: ids });
    }
    return out;
  }

  function buildState() {
    return {
      enabled,
      attached,
      platform: osIsMac ? 'mac' : 'other',
      mod: resolveMod(),
      scopes: getActiveScopes(),
      pending: pending.slice(),
      bindingCount: bindings.size,
    };
  }

  function notify() {
    if (destroyed || constructing) return;
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }
  /** Pending-sequence changes piggyback on 'change' (so one subscription renders both the cheatsheet and the "group…" hint) and also emit a granular 'sequence' event. */
  function notifySequence() {
    if (destroyed) return;
    emitter.emit('sequence', pending.slice());
    notify();
  }
  const emit = (type, payload) => { if (!destroyed) emitter.emit(type, payload); };

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }
  /** Subscribe to a named event: 'change' (state) | 'sequence' (pending combos) | 'fire' (a binding fired). */
  function on(type, callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on(type, callback);
  }
  function getState() { return buildState(); }

  // ---- listening lifecycle (the only DOM; all guarded, inside methods) ----

  function resolveTarget(explicitTarget) {
    if (explicitTarget) return explicitTarget;
    if (options.target) return options.target;
    if (typeof document !== 'undefined') return document;
    return null;
  }

  /** Attach the single keydown listener (and a window blur reset). No-op if no DOM target is resolvable. */
  function attach(t) {
    if (destroyed) return instance;
    const target = resolveTarget(t);
    if (!target || typeof target.addEventListener !== 'function') return instance; // Node/SSR: nothing to attach to
    if (attached) detach();
    const onKeyDown = (e) => handleEvent(e);
    target.addEventListener('keydown', onKeyDown);
    removeKeydownListener = () => target.removeEventListener('keydown', onKeyDown);
    // Losing window focus mid-sequence must not carry a stale `group` into the next focus.
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      const onBlur = () => resetPending();
      window.addEventListener('blur', onBlur);
      removeBlurListener = () => window.removeEventListener('blur', onBlur);
    }
    attached = true;
    notify();
    return instance;
  }

  function detach() {
    // Clear any in-progress sequence and its timer when we stop listening, so a
    // pending standalone-fallback handler can't fire after detach (mirrors disable()).
    // Bump the teardown epoch so an in-flight fallback fire (timeout / interrupt) whose
    // onChange called detach() recognizes this as a teardown and bails — resetPending()
    // alone can't, since those paths already captured their `fallback` locally.
    detachEpoch++;
    resetPending();
    if (removeKeydownListener) { removeKeydownListener(); removeKeydownListener = null; }
    if (removeBlurListener) { removeBlurListener(); removeBlurListener = null; }
    if (attached) { attached = false; if (!destroyed) notify(); }
    return instance;
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true; // set first so detach()'s teardown emits nothing
    detach();
    clearSequenceTimer();
    pending = []; pendingFallback = []; pendingEvent = null;
    bindings.clear();
    exactIndex.clear();
    prefixIndex.clear();
    scopeStack.length = 0;
    emitter.clear();
  }

  const instance = {
    // registration
    bind, unbind, unbindAll, trigger,
    // scopes
    pushScope, popScope, setScope, activateScope, deactivateScope, isScopeActive, getActiveScopes,
    // listening lifecycle
    attach, detach,
    // dispatch (real listener + headless tests use this)
    handleEvent,
    // enable / disable
    enable, disable, isEnabled,
    // reads / state
    getBindings, getPendingSequence, getConflicts, getState, subscribe, on,
    // lifecycle
    destroy,
  };

  // Auto-attach on construction when a target is resolvable (no-op in Node/SSR). Its notify()
  // is suppressed by `constructing` — the first emit is the deferred microtask below.
  if (options.autoAttach !== false) attach(options.target);
  constructing = false;

  // Defer the initial emit a microtask so a synchronous subscribe()/onChange right after
  // creation still receives it, and `hk` is fully assigned before onChange runs (as the
  // other engines do).
  if (typeof queueMicrotask === 'function') queueMicrotask(() => { if (!destroyed) notify(); });

  return instance;
}
