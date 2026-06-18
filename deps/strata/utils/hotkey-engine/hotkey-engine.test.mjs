// hotkey-engine.test.mjs
// Pure unit tests for the hotkey engine. No DOM, no browser, no framework:
//   node hotkey-engine/hotkey-engine.test.mjs
//
// Importing hotkey-engine.js here doubles as the headless-core design check: if the module
// touched document/window/navigator at top level, this import would throw in Node. It does
// not — that access lives inside methods behind guards.
//
// The whole match pipeline is driven through handleEvent(eventLike) with SYNTHETIC key-event
// shapes ({ key, code, ctrlKey, metaKey, shiftKey, altKey, repeat, target }), so which binding
// matches is asserted with no real keyboard. The partial-sequence timeout is driven by an
// INJECTABLE FAKE CLOCK so it is deterministic without real waiting.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, testAsync, assert, isMain, report } from './harness.mjs';
import { createHotkeys, defaultClock, parseHotkey, eventToCombo } from './hotkey-engine.js';

// ---- fake clock (advance(ms) fires due timers in order; mirrors toast-engine) ----
function makeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    now: () => now,
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fireAt: now + Math.max(0, ms || 0), fn }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    advance: (ms) => {
      const target = now + ms;
      for (;;) {
        let next = null;
        for (const [id, t] of timers) {
          if (t.fireAt <= target && (next === null || t.fireAt < next.fireAt || (t.fireAt === next.fireAt && id < next.id))) {
            next = { id, fireAt: t.fireAt, fn: t.fn };
          }
        }
        if (!next) break;
        timers.delete(next.id);
        now = next.fireAt;
        next.fn();
      }
      now = target;
    },
    pending: () => timers.size,
  };
}

// An engine wired to a fresh fake clock, forced OS, no auto-attach (no DOM in Node).
function mk(opts = {}) {
  const clock = makeClock();
  const hk = createHotkeys({ os: 'mac', autoAttach: false, clock, ...opts });
  const log = [];
  // a binder that records fires by label, returning the unbind handle
  const bindLog = (keys, label, o) => hk.bind(keys, () => log.push(label), o);
  return { clock, hk, log, bindLog };
}

// A synthetic key event whose preventDefault/stopPropagation are observable.
function ev(props) {
  return {
    key: props.key,
    code: props.code,
    ctrlKey: !!props.ctrlKey, metaKey: !!props.metaKey, shiftKey: !!props.shiftKey, altKey: !!props.altKey,
    repeat: !!props.repeat,
    target: props.target,
    _pd: false, _sp: false,
    preventDefault() { this._pd = true; },
    stopPropagation() { this._sp = true; },
  };
}

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and constructs headless (no DOM)', () => {
  const hk = createHotkeys(); // default options, no document/window/navigator present
  assert.equal(typeof hk.bind, 'function');
  assert.equal(typeof hk.handleEvent, 'function');
  const st = hk.getState();
  assert.equal(st.attached, false, 'nothing to attach to in Node → not attached, no throw');
  assert.equal(st.enabled, true);
  assert.equal(typeof st.platform, 'string');
  hk.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./hotkey-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const s of specifiers) assert.ok(s.startsWith('../shared/'), `import "${s}" must come from ../shared/`);
});

test('getState() is valid immediately; default scope is global and always active', () => {
  const { hk } = mk();
  const st = hk.getState();
  assert.deepEqual(st.scopes, ['global']);
  assert.deepEqual(st.pending, []);
  assert.equal(st.bindingCount, 0);
  assert.equal(hk.isScopeActive('global'), true);
});

// ============================================================================
// Parsing (string → canonical)
// ============================================================================

test('parse: modifier order independence + aliases + case-insensitivity', () => {
  // shift+cmd+p == cmd+shift+p; cmd/command/meta all → meta; case-insensitive
  assert.deepEqual(parseHotkey('shift+cmd+p', { os: 'mac' }), parseHotkey('Cmd+Shift+P', { os: 'mac' }));
  assert.deepEqual(parseHotkey('COMMAND+P', { os: 'mac' }), ['meta+p']);
  assert.deepEqual(parseHotkey('Control+K'), ['ctrl+k']);
  assert.deepEqual(parseHotkey('opt+up'), ['alt+arrowup']);
  assert.deepEqual(parseHotkey('option+ArrowUp'), ['alt+arrowup']);
  assert.deepEqual(parseHotkey('esc'), ['escape']);
  assert.deepEqual(parseHotkey('Return'), ['enter']);
});

test('parse: `mod` resolves per forced OS (Cmd on mac, Ctrl elsewhere)', () => {
  assert.deepEqual(parseHotkey('mod+s', { os: 'mac' }), ['meta+s']);
  assert.deepEqual(parseHotkey('mod+s', { os: 'macos' }), ['meta+s']);
  assert.deepEqual(parseHotkey('mod+s', { os: 'windows' }), ['ctrl+s']);
  assert.deepEqual(parseHotkey('mod+s', { os: 'linux' }), ['ctrl+s']);
});

test('parse: sequences are space-separated; steps may be chords', () => {
  assert.deepEqual(parseHotkey('g g'), ['g', 'g']);
  assert.deepEqual(parseHotkey('g i'), ['g', 'i']);
  assert.deepEqual(parseHotkey('g c c'), ['g', 'c', 'c']);
  assert.deepEqual(parseHotkey('ctrl+x ctrl+s'), ['ctrl+x', 'ctrl+s']);
});

test('parse: shift+symbol normalization — bind the produced glyph; letters keep shift', () => {
  // event.key bakes Shift into a printable symbol, so for symbols Shift is absorbed:
  assert.deepEqual(parseHotkey('shift+/'), ['/'], 'shift+/ collapses to the base symbol (bind "?" for the glyph)');
  assert.deepEqual(parseHotkey('?'), ['?'], '"?" is its own combo, no modifier');
  // Letters keep shift as a real modifier (shift+a is distinct from a):
  assert.deepEqual(parseHotkey('shift+a'), ['shift+a']);
  assert.deepEqual(parseHotkey('A'), ['a'], 'an uppercase letter in a binding is the letter, NOT shift');
  // Named keys keep shift:
  assert.deepEqual(parseHotkey('shift+enter'), ['shift+enter']);
});

test('parse: the plus key', () => {
  assert.deepEqual(parseHotkey('ctrl++'), ['ctrl++']);
  assert.deepEqual(parseHotkey('ctrl+plus'), ['ctrl++']);
  assert.deepEqual(parseHotkey('+'), ['+']);
});

test('regression: a trailing "+" is the plus key, not an unmatchable garbage token', () => {
  // The trailing-plus normalization used to drop the separator ("ctrl+" → "ctrlplus"),
  // producing a single bogus main key that could never match a real keystroke. The
  // separator must be kept so the plus segment splits out on its own.
  assert.deepEqual(parseHotkey('ctrl+', { os: 'mac' }), ['ctrl++'], '"ctrl+" means Ctrl + the plus key');
  assert.deepEqual(parseHotkey('cmd+', { os: 'mac' }), ['meta++'], '"cmd+" means Cmd + the plus key');
  // A bare main key followed by "+" is two main keys (a + plus) — a loud error, not silent garbage.
  assert.throws(() => parseHotkey('a+', { os: 'mac' }), /multiple main keys/i);
});

test('parse: invalid strings throw', () => {
  assert.throws(() => parseHotkey(''), /empty/i);
  assert.throws(() => parseHotkey('   '), /empty/i);
  assert.throws(() => parseHotkey('ctrl'), /no main key/i, 'a chord needs a non-modifier key');
  assert.throws(() => parseHotkey('a+b'), /multiple main keys/i);
});

// ============================================================================
// eventToCombo (event shape → canonical combo)
// ============================================================================

test('eventToCombo: basic chords, named keys, space', () => {
  assert.equal(eventToCombo({ key: 'k', ctrlKey: true }), 'ctrl+k');
  assert.equal(eventToCombo({ key: 'p', metaKey: true, shiftKey: true }), 'meta+shift+p');
  assert.equal(eventToCombo({ key: 'ArrowUp', altKey: true }), 'alt+arrowup');
  assert.equal(eventToCombo({ key: 'Escape' }), 'escape');
  assert.equal(eventToCombo({ key: ' ' }), 'space');
});

test('eventToCombo: lone modifier/lock keydown → null', () => {
  for (const k of ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock']) {
    assert.equal(eventToCombo({ key: k, shiftKey: true }), null, `${k} alone is not a combo`);
  }
});

test('eventToCombo: shift-symbol absorbed; uppercase letter keeps shift', () => {
  assert.equal(eventToCombo({ key: '?', shiftKey: true }), '?', 'Shift+/ produces "?" — shift absorbed');
  assert.equal(eventToCombo({ key: '!', shiftKey: true }), '!');
  assert.equal(eventToCombo({ key: 'A', shiftKey: true }), 'shift+a', 'uppercase letter → shift+a');
  assert.equal(eventToCombo({ key: 'a' }), 'a');
});

// ============================================================================
// Chord matching + modifier exactness + preventDefault
// ============================================================================

test('chord: the matching binding fires; nothing fires when unbound', () => {
  const { hk, log } = mk();
  hk.bind('mod+k', () => log.push('palette'));
  const r = hk.handleEvent(ev({ key: 'k', metaKey: true }));
  assert.deepEqual(log, ['palette']);
  assert.equal(r.matched, true);
  assert.equal(r.fired[0].keys[0], 'mod+k');
  const r2 = hk.handleEvent(ev({ key: 'j' }));
  assert.equal(r2.matched, false, 'unbound key matches nothing');
});

test('chord: modifier exactness — ctrl+k fires on Ctrl+K but NOT Ctrl+Shift+K', () => {
  const { hk, log } = mk();
  hk.bind('ctrl+k', () => log.push('k'));
  hk.handleEvent(ev({ key: 'k', ctrlKey: true }));
  assert.deepEqual(log, ['k'], 'exact ctrl+k fires');
  const r = hk.handleEvent(ev({ key: 'k', ctrlKey: true, shiftKey: true }));
  assert.equal(r.matched, false, 'an extra modifier means no match (no loose matching)');
  assert.deepEqual(log, ['k']);
});

test('chord: preventDefault default true, suppressible per binding; stopPropagation opt-in', () => {
  const { hk } = mk();
  hk.bind('mod+s', () => {});
  hk.bind('mod+p', () => {}, { preventDefault: false });
  hk.bind('mod+e', () => {}, { stopPropagation: true });

  const a = ev({ key: 's', metaKey: true });
  hk.handleEvent(a);
  assert.equal(a._pd, true, 'mod+s prevents the browser default by default');

  const b = ev({ key: 'p', metaKey: true });
  const rb = hk.handleEvent(b);
  assert.equal(b._pd, false, 'preventDefault:false lets the default through');
  assert.equal(rb.prevented, false);

  const c = ev({ key: 'e', metaKey: true });
  hk.handleEvent(c);
  assert.equal(c._sp, true, 'stopPropagation opt-in');
});

test('chord: multiple key strings → one handler', () => {
  const { hk, log } = mk();
  hk.bind(['mod+s', 'ctrl+s'], () => log.push('save'));
  hk.handleEvent(ev({ key: 's', metaKey: true }));
  hk.handleEvent(ev({ key: 's', ctrlKey: true }));
  assert.deepEqual(log, ['save', 'save'], 'either string fires the same handler');
  assert.equal(hk.getBindings().length, 1, 'still one logical binding');
});

// ============================================================================
// `mod` cross-platform at the engine level
// ============================================================================

test('mod cross-platform: same binding matches metaKey on mac, ctrlKey on win', () => {
  const mac = createHotkeys({ os: 'mac', autoAttach: false });
  const win = createHotkeys({ os: 'windows', autoAttach: false });
  let macFired = 0, winFired = 0;
  mac.bind('mod+s', () => macFired++);
  win.bind('mod+s', () => winFired++);

  mac.handleEvent(ev({ key: 's', metaKey: true }));
  assert.equal(macFired, 1, 'mac: mod = Cmd');
  mac.handleEvent(ev({ key: 's', ctrlKey: true }));
  assert.equal(macFired, 1, 'mac: Ctrl+S does NOT fire mod+s');

  win.handleEvent(ev({ key: 's', ctrlKey: true }));
  assert.equal(winFired, 1, 'win: mod = Ctrl');
  win.handleEvent(ev({ key: 's', metaKey: true }));
  assert.equal(winFired, 1, 'win: Cmd/Meta+S does NOT fire mod+s');
  assert.equal(mac.getState().platform, 'mac');
  assert.equal(win.getState().platform, 'other');
  mac.destroy(); win.destroy();
});

// ============================================================================
// Sequences (the state machine, driven by the fake clock)
// ============================================================================

test('sequence: g g fires on two g in succession (not standalone g)', () => {
  const { hk, log } = mk();
  hk.bind('g g', () => log.push('gg'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'pending after the first g');
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, ['gg']);
  assert.deepEqual(hk.getPendingSequence(), [], 'pending cleared after completion');
});

test('sequence: a partial sequence resets after the timeout (injectable clock)', () => {
  const { hk, log, clock } = mk({ sequenceTimeout: 1000 });
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  clock.advance(999);
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'still pending before the timeout');
  clock.advance(1);
  assert.deepEqual(hk.getPendingSequence(), [], 'partial sequence reset at the timeout');
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, [], 'the late i did not complete the sequence');
});

test('regression: a non-finite sequenceTimeout is finite-guarded, not passed to the timer', () => {
  // NaN/Infinity used to flow straight into clock.setTimeout. With the host clock that
  // coerces to a degenerate delay (NaN→0), resetting a partial sequence on the very next
  // macrotask and making every multi-key sequence un-completable. The guard falls back to
  // the 1000ms default, so the sequence still waits and completes.
  const { hk, log, clock } = mk({ sequenceTimeout: NaN });
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  clock.advance(999);
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'NaN engine timeout fell back to the 1000ms default — still pending');
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, ['gi'], 'the sequence completed within the guarded timeout');
});

test('regression: a non-finite per-binding sequenceTimeout override is ignored', () => {
  // A NaN per-binding override must not poison the resolved timeout via Math.min, and
  // Infinity must not be passed to the timer. Either way the engine default (1000) is used.
  const { hk, log, clock } = mk({ sequenceTimeout: 1000 });
  hk.bind('g i', () => log.push('gi'), { sequenceTimeout: NaN });
  hk.handleEvent(ev({ key: 'g' }));
  clock.advance(999);
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'NaN override ignored — engine default kept the sequence alive');
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, ['gi'], 'sequence completed because the bogus override did not shrink the timeout');
});

test('sequence: a non-continuing key resets the partial sequence', () => {
  const { hk, log } = mk();
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  hk.handleEvent(ev({ key: 'x' })); // not a continuation, and x is unbound
  assert.deepEqual(hk.getPendingSequence(), [], 'reset on the non-continuing key');
  assert.deepEqual(log, []);
  hk.handleEvent(ev({ key: 'g' }));
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, ['gi'], 'a fresh matching key restarts the sequence');
});

test('sequence: g i is distinct from g g', () => {
  const { hk, log } = mk();
  hk.bind('g g', () => log.push('gg'));
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' })); hk.handleEvent(ev({ key: 'i' }));
  hk.handleEvent(ev({ key: 'g' })); hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, ['gi', 'gg']);
});

test('sequence: chords as steps (ctrl+x ctrl+s)', () => {
  const { hk, log } = mk();
  hk.bind('ctrl+x ctrl+s', () => log.push('emacs-save'));
  hk.handleEvent(ev({ key: 'x', ctrlKey: true }));
  assert.deepEqual(hk.getPendingSequence(), ['ctrl+x']);
  hk.handleEvent(ev({ key: 's', ctrlKey: true }));
  assert.deepEqual(log, ['emacs-save']);
});

test('sequence vs standalone prefix: fire the longer if it completes, else the shorter', () => {
  // `g` is bound AND is the prefix of `g g`.
  const { hk, log, clock } = mk({ sequenceTimeout: 1000 });
  hk.bind('g', () => log.push('g'));
  hk.bind('g g', () => log.push('gg'));

  // Two g's in time → the LONGER completes; standalone g does NOT fire.
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, [], 'standalone g held back while g g can still complete');
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, ['gg'], 'longer match wins when it completes in time');
  log.length = 0;

  // One g then the timeout → the SHORTER standalone fires.
  hk.handleEvent(ev({ key: 'g' }));
  clock.advance(1000);
  assert.deepEqual(log, ['g'], 'shorter standalone fires when the longer times out');
  log.length = 0;

  // One g then a non-continuing key → standalone g fires, then the new key is reprocessed.
  hk.bind('x', () => log.push('x'));
  hk.handleEvent(ev({ key: 'g' }));
  hk.handleEvent(ev({ key: 'x' }));
  assert.deepEqual(log, ['g', 'x'], 'interrupt fires the standalone, then the interrupting key');
});

test('regression: interrupt fallback that re-enters and starts a new sequence is preserved', () => {
  // A non-continuing key fires the pending standalone fallback, which is consumer code. If that
  // handler synchronously re-enters and starts a BRAND-NEW sequence, the interrupt path must not
  // wipe it (and clear its just-armed timer) by recursing against the now-non-empty `pending`.
  const { hk, clock, log } = mk();
  hk.bind('a b', () => log.push('ab'));
  hk.bind('g', () => { log.push('g'); hk.handleEvent(ev({ key: 'a' })); }); // fallback starts 'a' seq
  hk.bind('g g', () => log.push('gg'));

  hk.handleEvent(ev({ key: 'g' }));      // pending ['g'], fallback = standalone g
  hk.handleEvent(ev({ key: 'x' }));      // interrupt: fires g, whose handler starts the 'a' sequence
  assert.deepEqual(hk.getPendingSequence(), ['a'], 'the re-entrantly started sequence survives the interrupt');
  assert.equal(clock.pending(), 1, 'its just-armed sequence timer was not cleared');

  hk.handleEvent(ev({ key: 'b' }));      // completes 'a b'
  assert.deepEqual(log, ['g', 'ab'], 'the re-entrant sequence completes instead of being destroyed');
});

test('sequence: a lone modifier keydown between steps does not break it', () => {
  const { hk, log } = mk();
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  hk.handleEvent(ev({ key: 'Shift', shiftKey: true })); // holding shift between the keys
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'pending intact across the lone modifier');
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, ['gi']);
});

test('sequence: per-binding sequenceTimeout override is honored', () => {
  const { hk, log, clock } = mk({ sequenceTimeout: 1000 });
  hk.bind('g i', () => log.push('gi'), { sequenceTimeout: 300 });
  hk.handleEvent(ev({ key: 'g' }));
  clock.advance(300);
  assert.deepEqual(hk.getPendingSequence(), [], 'reset at the per-binding 300ms, not the 1000ms default');
});

test('sequence: getPendingSequence + on("sequence") reflect progress and reset', () => {
  const { hk } = mk();
  const seen = [];
  hk.on('sequence', (p) => seen.push(p.join(' ')));
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  hk.handleEvent(ev({ key: 'i' }));
  assert.ok(seen.includes('g'), 'emitted the in-progress "g"');
  assert.equal(seen[seen.length - 1], '', 'emitted the reset to empty on completion');
});

// ============================================================================
// Scopes / contexts
// ============================================================================

test('scope: bindings fire only in active scopes; global is always active', () => {
  const { hk, log } = mk();
  hk.bind('s', () => log.push('global-s'));
  hk.bind('d', () => log.push('modal-d'), { scope: 'modal' });
  hk.handleEvent(ev({ key: 's' }));
  hk.handleEvent(ev({ key: 'd' }));
  assert.deepEqual(log, ['global-s'], 'modal binding inactive until its scope is active');
  hk.pushScope('modal');
  hk.handleEvent(ev({ key: 'd' }));
  assert.deepEqual(log, ['global-s', 'modal-d']);
});

test('scope: precedence/shadowing — contextual beats global for the same key', () => {
  const { hk, log } = mk();
  hk.bind('escape', () => log.push('global-esc'));
  hk.bind('escape', () => log.push('modal-esc'), { scope: 'modal' });
  hk.handleEvent(ev({ key: 'Escape' }));
  assert.deepEqual(log, ['global-esc']);
  hk.pushScope('modal');
  hk.handleEvent(ev({ key: 'Escape' }));
  assert.deepEqual(log, ['global-esc', 'modal-esc'], 'topmost scope wins and shadows global');
});

test('scope: topmost on the stack wins among multiple contextual scopes', () => {
  const { hk, log } = mk();
  hk.bind('k', () => log.push('a'), { scope: 'a' });
  hk.bind('k', () => log.push('b'), { scope: 'b' });
  hk.pushScope('a');
  hk.pushScope('b');
  hk.handleEvent(ev({ key: 'k' }));
  assert.deepEqual(log, ['b'], 'b is topmost');
  hk.popScope();
  hk.handleEvent(ev({ key: 'k' }));
  assert.deepEqual(log, ['b', 'a'], 'after popping b, a (still active) wins');
});

test('scope: push/pop/set/activate/deactivate + getActiveScopes', () => {
  const { hk } = mk();
  assert.deepEqual(hk.getActiveScopes(), ['global']);
  hk.pushScope('m1'); hk.pushScope('m2');
  assert.deepEqual(hk.getActiveScopes(), ['global', 'm1', 'm2']);
  assert.equal(hk.popScope(), 'm2');
  assert.deepEqual(hk.getActiveScopes(), ['global', 'm1']);
  hk.setScope('only');
  assert.deepEqual(hk.getActiveScopes(), ['global', 'only'], 'setScope replaces the whole stack');
  hk.activateScope('x');
  hk.activateScope('x'); // idempotent
  assert.deepEqual(hk.getActiveScopes(), ['global', 'only', 'x']);
  hk.deactivateScope('only');
  assert.deepEqual(hk.getActiveScopes(), ['global', 'x']);
  hk.setScope(null);
  assert.deepEqual(hk.getActiveScopes(), ['global'], 'setScope(null) clears the contextual stack');
});

test('regression: pushing/activating/setting the global scope name never duplicates it on the stack', () => {
  const { hk } = mk(); // default scope is 'global'
  hk.pushScope('global');
  assert.deepEqual(hk.getActiveScopes(), ['global'], 'pushScope(global) is a no-op on the contextual stack');
  assert.deepEqual(hk.getState().scopes, ['global'], 'emitted scopes still list global exactly once');
  hk.activateScope('global');
  assert.deepEqual(hk.getActiveScopes(), ['global'], 'activateScope(global) is a no-op on the contextual stack');
  hk.pushScope('modal');
  hk.setScope('global');
  assert.deepEqual(hk.getActiveScopes(), ['global'], 'setScope(global) clears the stack and adds no duplicate');
});

test('regression: a custom defaultScope name is likewise never duplicated onto the stack', () => {
  const { hk } = mk({ defaultScope: 'root' });
  hk.pushScope('root');
  hk.activateScope('root');
  hk.setScope('root');
  assert.deepEqual(hk.getActiveScopes(), ['root'], 'the structural default scope appears exactly once');
});

test('scope: changing scope resets an in-progress sequence', () => {
  const { hk } = mk();
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g']);
  hk.pushScope('modal');
  assert.deepEqual(hk.getPendingSequence(), [], 'pending cleared on a scope change');
});

// ============================================================================
// The typing-guard
// ============================================================================

test('guard: bare key suppressed in input/textarea/contentEditable; non-input fires it', () => {
  const { hk, log } = mk();
  hk.bind('j', () => log.push('j'));
  for (const target of [{ tagName: 'INPUT', type: 'text' }, { tagName: 'TEXTAREA' }, { isContentEditable: true }, { tagName: 'SELECT' }]) {
    hk.handleEvent(ev({ key: 'j', target }));
  }
  assert.deepEqual(log, [], 'bare letter suppressed in every typing context');
  hk.handleEvent(ev({ key: 'j', target: { tagName: 'DIV' } }));
  hk.handleEvent(ev({ key: 'j' })); // no target at all
  assert.deepEqual(log, ['j', 'j'], 'fires on non-typing targets');
});

test('guard: modifier-chords still fire while typing; enableInInput forces a bare binding', () => {
  const { hk, log } = mk();
  const input = { tagName: 'INPUT', type: 'text' };
  hk.bind('mod+s', () => log.push('save'));
  hk.bind('ctrl+enter', () => log.push('send'));
  hk.bind('n', () => log.push('n'), { enableInInput: true });
  hk.handleEvent(ev({ key: 's', metaKey: true, target: input }));
  hk.handleEvent(ev({ key: 'Enter', ctrlKey: true, target: input }));
  hk.handleEvent(ev({ key: 'n', target: input }));
  assert.deepEqual(log, ['save', 'send', 'n'], 'chords + enableInInput pass the guard');
});

test('guard: Escape is allowed in inputs by default (allowKeys)', () => {
  const { hk, log } = mk();
  hk.bind('escape', () => log.push('esc'));
  hk.handleEvent(ev({ key: 'Escape', target: { tagName: 'INPUT', type: 'text' } }));
  assert.deepEqual(log, ['esc'], 'a bare Escape still fires in an input');
});

test('guard: non-text input types (checkbox/button) are not typing', () => {
  const { hk, log } = mk();
  hk.bind('j', () => log.push('j'));
  hk.handleEvent(ev({ key: 'j', target: { tagName: 'INPUT', type: 'checkbox' } }));
  hk.handleEvent(ev({ key: 'j', target: { tagName: 'INPUT', type: 'button' } }));
  assert.deepEqual(log, ['j', 'j'], 'bare shortcuts fire when a non-text input is focused');
});

test('guard: custom isTyping predicate overrides the built-in detection', () => {
  const clock = makeClock();
  const log = [];
  const hk = createHotkeys({
    os: 'mac', autoAttach: false, clock,
    inputGuard: { isTyping: (t) => t && t.role === 'editor' },
  });
  hk.bind('j', () => log.push('j'));
  hk.handleEvent(ev({ key: 'j', target: { role: 'editor' } }));
  assert.deepEqual(log, [], 'custom predicate marks it typing → suppressed');
  hk.handleEvent(ev({ key: 'j', target: { tagName: 'TEXTAREA' } }));
  assert.deepEqual(log, ['j'], 'a real textarea is NOT typing under the custom predicate');
});

test('guard: a bare sequence is suppressed while typing', () => {
  const { hk, log } = mk();
  hk.bind('g g', () => log.push('gg'));
  const input = { tagName: 'INPUT', type: 'text' };
  hk.handleEvent(ev({ key: 'g', target: input }));
  hk.handleEvent(ev({ key: 'g', target: input }));
  assert.deepEqual(log, [], 'g g does not fire while typing "g" in an input');
  assert.deepEqual(hk.getPendingSequence(), [], 'and the sequence never started');
});

// ============================================================================
// Conflict resolution
// ============================================================================

test('conflict: same key, same scope → last-registered wins; getConflicts reports it', () => {
  const { hk, log } = mk();
  hk.bind('mod+k', () => log.push('first'));
  hk.bind('mod+k', () => log.push('second'));
  hk.handleEvent(ev({ key: 'k', metaKey: true }));
  assert.deepEqual(log, ['second'], 'the most-recently-registered binding wins');
  const conflicts = hk.getConflicts();
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].keys, 'meta+k');
  assert.equal(conflicts[0].bindings.length, 2);
});

test('conflict: the same key in different scopes is not a conflict (scope precedence resolves it)', () => {
  const { hk } = mk();
  hk.bind('k', () => {}, { scope: 'a' });
  hk.bind('k', () => {}, { scope: 'b' });
  assert.deepEqual(hk.getConflicts(), [], 'different scopes do not conflict');
});

// ============================================================================
// Repeat guard + lone modifier
// ============================================================================

test('repeat: a held key (event.repeat) does not re-fire unless the binding opts in', () => {
  const { hk } = mk();
  let plain = 0, repeated = 0;
  hk.bind('mod+j', () => plain++);
  hk.bind('mod+down', () => repeated++, { repeat: true });

  hk.handleEvent(ev({ key: 'j', metaKey: true, repeat: false }));
  hk.handleEvent(ev({ key: 'j', metaKey: true, repeat: true }));
  hk.handleEvent(ev({ key: 'j', metaKey: true, repeat: true }));
  assert.equal(plain, 1, 'fires once per press, not on auto-repeat');

  hk.handleEvent(ev({ key: 'ArrowDown', metaKey: true, repeat: false }));
  hk.handleEvent(ev({ key: 'ArrowDown', metaKey: true, repeat: true }));
  assert.equal(repeated, 2, 'repeat:true re-fires on auto-repeat');
});

test('repeat: an auto-repeat does not advance a pending sequence', () => {
  const { hk, log } = mk();
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g', repeat: false }));
  hk.handleEvent(ev({ key: 'g', repeat: true })); // key g held → repeat
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'pending unchanged by the repeat');
  hk.handleEvent(ev({ key: 'i' }));
  assert.deepEqual(log, ['gi']);
});

test('lone modifier: pressing only a modifier fires nothing and breaks nothing', () => {
  const { hk, log } = mk();
  hk.bind('mod+s', () => log.push('save'));
  for (const k of ['Meta', 'Shift', 'Control', 'Alt']) {
    const r = hk.handleEvent(ev({ key: k, metaKey: k === 'Meta', shiftKey: k === 'Shift' }));
    assert.equal(r.matched, false, `${k} alone matches nothing`);
  }
  assert.deepEqual(log, []);
});

// ============================================================================
// Enable / disable
// ============================================================================

test('enable/disable: disabled matches nothing; re-enabled resumes; bindings kept', () => {
  const { hk, log } = mk();
  hk.bind('mod+s', () => log.push('save'));
  hk.disable();
  assert.equal(hk.isEnabled(), false);
  const r = hk.handleEvent(ev({ key: 's', metaKey: true }));
  assert.equal(r.matched, false, 'nothing matches while disabled');
  assert.deepEqual(log, []);
  hk.enable();
  hk.handleEvent(ev({ key: 's', metaKey: true }));
  assert.deepEqual(log, ['save'], 'resumes with bindings intact');
});

test('disable clears an in-progress sequence', () => {
  const { hk } = mk();
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  hk.disable();
  assert.deepEqual(hk.getPendingSequence(), []);
});

// ============================================================================
// Unbind / re-bind
// ============================================================================

test('unbind: by handle, by id, and by key string; lookup stays consistent', () => {
  const { hk, log } = mk();
  let changes = 0;
  hk.subscribe(() => changes++);
  const off = hk.bind('mod+s', () => log.push('save'));
  assert.equal(typeof off, 'function');
  assert.equal(typeof off.id, 'string');
  const changesAfterBind = changes;
  off(); // unbind via the returned handle
  assert.equal(hk.getBindings().length, 0, 'handle removed the binding from the store');
  assert.ok(changes > changesAfterBind, 'the handle emitted a change (state stays in sync for re-render)');
  let r = hk.handleEvent(ev({ key: 's', metaKey: true }));
  assert.equal(r.matched, false, 'unbound by handle');

  const id = hk.bind('mod+p', () => log.push('p')).id;
  assert.equal(hk.unbind(id), 1, 'unbind by id');
  assert.equal(hk.handleEvent(ev({ key: 'p', metaKey: true })).matched, false);

  hk.bind('mod+e', () => log.push('e'));
  assert.equal(hk.unbind('mod+e'), 1, 'unbind by key string');
  assert.equal(hk.handleEvent(ev({ key: 'e', metaKey: true })).matched, false);
  assert.deepEqual(log, []);
});

test('re-bind: a new handler on the same key works; explicit id replaces in place', () => {
  const { hk, log } = mk();
  hk.bind('mod+k', () => log.push('v1'), { id: 'palette' });
  hk.bind('mod+k', () => log.push('v2'), { id: 'palette' }); // same id → replace
  hk.handleEvent(ev({ key: 'k', metaKey: true }));
  assert.deepEqual(log, ['v2'], 'the re-bind replaced the handler');
  assert.equal(hk.getBindings().length, 1, 'no duplicate left in the store');
});

test('re-bind in place: replacing a binding scrubs it from a pending sequence fallback', () => {
  // `g` is bound AND is the prefix of `g g`. Press `g` so the standalone `g` becomes the
  // captured fallback for the in-progress sequence, THEN replace `g` in place with a new
  // handler. The clobbered handler must not fire when the sequence later times out.
  const { hk, log, clock } = mk({ sequenceTimeout: 1000 });
  hk.bind('g', () => log.push('OLD-standalone'), { id: 'x' });
  hk.bind('g g', () => log.push('gg'));
  hk.handleEvent(ev({ key: 'g' })); // `g` now pending; OLD-standalone is the fallback
  hk.bind('g', () => log.push('NEW-standalone'), { id: 'x' }); // replace in place
  clock.advance(1000); // let the sequence time out
  assert.deepEqual(log, [], 'the clobbered handler does NOT fire from stale sequence state');
});

test('regression: in-place rebind that clobbers the live prefix clears the stale pending and timer', () => {
  // `g g` is bound under id `x`. Press `g` so `g` is the live prefix of an in-progress
  // sequence (a sequence timer is armed). Re-binding id `x` to an unrelated key deindexes
  // `g g`, so `g` is no longer a prefix of any binding. The emitted pending must not keep
  // reporting that now-dead prefix, and the orphaned sequence timer must be cancelled —
  // exactly as unbind()/unbindAll()/the unbind handle do.
  const { hk, clock, log } = mk({ sequenceTimeout: 1000 });
  hk.bind('g g', () => log.push('gg'), { id: 'x' });
  hk.handleEvent(ev({ key: 'g' })); // pending becomes ['g'], a sequence timer is scheduled
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'g is a live prefix while g g exists');
  assert.equal(clock.pending(), 1, 'a sequence timer is pending');
  hk.bind('z', () => log.push('z'), { id: 'x' }); // replace id x in place, clobbering g g
  assert.deepEqual(hk.getPendingSequence(), [], 'the now-dead prefix is cleared by the rebind');
  assert.equal(clock.pending(), 0, 'the orphaned sequence timer was cancelled by the rebind');
  assert.deepEqual(hk.getState().pending, [], 'the emitted state no longer reports the stale prefix');
});

test('auto id never silently clobbers a consumer-supplied explicit hk<N> id', () => {
  // A consumer that reuses the engine's internal `hk<N>` id format must not be overwritten
  // once the auto counter reaches that value.
  const { hk, log } = mk();
  hk.bind('mod+a', () => log.push('a'), { id: 'hk2' });
  hk.bind('mod+b', () => log.push('b')); // auto id (would be hk1)
  hk.bind('mod+c', () => log.push('c')); // auto id must skip past hk2, not clobber it
  const ids = hk.getBindings().map((b) => b.id).sort();
  assert.equal(hk.getBindings().length, 3, 'all three bindings survive');
  assert.ok(ids.includes('hk2'), 'the explicit hk2 binding is intact');
  hk.handleEvent(ev({ key: 'a', metaKey: true }));
  assert.deepEqual(log, ['a'], 'the explicit hk2 binding still fires');
});

test('regression: an overlong hk<digits> id cannot poison the auto-id counter to Infinity', () => {
  // Number() of a ~309+ digit string overflows to Infinity. If that reached the persistent
  // counter, every later auto id would be `hk${++Infinity}` === 'hkInfinity', colliding and
  // silently clobbering bindings. The counter must ignore the overflow and keep issuing ids.
  const { hk, log } = mk();
  hk.bind('mod+a', () => log.push('a'), { id: 'hk' + '9'.repeat(400) });
  hk.bind('mod+b', () => log.push('b')); // auto id
  hk.bind('mod+c', () => log.push('c')); // auto id — must NOT collide with the previous one
  assert.equal(hk.getBindings().length, 3, 'all three bindings survive (no Infinity-id collision)');
  const autoIds = hk.getBindings().map((b) => b.id).filter((id) => id !== 'hk' + '9'.repeat(400));
  assert.equal(new Set(autoIds).size, autoIds.length, 'auto ids are distinct, not both hkInfinity');
});

test('unbindAll: all, or scoped to one scope', () => {
  const { hk, log } = mk();
  hk.bind('a', () => log.push('a'));
  hk.bind('b', () => log.push('b'), { scope: 'modal' });
  hk.bind('c', () => log.push('c'), { scope: 'modal' });
  assert.equal(hk.unbindAll('modal'), 2, 'removed the two modal bindings');
  assert.equal(hk.getBindings().length, 1, 'global one remains');
  assert.equal(hk.unbindAll(), 1, 'removed the rest');
  assert.equal(hk.getBindings().length, 0);
});

test('sequence index stays consistent after unbinding a sequence', () => {
  const { hk, log } = mk();
  const off = hk.bind('g i', () => log.push('gi'));
  off();
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), [], 'g is no longer a live prefix after unbinding g i');
  assert.deepEqual(log, []);
});

test('regression: unbind() mid-sequence clears the stale live prefix and its timer', () => {
  const { hk, clock, log } = mk();
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' })); // pending becomes ['g'], a sequence timer is scheduled
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'g is a live prefix while g i exists');
  assert.equal(clock.pending(), 1, 'a sequence timer is pending');
  hk.unbind('g i');
  assert.deepEqual(hk.getPendingSequence(), [], 'pending cleared once the only driving binding is removed');
  assert.equal(clock.pending(), 0, 'the orphaned sequence timer was cleared, not left to elapse');
  assert.deepEqual(log, [], 'nothing fired');
});

test('regression: unbind via the handle mid-sequence also clears the stale prefix and timer', () => {
  const { hk, clock } = mk();
  const off = hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g']);
  assert.equal(clock.pending(), 1);
  off();
  assert.deepEqual(hk.getPendingSequence(), [], 'handle removal clears the now-dead prefix');
  assert.equal(clock.pending(), 0, 'handle removal clears the orphaned timer');
});

test('regression: unbindAll mid-sequence clears the stale live prefix and its timer', () => {
  const { hk, clock } = mk();
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g']);
  assert.equal(clock.pending(), 1);
  hk.unbindAll();
  assert.deepEqual(hk.getPendingSequence(), [], 'unbindAll clears the now-dead prefix');
  assert.equal(clock.pending(), 0, 'unbindAll clears the orphaned timer');
});

// ============================================================================
// trigger (programmatic)
// ============================================================================

test('trigger: fires a binding by key string, bypassing the typing-guard', () => {
  const { hk, log } = mk();
  hk.bind('mod+s', () => log.push('save'));
  hk.bind('g i', () => log.push('goto-inbox'));
  assert.equal(hk.trigger('mod+s'), true);
  assert.equal(hk.trigger('g i'), true, 'can trigger a sequence directly');
  assert.equal(hk.trigger('mod+x'), false, 'unbound key → false');
  assert.deepEqual(log, ['save', 'goto-inbox']);
});

test('trigger: respects scope activeness', () => {
  const { hk, log } = mk();
  hk.bind('d', () => log.push('modal-d'), { scope: 'modal' });
  assert.equal(hk.trigger('d'), false, 'inactive scope → not triggered');
  hk.pushScope('modal');
  assert.equal(hk.trigger('d'), true);
  assert.deepEqual(log, ['modal-d']);
});

// ============================================================================
// State / subscription
// ============================================================================

test('getBindings returns key strings + descriptions for a cheatsheet (no handler)', () => {
  const { hk } = mk();
  hk.bind('mod+k', () => {}, { description: 'Open command palette' });
  hk.bind('g i', () => {}, { description: 'Go to inbox', scope: 'app' });
  const all = hk.getBindings();
  assert.equal(all.length, 2);
  const palette = all.find((b) => b.keys[0] === 'mod+k');
  assert.equal(palette.description, 'Open command palette');
  assert.equal(palette.sequence, false);
  assert.equal(palette.handler, undefined, 'handler is never exposed');
  const inbox = all.find((b) => b.keys[0] === 'g i');
  assert.equal(inbox.sequence, true);
  assert.equal(inbox.length, 2);
  assert.deepEqual(hk.getBindings('app').map((b) => b.keys[0]), ['g i'], 'filter by scope');
});

test('regression: publicBinding projection mirrors all stored per-binding flags (stopPropagation, sequenceTimeout)', () => {
  const { hk, log } = mk();
  hk.bind('mod+e', () => {}, { stopPropagation: true, sequenceTimeout: 250 });
  hk.bind('mod+r', () => {}); // defaults: no stopPropagation, no per-binding timeout override
  const all = hk.getBindings();
  const stops = all.find((b) => b.keys[0] === 'mod+e');
  const plain = all.find((b) => b.keys[0] === 'mod+r');
  // getBindings() projection exposes the flags actively honored at fire time.
  assert.equal(stops.stopPropagation, true, 'stopPropagation surfaced in projection');
  assert.equal(stops.sequenceTimeout, 250, 'per-binding sequenceTimeout override surfaced in projection');
  assert.equal(plain.stopPropagation, false, 'default stopPropagation is false (not undefined)');
  assert.equal(plain.sequenceTimeout, null, 'no per-binding override projects as null');

  // The same projection is embedded as ctx.binding on every fire — assert it carries the flags there too.
  let firedBinding = null;
  hk.bind('mod+t', (ctx) => { firedBinding = ctx.binding; log.push('t'); }, { stopPropagation: true, sequenceTimeout: 400 });
  hk.handleEvent(ev({ key: 't', metaKey: true }));
  assert.equal(log[0], 't', 'binding fired');
  assert.equal(firedBinding.stopPropagation, true, 'ctx.binding exposes stopPropagation');
  assert.equal(firedBinding.sequenceTimeout, 400, 'ctx.binding exposes sequenceTimeout');
});

await testAsync('subscribe: deferred initial emit, and fires on registration/scope/enable changes', async () => {
  const { hk } = mk();
  const states = [];
  hk.subscribe((s) => states.push(s));
  await Promise.resolve(); // let the deferred initial emit land
  assert.ok(states.length >= 1, 'received the deferred initial state');
  const n = states.length;
  hk.bind('mod+s', () => {});
  hk.pushScope('modal');
  hk.disable();
  assert.ok(states.length >= n + 3, 'a change per bind/scope/disable');
  const last = states[states.length - 1];
  assert.equal(last.enabled, false);
  assert.deepEqual(last.scopes, ['global', 'modal']);
  assert.equal(last.bindingCount, 1);
});

await testAsync('onChange is NOT called synchronously during construction (no TDZ on the instance)', async () => {
  // A consumer commonly writes `const hk = createHotkeys({ onChange: (s) => render(hk, ...) })`.
  // onChange must not fire before that assignment completes — the first emit is deferred.
  let calledSyncReads = 0;
  let hkRef = null;
  const calls = [];
  // eslint-disable-next-line prefer-const
  hkRef = createHotkeys({
    os: 'mac', autoAttach: false,
    onChange: (s) => { calls.push(s); if (hkRef == null) calledSyncReads++; },
  });
  assert.equal(calledSyncReads, 0, 'onChange did not run before the instance was assigned');
  assert.equal(calls.length, 0, 'no synchronous emit during construction');
  await Promise.resolve();
  assert.equal(calls.length, 1, 'exactly one deferred initial emit');
  hkRef.destroy();
});

test('on("fire") emits a context for each fired binding', () => {
  const { hk } = mk();
  const fires = [];
  hk.on('fire', (ctx) => fires.push(ctx));
  hk.bind('mod+k', () => {}, { description: 'palette' });
  hk.handleEvent(ev({ key: 'k', metaKey: true }));
  assert.equal(fires.length, 1);
  assert.equal(fires[0].keys[0], 'mod+k');
  assert.equal(fires[0].binding.description, 'palette');
});

// ============================================================================
// Multiple instances + lifecycle
// ============================================================================

test('multiple instances do not cross-fire', () => {
  const a = createHotkeys({ os: 'mac', autoAttach: false });
  const b = createHotkeys({ os: 'mac', autoAttach: false });
  let af = 0, bf = 0;
  a.bind('mod+s', () => af++);
  b.bind('mod+s', () => bf++);
  a.handleEvent(ev({ key: 's', metaKey: true }));
  assert.equal(af, 1);
  assert.equal(bf, 0, 'b did not fire from a\'s event');
  a.destroy(); b.destroy();
});

test('destroy mid-sequence clears the timer and leaves no leak; post-destroy is inert', () => {
  const { hk, clock, log } = mk();
  let changes = 0;
  hk.subscribe(() => changes++);
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.equal(clock.pending(), 1, 'a sequence timer is pending');
  const before = changes;
  hk.destroy();
  assert.equal(changes, before, 'destroy emits nothing (no stray change during teardown)');
  assert.equal(clock.pending(), 0, 'destroy cleared the timer');
  clock.advance(100000);
  assert.deepEqual(log, [], 'no late fire');
  // Post-destroy commands are inert no-ops.
  assert.doesNotThrow(() => { hk.bind('a', () => {}); hk.pushScope('x'); hk.handleEvent(ev({ key: 'a' })); });
  assert.deepEqual(hk.getBindings(), []);
});

test('regression: onChange that destroys mid-pending does not leak a freshly-scheduled sequence timer', () => {
  // setPending() synchronously fans out onChange BEFORE processCombo re-arms the sequence
  // timer. A consumer that tears the engine down on a state change must not leave a host
  // timer scheduled past teardown: the timer arm is now guarded on the engine still being live.
  const clock = makeClock();
  let hk;
  hk = createHotkeys({ os: 'mac', autoAttach: false, clock, onChange: (s) => { if (s.pending.length) hk.destroy(); } });
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.equal(clock.pending(), 0, 'destroy() in onChange left no leaked sequence timer');
});

test('regression: onChange that detaches mid-pending does not leak a freshly-scheduled sequence timer', () => {
  const listeners = new Map();
  const target = {
    addEventListener: (t, fn) => { let s = listeners.get(t); if (!s) listeners.set(t, (s = new Set())); s.add(fn); },
    removeEventListener: (t, fn) => { const s = listeners.get(t); if (s) s.delete(fn); },
  };
  const clock = makeClock();
  let hk;
  hk = createHotkeys({ os: 'mac', target, autoAttach: true, clock, onChange: (s) => { if (s.pending.length) hk.detach(); } });
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.equal(clock.pending(), 0, 'detach() in onChange left no leaked sequence timer');
  hk.destroy();
});

test('regression: onChange that disables mid-pending does not leak a freshly-scheduled sequence timer', () => {
  const clock = makeClock();
  let hk;
  hk = createHotkeys({ os: 'mac', autoAttach: false, clock, onChange: (s) => { if (s.pending.length) hk.disable(); } });
  hk.bind('g i', () => {});
  hk.handleEvent(ev({ key: 'g' }));
  assert.equal(clock.pending(), 0, 'disable() in onChange left no leaked sequence timer');
  hk.destroy();
});

// ============================================================================
// Listening lifecycle via a stub EventTarget (the one DOM touch) + blur reset
// ============================================================================

test('attach/detach: one keydown listener drives matching; detach stops it', () => {
  const listeners = new Map();
  const target = {
    addEventListener: (t, fn) => { let s = listeners.get(t); if (!s) listeners.set(t, (s = new Set())); s.add(fn); },
    removeEventListener: (t, fn) => { const s = listeners.get(t); if (s) s.delete(fn); },
    dispatch: (t, e) => { const s = listeners.get(t); if (s) for (const fn of [...s]) fn(e); },
  };
  const log = [];
  const hk = createHotkeys({ os: 'mac', target, autoAttach: true });
  hk.bind('mod+s', () => log.push('save'));
  assert.equal(hk.getState().attached, true, 'auto-attached to the provided target');
  assert.equal(listeners.get('keydown').size, 1, 'exactly one keydown listener, not one per binding');
  hk.bind('mod+p', () => log.push('p'));
  assert.equal(listeners.get('keydown').size, 1, 'still one listener after a second binding');

  target.dispatch('keydown', ev({ key: 's', metaKey: true }));
  assert.deepEqual(log, ['save'], 'a real dispatched keydown matched');

  hk.detach();
  assert.equal(hk.getState().attached, false);
  assert.equal(listeners.get('keydown').size, 0, 'detach removed the listener');
  target.dispatch('keydown', ev({ key: 's', metaKey: true }));
  assert.deepEqual(log, ['save'], 'no fire after detach');
  hk.destroy();
});

test('window blur resets a pending sequence (no stale carry-over)', () => {
  const winListeners = new Set();
  const prevWindow = globalThis.window;
  globalThis.window = {
    addEventListener: (t, fn) => { if (t === 'blur') winListeners.add(fn); },
    removeEventListener: (t, fn) => { winListeners.delete(fn); },
  };
  const target = {
    addEventListener: () => {}, removeEventListener: () => {},
  };
  try {
    const hk = createHotkeys({ os: 'mac', target, autoAttach: true });
    hk.bind('g i', () => {});
    hk.handleEvent(ev({ key: 'g' }));
    assert.deepEqual(hk.getPendingSequence(), ['g']);
    winListeners.forEach((fn) => fn()); // window blur
    assert.deepEqual(hk.getPendingSequence(), [], 'pending reset on blur');
    hk.destroy();
    assert.equal(winListeners.size, 0, 'destroy removed the blur listener');
  } finally {
    if (prevWindow === undefined) delete globalThis.window; else globalThis.window = prevWindow;
  }
});

test('defaultClock exposes now/setTimeout/clearTimeout', () => {
  const c = defaultClock();
  assert.equal(typeof c.now(), 'number');
  const id = c.setTimeout(() => {}, 1000);
  assert.doesNotThrow(() => c.clearTimeout(id));
});

// ---- summary --------------------------------------------------------------

// ---- regressions from the audit/refactor pass ------------------------------

test('regression: an unbound binding cannot fire from stale sequence-fallback state', () => {
  const { clock, hk, log, bindLog } = mk();
  const unbind = bindLog('g', 'standalone');
  bindLog('g g', 'double');
  hk.handleEvent(ev({ key: 'g' })); // consumed as prefix; 'standalone' becomes the fallback
  unbind();                          // remove the standalone while it is the pending fallback
  clock.advance(2000);               // sequence timeout elapses
  assert.deepEqual(log, [], 'removed binding must not fire on timeout');
});

test('regression: held auto-repeats of a repeat-disabled chord keep preventing default', () => {
  const { hk, log, bindLog } = mk();
  bindLog('mod+s', 'save'); // repeat: false (default), preventDefault: true (default)
  const first = ev({ key: 's', metaKey: true });
  hk.handleEvent(first);
  assert.equal(first._pd, true, 'first press prevented');
  assert.deepEqual(log, ['save']);
  const held = ev({ key: 's', metaKey: true, repeat: true });
  const result = hk.handleEvent(held);
  assert.deepEqual(log, ['save'], 'repeat did not re-fire');
  assert.equal(held._pd, true, 'held repeat still prevents the browser default');
  assert.equal(result.prevented, true);
});

test('regression: multi-variant binding collapsing to one combo is not a self-conflict', () => {
  const { hk } = mk({ os: 'windows' }); // mod -> ctrl, so mod+s === ctrl+s
  hk.bind(['mod+s', 'ctrl+s'], () => {});
  assert.deepEqual(hk.getConflicts(), [], 'no phantom self-conflict');
});

test('regression: __proto__/constructor segments are not swallowed as modifiers', () => {
  // 'constructor+a' used to resolve through the prototype chain, be treated as a
  // modifier, and silently bind bare "a". With the own-property guard these are
  // ordinary (unknown) main keys, so two of them is a loud multiple-main-key error.
  assert.throws(() => parseHotkey('constructor+a', { os: 'mac' }), /multiple main keys/);
  assert.throws(() => parseHotkey('__proto__+a', { os: 'mac' }), /multiple main keys/);
  // And alone they are themselves the main key, not a swallowed no-op.
  assert.deepEqual(parseHotkey('constructor', { os: 'mac' }), ['constructor']);
});

test('regression: trigger()/no-event fires report prevented:false, not a fake true', () => {
  const { hk } = mk();
  let context = null;
  hk.bind('mod+k', (firedContext) => { context = firedContext; });
  const result = hk.handleEvent({ key: 'k', metaKey: true }); // event-like with NO preventDefault fn
  assert.equal(result.prevented, false, 'nothing could be prevented on a bare event-like object');
  assert.ok(context, 'handler fired');
});

test('regression: binding data is exposed on the fire context and public binding', () => {
  const { hk } = mk();
  let context = null;
  hk.bind('mod+d', (firedContext) => { context = firedContext; }, { data: { command: 'duplicate' } });
  hk.handleEvent(ev({ key: 'd', metaKey: true }));
  assert.deepEqual(context.data, { command: 'duplicate' });
  assert.deepEqual(hk.getBindings()[0].data, { command: 'duplicate' });
});

test('regression: detach() clears an in-progress sequence so a pending fallback cannot fire afterward', () => {
  const { hk, log } = mk();
  hk.bind('g i', () => log.push('gi'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'pending after the first g');
  hk.detach();
  assert.deepEqual(hk.getPendingSequence(), [], 'detach cleared the pending sequence');
});

test('regression: a guard-suppressed topmost-scope binding still shadows a lower scope (no leak-through)', () => {
  // A modal scope owns `j`; its bare binding is guard-suppressed while typing in an input.
  // The global `j` is enableInInput, so it WOULD pass the guard. The modal must still shadow
  // it: while the modal is up, the key belongs to the modal — fire NOTHING, not the global.
  const { hk, log } = mk();
  hk.pushScope('modal');
  hk.bind('j', () => log.push('modal-j'), { scope: 'modal' });           // bare, guard-suppressed
  hk.bind('j', () => log.push('global-j'), { enableInInput: true });      // would pass the guard
  const r = hk.handleEvent(ev({ key: 'j', target: { tagName: 'INPUT', type: 'text' } }));
  assert.deepEqual(log, [], 'the modal shadows j; the global binding must not leak through');
  assert.equal(r.matched, false, 'nothing fired');
  // Sanity: with the modal popped, the global enableInInput binding fires as before.
  hk.popScope();
  hk.handleEvent(ev({ key: 'j', target: { tagName: 'INPUT', type: 'text' } }));
  assert.deepEqual(log, ['global-j'], 'with the modal gone, the global binding fires');
});

test('regression: a standalone fallback does not fire after onChange destroys the engine on timeout', () => {
  // 'g' is a standalone binding AND the prefix of 'g g'. Pressing g once arms the partial
  // sequence with the standalone as the timeout fallback. When the timeout elapses,
  // handleSequenceTimeout resets pending and notifies; an onChange that destroys here must
  // suppress the captured fallback fire (the timer already nulled itself, so destroy's
  // clearSequenceTimer is a no-op and cannot stop it).
  const clock = makeClock();
  const log = [];
  let armed = false;
  const hk = createHotkeys({
    os: 'mac', autoAttach: false, clock,
    onChange: () => { if (armed) hk.destroy(); }, // destroy the moment the timeout clears pending
  });
  hk.bind('g', () => log.push('g'));
  hk.bind('g g', () => log.push('gg'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'partial sequence armed');
  armed = true;
  clock.advance(2000); // fire the sequence timeout → resets pending → onChange → destroy()
  assert.deepEqual(log, [], 'the standalone fallback must not fire after destroy()');
});

test('regression: an interrupting key does not fire after the interrupted fallback disabled the engine', () => {
  // 'g' standalone (its handler disables the engine) is also the prefix of 'g g'. Press g
  // (arms pending with the g-standalone as fallback), then press x (a dead-end that interrupts):
  // the g-fallback fires and disables the engine. The interrupting x must NOT then fire —
  // disable() keeps the bindings, so without a liveness re-check x would re-match while disabled.
  const { hk, log } = mk();
  hk.bind('g', () => { log.push('g'); hk.disable(); });
  hk.bind('g g', () => log.push('gg'));
  hk.bind('x', () => log.push('x'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'partial sequence armed by g');
  const r = hk.handleEvent(ev({ key: 'x' }));
  assert.deepEqual(log, ['g'], 'only the fallback fired; the interrupting x must not fire while disabled');
  assert.equal(hk.isEnabled(), false, 'engine is disabled');
  assert.deepEqual(r.fired.map((b) => b.keys[0]), ['g'], 'result reports only the fallback');
});

test('regression: a shadowed lower-scope sequence prefix does not swallow/fire over a topmost-scope standalone', () => {
  // global owns the sequence `g g`; a modal scope owns the standalone `g`. While the modal is
  // up it OWNS the key `g` and shadows the global sequence: pressing g twice must fire the
  // modal standalone twice (the global `g g` is shadowed and must never keep the key alive).
  const { hk, log, clock } = mk();
  hk.bind('g g', () => log.push('global-gg'));
  hk.bind('g', () => log.push('modal-g'), { scope: 'modal' });
  hk.pushScope('modal');
  const r1 = hk.handleEvent(ev({ key: 'g' }));
  // The modal owns `g`; the shadowed global prefix must not keep the sequence alive — fire now.
  assert.deepEqual(log, ['modal-g'], 'lone g fires the modal standalone immediately (no shadowed-prefix delay)');
  assert.deepEqual(hk.getPendingSequence(), [], 'no partial sequence armed by the shadowed prefix');
  assert.equal(clock.pending(), 0, 'no sequence timer armed by the shadowed prefix');
  assert.deepEqual(r1.fired.map((b) => b.keys[0]), ['g'], 'result reports the modal standalone');
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, ['modal-g', 'modal-g'], 'two g fire the modal standalone twice, never the shadowed global g g');
});

test('regression: a topmost-scope sequence prefix shadows a lower-scope standalone on timeout (no leak-through)', () => {
  // global owns the standalone `g`; a modal scope owns the sequence `g g`. While the modal is up
  // it OWNS the key `g` (via its prefix) and shadows the global standalone: a lone g that times
  // out must fire NOTHING — the shadowed global `g` must not leak through.
  const { hk, log } = mk();
  hk.bind('g', () => log.push('global-g'));
  hk.bind('g g', () => log.push('modal-gg'), { scope: 'modal' });
  hk.pushScope('modal');
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'the modal prefix arms the partial sequence');
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(log, ['modal-gg'], 'g g completes the modal sequence');
  // And a lone g that times out fires nothing (the global g is shadowed by the modal owner).
  const second = mk();
  second.hk.bind('g', () => second.log.push('global-g'));
  second.hk.bind('g g', () => second.log.push('modal-gg'), { scope: 'modal' });
  second.hk.pushScope('modal');
  second.hk.handleEvent(ev({ key: 'g' }));
  second.clock.advance(2000);
  assert.deepEqual(second.log, [], 'lone-g timeout fires nothing; the shadowed global g must not leak through');
});

test('regression: a standalone fallback does not fire after onChange detaches the engine on timeout', () => {
  // 'g' is a standalone AND the prefix of 'g g'. Pressing g arms the partial sequence with the
  // standalone as the timeout fallback. When the timeout clears pending and notifies, an onChange
  // that detaches must suppress the captured fallback fire (detach()'s resetPending can't reach
  // the already-captured local fallback — only the detach-epoch re-check can).
  const clock = makeClock();
  const log = [];
  let armed = false;
  const hk = createHotkeys({
    os: 'mac', autoAttach: false, clock,
    onChange: () => { if (armed) hk.detach(); },
  });
  hk.bind('g', () => log.push('g'));
  hk.bind('g g', () => log.push('gg'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'partial sequence armed');
  armed = true;
  clock.advance(2000); // timeout → resets pending → onChange → detach()
  assert.deepEqual(log, [], 'the standalone fallback must not fire after detach()');
});

test('regression: an interrupting key does not fire after the interrupted fallback detached the engine', () => {
  // 'g' standalone (its handler detaches) is also the prefix of 'g g'. Press g (arms pending with
  // the g-standalone as fallback), then press x (a dead-end that interrupts): the g-fallback fires
  // and detaches the engine. The interrupting x must NOT then fire — detach() leaves enabled/
  // destroyed untouched, so without the detach-epoch re-check x would re-match after detach.
  const { hk, log } = mk();
  hk.bind('g', () => { log.push('g'); hk.detach(); });
  hk.bind('g g', () => log.push('gg'));
  hk.bind('x', () => log.push('x'));
  hk.handleEvent(ev({ key: 'g' }));
  assert.deepEqual(hk.getPendingSequence(), ['g'], 'partial sequence armed by g');
  const r = hk.handleEvent(ev({ key: 'x' }));
  assert.deepEqual(log, ['g'], 'only the fallback fired; the interrupting x must not fire after detach');
  assert.deepEqual(r.fired.map((b) => b.keys[0]), ['g'], 'result reports only the fallback');
});

if (isMain(import.meta.url)) report({ exit: true });
