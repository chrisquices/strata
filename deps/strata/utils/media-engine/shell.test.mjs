// shell.test.mjs
// Integration tests for the shell's orchestration, run against a MINIMAL hand-
// rolled DOM stub (no jsdom — zero deps) and a FAKE renderer that records the
// contract calls. This pins the riskiest wiring the pure tests can't reach:
// preload-window management, activate/deactivate, keyboard delegation +
// fallback, INTENT routing, wrap/clamp, and teardown — without a real browser.
//   node media-engine/shell.test.mjs

import { test, testAsync, assert, isMain, report } from './harness.mjs';

// ---- tiny DOM stub (installed as globals before importing the shell) --------
const listeners = {};
function makeEl() {
  const el = {
    style: {},
    attributes: {},
    children: [],
    parentNode: null,
    offsetWidth: 0,
    offsetHeight: 0,
    appendChild(c) {
      if (c.parentNode) c.parentNode.removeChild(c);
      c.parentNode = el;
      el.children.push(c);
      return c;
    },
    removeChild(c) {
      const i = el.children.indexOf(c);
      if (i >= 0) el.children.splice(i, 1);
      c.parentNode = null;
      return c;
    },
    setAttribute(k, v) {
      el.attributes[k] = v;
    },
    hasAttribute(k) {
      return k in el.attributes;
    },
    focus() {
      stubDoc.activeElement = el;
    },
    contains(n) {
      return n === el || el.children.includes(n);
    },
    querySelectorAll() {
      return [];
    },
    getClientRects() {
      return [];
    },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 600 };
    },
    addEventListener() {},
    removeEventListener() {},
  };
  return el;
}
const stubDoc = {
  body: { style: {} },
  activeElement: null,
  fullscreenEnabled: true,
  fullscreenElement: null,
  addEventListener(type, fn) {
    (listeners[type] ||= []).push(fn);
  },
  removeEventListener(type, fn) {
    const a = listeners[type];
    if (a) {
      const i = a.indexOf(fn);
      if (i >= 0) a.splice(i, 1);
    }
  },
  exitFullscreen() {
    stubDoc.fullscreenElement = null;
    return Promise.resolve();
  },
};
function fireKey(key, extra = {}) {
  const e = { key, shiftKey: false, preventDefault() { e._p = true; }, ...extra };
  for (const fn of [...(listeners.keydown || [])]) fn(e);
  return !!e._p;
}
globalThis.document = stubDoc;

const tick = () => Promise.resolve();

const {
  MediaViewer,
  createRendererRegistry,
  defineRenderer,
  RendererEvent,
  Intent,
  Emitter,
  Lifecycle,
  RepeatMode,
  createAudioRenderer,
  createVideoRenderer,
} = await import('./media-engine.js');

// A fake renderer that records contract calls and can emit events on demand.
function fakeRegistry(log) {
  const make = (item, deps) => {
    const em = new Emitter();
    return defineRenderer({
      type: item.type,
      mount: () => log.push(`mount:${deps.index}`),
      activate: () => log.push(`activate:${deps.index}`),
      deactivate: () => log.push(`deactivate:${deps.index}`),
      unmount: () => log.push(`unmount:${deps.index}`),
      play: () => log.push(`play:${deps.index}`),
      handleKey: (e) => {
        log.push(`key:${deps.index}:${e.key}`);
        return e.key === 'CONSUME';
      },
      getCapabilities: () => ({ type: item.type, zoom: null, playback: null, tracks: null, castable: false, fullscreen: true, download: true }),
      getState: () => ({ index: deps.index }),
      on: (t, fn) => em.on(t, fn),
      _emit: (t, p) => em.emit(t, p),
    });
  };
  const reg = createRendererRegistry();
  reg.register('image', make).register('video', make).register('audio', make);
  return reg;
}

function makeViewer(extra = {}) {
  const log = [];
  const container = makeEl();
  const items = extra.items || [
    { type: 'image', src: '0' },
    { type: 'image', src: '1' },
    { type: 'image', src: '2' },
    { type: 'image', src: '3' },
  ];
  const v = new MediaViewer({
    items,
    createElement: () => makeEl(),
    registry: fakeRegistry(log),
    container,
    stage: container,
    ...extra,
  });
  return { v, log, container, items };
}

// ============================================================================
// Lifecycle + preload window
// ============================================================================

await testAsync('open(index): OPENING → OPEN; preload window ±1 mounts neighbors, activates current', async () => {
  const { v, log } = makeViewer();
  v.open(1);
  assert.equal(v.getState().lifecycle, Lifecycle.OPENING, 'OPENING synchronously');
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.OPEN, 'settles to OPEN');
  assert.equal(v.slots.size, 3, 'slots for 0,1,2');
  assert.ok(log.includes('mount:0') && log.includes('mount:1') && log.includes('mount:2'));
  assert.ok(log.includes('activate:1'), 'current activated');
  assert.ok(!log.includes('activate:0') && !log.includes('activate:2'), 'neighbors not activated');
  assert.equal(v.getState().currentIndex, 1);
});

await testAsync('navigate next: shifts window — unmounts the one that left, mounts the new one', async () => {
  const { v, log } = makeViewer();
  v.open(1);
  await tick();
  log.length = 0;
  v.next();
  assert.equal(v.getState().currentIndex, 2);
  assert.deepEqual([...v.slots.keys()].sort(), [1, 2, 3]);
  assert.ok(log.includes('unmount:0'), 'slot 0 left the window → unmounted');
  assert.ok(log.includes('mount:3'), 'slot 3 entered → mounted');
  assert.ok(log.includes('deactivate:1'), 'old current deactivated (state retained)');
  assert.ok(log.includes('activate:2'), 'new current activated');
});

// ============================================================================
// Keyboard delegation + fallback
// ============================================================================

await testAsync('handleKey delegation: renderer consumes → no navigation; declines → shell fallback', async () => {
  const { v } = makeViewer();
  v.open(1);
  await tick();
  // Renderer consumes 'CONSUME' → shell must NOT navigate.
  fireKey('CONSUME');
  assert.equal(v.getState().currentIndex, 1, 'consumed key did not navigate');
  // Renderer declines 'ArrowRight' (fake returns false) → shell fallback next().
  fireKey('ArrowRight');
  assert.equal(v.getState().currentIndex, 2, 'declined arrow → shell navigated next');
  fireKey('ArrowLeft');
  assert.equal(v.getState().currentIndex, 1, 'declined arrow → shell navigated prev');
});

await testAsync('Escape closes (when enabled); fallback respects closeOnEscape:false', async () => {
  const a = makeViewer();
  a.v.open(0);
  await tick();
  fireKey('Escape');
  await tick();
  await tick();
  assert.equal(a.v.getState().lifecycle, Lifecycle.CLOSED, 'Escape closed');

  const b = makeViewer({ closeOnEscape: false });
  b.v.open(0);
  await tick();
  fireKey('Escape');
  await tick();
  assert.notEqual(b.v.getState().lifecycle, Lifecycle.CLOSED, 'Escape ignored when disabled');
  b.v.destroy();
});

// ============================================================================
// INTENT routing (renderer → shell)
// ============================================================================

await testAsync('INTENT navigate / dismiss from the active renderer drive the shell', async () => {
  const { v } = makeViewer();
  v.open(1);
  await tick();
  v.getRenderer()._emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, direction: 'next' });
  assert.equal(v.getState().currentIndex, 2, 'INTENT navigate next');
  v.getRenderer()._emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, index: 0, autoplay: true });
  assert.equal(v.getState().currentIndex, 0, 'INTENT navigate to index');
  v.getRenderer()._emit(RendererEvent.INTENT, { type: Intent.DISMISS });
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED, 'INTENT dismiss closed');
});

await testAsync('autoplay intent calls play() on the newly-activated renderer', async () => {
  const { v, log } = makeViewer();
  v.open(1);
  await tick();
  log.length = 0;
  v.getRenderer()._emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, index: 3, autoplay: true });
  assert.equal(v.getState().currentIndex, 3);
  assert.ok(log.includes('play:3'), 'play() called on arrival');
});

// ============================================================================
// wrap / clamp / single item
// ============================================================================

await testAsync('clamp (default): next at the last item is a no-op', async () => {
  const { v } = makeViewer();
  v.open(3);
  await tick();
  v.next();
  assert.equal(v.getState().currentIndex, 3, 'clamped at the end');
});

await testAsync('wrap: next at the last item wraps to the first', async () => {
  const { v } = makeViewer({ wrap: true });
  v.open(3);
  await tick();
  v.next();
  assert.equal(v.getState().currentIndex, 0, 'wrapped to 0');
  v.prev();
  assert.equal(v.getState().currentIndex, 3, 'wrapped back to last');
});

await testAsync('wrap: forward/backward wrap report the navigation intent, not the inverted index comparison', async () => {
  const { v } = makeViewer({ wrap: true });
  v.open(3);
  await tick();
  const dirs = [];
  v.on('transition', (e) => dirs.push(e.direction));

  // next() at the last item wraps 3 → 0. Index comparison (0 > 3) would say -1;
  // a forward navigation must report +1 to drive the consumer's slide forward.
  v.next();
  assert.equal(v.getState().currentIndex, 0, 'wrapped forward to 0');
  assert.equal(dirs.at(-1), 1, 'forward wrap reports +1 (next), not the inverted -1');
  assert.equal(v.getState().direction, 1, 'getState().direction matches the intent');

  // prev() at index 0 wraps 0 → 3. Index comparison (3 > 0) would say +1;
  // a backward navigation must report -1.
  v.prev();
  assert.equal(v.getState().currentIndex, 3, 'wrapped backward to 3');
  assert.equal(dirs.at(-1), -1, 'backward wrap reports -1 (prev), not the inverted +1');
  assert.equal(v.getState().direction, -1);

  // Non-wrap forward/back still report correctly (no regression).
  v.goTo(1);
  assert.equal(dirs.at(-1), -1, 'goTo backward (3 → 1) without explicit direction reports -1');
  v.goTo(2);
  assert.equal(dirs.at(-1), 1, 'goTo forward (1 → 2) without explicit direction reports +1');
});

await testAsync('single-item gallery: navigation no-ops; one slot', async () => {
  const { v } = makeViewer({ items: [{ type: 'image', src: 'only' }] });
  v.open(0);
  await tick();
  assert.equal(v.slots.size, 1);
  assert.equal(v.hasNext(), false);
  assert.equal(v.hasPrev(), false);
  v.next();
  v.prev();
  assert.equal(v.getState().currentIndex, 0);
});

await testAsync('preload radius 2 mounts ±2 neighbors', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ type: 'image', src: String(i) }));
  const { v } = makeViewer({ items, preload: 2 });
  v.open(2);
  await tick();
  assert.deepEqual([...v.slots.keys()].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
});

// ============================================================================
// Teardown + rapid open/close (cancellation)
// ============================================================================

await testAsync('close tears down all slots and removes the key listener', async () => {
  const { v, log } = makeViewer();
  v.open(1);
  await tick();
  const before = (listeners.keydown || []).length;
  log.length = 0;
  v.close();
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED);
  assert.equal(v.slots.size, 0, 'all slots destroyed');
  assert.ok(log.includes('unmount:0') && log.includes('unmount:1') && log.includes('unmount:2'));
  assert.equal((listeners.keydown || []).length, before - 1, 'keydown listener removed');
});

await testAsync('destroy() is inert: open()/goTo()/setTheater() cannot resurrect a torn-down viewer', async () => {
  const { v, log } = makeViewer();
  v.open(1);
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.OPEN);

  v.destroy();
  const keydownAfterDestroy = (listeners.keydown || []).length;
  assert.equal(v.slots.size, 0, 'destroy unmounted every slot');
  log.length = 0;

  // open() after destroy() must NOT re-add the document keydown listener, re-mount
  // renderers, or flip the lifecycle off CLOSED. Before the _destroyed guard, open()
  // ran the full open path (re-add keydown capture, _reconcile → _createSlot/mount,
  // _lockScroll) on the dead instance.
  v.open(0);
  await tick();
  await tick();
  assert.equal((listeners.keydown || []).length, keydownAfterDestroy, 'open() after destroy did not re-add keydown listener');
  assert.equal(v.slots.size, 0, 'open() after destroy mounted no slots');
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED, 'lifecycle stays CLOSED');
  assert.deepEqual(log, [], 'no renderer contract calls after destroy');

  // The other public entry points are inert too (no throw, no state change).
  v.goTo(2);
  v.next();
  v.prev();
  v.setTheater(true);
  v.requestFullscreen();
  v.toggleFullscreen();
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED, 'still CLOSED after nav/fullscreen/theater calls');
  assert.equal(v.theater, false, 'setTheater() did not mutate a destroyed instance');
  assert.equal(v.slots.size, 0, 'still no slots');

  // destroy() is itself idempotent.
  assert.doesNotThrow(() => v.destroy(), 'destroy() is safe to call twice');
});

await testAsync('close during opening cannot resurrect OPEN (generation guard)', async () => {
  const { v } = makeViewer({ transitionMs: 0 });
  v.open(1); // schedules OPENING→OPEN settle (microtask)
  v.close(); // immediately close → invalidates the pending open settle
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED, 'never settled to OPEN');
  assert.equal(v.slots.size, 0);
});

await testAsync('reopen during the CLOSING phase does not leak the scroll lock or lose the invoker (audit regression)', async () => {
  // close() sets CLOSING and DEFERS _teardown() (which unlocks scroll + restores
  // focus). Reopening before that teardown runs re-enters the open path. Before the
  // idempotency fix, _lockScroll() re-captured _prevOverflow (already 'hidden' from
  // the first lock), losing the page's original overflow → permanently unscrollable
  // after close; and _captureFocus() overwrote _invoker, losing the trigger element.
  stubDoc.body.style.overflow = 'auto'; // the page's original overflow
  const invoker = makeEl();
  invoker.focus(); // becomes document.activeElement → the trigger

  const { v } = makeViewer({ transitionMs: 0 });
  v.open(0);
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.OPEN);
  assert.equal(stubDoc.body.style.overflow, 'hidden', 'scroll locked while open');

  v.close(); // CLOSING; _teardown() deferred to a microtask (transitionMs 0)
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSING, 'CLOSING, teardown not yet run');
  // Reopen synchronously, while still CLOSING and before the deferred teardown.
  v.open(0);
  assert.equal(stubDoc.body.style.overflow, 'hidden', 'still locked after reopen');
  await tick();
  await tick();

  // Now close for real and let teardown run.
  v.close();
  await tick();
  await tick();
  assert.equal(v.getState().lifecycle, Lifecycle.CLOSED);
  assert.equal(stubDoc.body.style.overflow, 'auto', 'original overflow restored — not stuck on hidden');

  v.destroy();
  delete stubDoc.body.style.overflow;
  stubDoc.activeElement = null;
});

await testAsync('destroy() on a never-opened viewer does not clobber the page body.overflow (audit regression)', async () => {
  // _lockScroll() is guarded by _scrollLocked and only captures the page's
  // overflow when it actually locks. If a viewer is constructed and destroyed
  // WITHOUT ever opening, no lock was taken — _unlockScroll() must be a no-op,
  // not blindly write _prevOverflow ('') over whatever the host page legitimately
  // set (e.g. another modal's 'hidden').
  stubDoc.body.style.overflow = 'hidden'; // host page's own state (a different modal)
  const { v } = makeViewer({ transitionMs: 0 });
  // Never open(): no _lockScroll() ran.
  v.destroy();
  assert.equal(stubDoc.body.style.overflow, 'hidden', 'unlock is a no-op when no lock was taken');
  delete stubDoc.body.style.overflow;
});

// ============================================================================
// Non-finite index / preload guards (audit regressions)
// ============================================================================

await testAsync('open(NaN): non-finite index falls back to 0 (not a blank viewer)', async () => {
  const { v } = makeViewer();
  v.open(NaN);
  await tick();
  await tick();
  assert.equal(v.getState().currentIndex, 0, 'NaN index → 0, never NaN');
  assert.ok(v.getRenderer(), 'an active renderer exists — the stage is not blank');
  assert.ok(v.slots.size >= 1);
});

await testAsync('goTo(NaN) is a no-op — keeps the current item and window', async () => {
  const { v } = makeViewer();
  v.open(1);
  await tick();
  const slotsBefore = v.slots.size;
  v.goTo(NaN);
  assert.equal(v.getState().currentIndex, 1, 'NaN goTo ignored (no garbage direction / blank stage)');
  assert.equal(v.slots.size, slotsBefore, 'preload window intact');
  assert.ok(v.getRenderer(), 'still has an active renderer');
});

await testAsync('preload: Infinity/NaN fall back to the default (the window loop terminates)', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ type: 'image', src: String(i) }));
  const { v } = makeViewer({ items, preload: Infinity });
  v.open(2); // would hang on an unbounded loop if Infinity reached the loop bound
  await tick();
  assert.equal(v.slots.size, 3, 'non-finite preload → default radius 1 (slots 1,2,3), no infinite loop');
});

await testAsync('preload: a huge finite value clamps to the gallery (no unbounded allocation)', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ type: 'image', src: String(i) }));
  const { v } = makeViewer({ items, preload: 1e7 });
  v.open(2);
  await tick();
  assert.equal(v.slots.size, 5, 'clamped to all 5 items — not millions of slots');
});

await testAsync('preload: a negative value clamps to 0 (current slot only, not blank)', async () => {
  const items = Array.from({ length: 5 }, (_, i) => ({ type: 'image', src: String(i) }));
  const { v } = makeViewer({ items, preload: -3 });
  v.open(2);
  await tick();
  assert.deepEqual([...v.slots.keys()], [2], 'only the current slot survives');
  assert.ok(v.getRenderer(), 'current renderer still active');
});

// ============================================================================
// Audio renderer: setPitch() teardown-during-await must not leak the AudioContext
// ============================================================================

await testAsync('audio setPitch(): unmount() during the createPitchSpeed await closes the AudioContext (no leak)', async () => {
  // Minimal media-element stub: the audio mount path only touches these.
  const audioEl = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    addEventListener() {},
    removeEventListener() {},
    pause() {},
  };
  // Count live AudioContexts and record close() calls — the leak is "context
  // created but never closed". A real browser caps these at ~6.
  let live = 0;
  let closed = 0;
  class FakeAudioContext {
    constructor() {
      live++;
      this.destination = {};
      this.audioWorklet = { addModule: async () => {} };
    }
    createMediaElementSource() {
      return { connect() {}, disconnect() {} };
    }
    close() {
      closed++;
      live--;
      return Promise.resolve();
    }
  }
  const prevWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  globalThis.AudioWorkletNode = class { constructor() { this.port = { postMessage() {} }; } };
  try {
    const r = createAudioRenderer(
      { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] }, // peaks short-circuits loadWaveform
      { index: 0, options: { workletUrl: 'stub://worklet' } }, // workletUrl skips Blob URL creation
    );
    r.mount({ type: 'audio', src: 'a.mp3' }, audioEl);

    // Engage pitch — setPitch awaits createPitchSpeed(), which yields a microtask
    // (the window where the renderer's `pitchSpeed` field is still null).
    const pending = r.setPitch(3);
    assert.equal(live, 1, 'createPitchSpeed allocated one AudioContext');

    // Shell tears the slot down mid-await: unmount runs `if (pitchSpeed) destroy()`
    // while pitchSpeed is still null — a no-op without the post-await re-check.
    r.unmount();

    await pending; // createPitchSpeed resolves AFTER teardown
    await tick();

    assert.equal(closed, 1, 'the orphaned AudioContext was closed, not leaked');
    assert.equal(live, 0, 'no live AudioContext remains after unmount');
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    delete globalThis.AudioWorkletNode;
  }
});

// ============================================================================
// Audio renderer: overlapping setPitch() calls must not leak the first AudioContext
// ============================================================================

await testAsync('audio setPitch(): two concurrent calls build one graph and close the redundant context (no leak)', async () => {
  // Minimal media-element stub: the audio mount path only touches these.
  const audioEl = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    addEventListener() {},
    removeEventListener() {},
    pause() {},
  };
  // Count live AudioContexts and record close() calls. The leak is "a second
  // context created by a racing setPitch() but never closed".
  let live = 0;
  let closed = 0;
  class FakeAudioContext {
    constructor() {
      live++;
      this.destination = {};
      // addModule resolves on a later microtask so both setPitch() calls have
      // already constructed their own context (and passed the `!pitchSpeed`
      // guard) before either await settles — the race window.
      this.audioWorklet = { addModule: async () => {} };
    }
    createMediaElementSource() {
      return { connect() {}, disconnect() {} };
    }
    close() {
      closed++;
      live--;
      return Promise.resolve();
    }
  }
  const prevWindow = globalThis.window;
  globalThis.window = { AudioContext: FakeAudioContext };
  // The surviving graph proceeds into ensureWorklet(), which builds and wires
  // an AudioWorkletNode — so the stub needs connect()/disconnect() too.
  globalThis.AudioWorkletNode = class { constructor() { this.port = { postMessage() {} }; } connect() {} disconnect() {} };
  try {
    const r = createAudioRenderer(
      { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] }, // peaks short-circuits loadWaveform
      { index: 0, options: { workletUrl: 'stub://worklet' } }, // workletUrl skips Blob URL creation
    );
    r.mount({ type: 'audio', src: 'a.mp3' }, audioEl);

    // A pitch slider firing twice before the first build resolves: both calls
    // pass `!pitchSpeed` (still null) and BOTH call createPitchSpeed(), each
    // allocating its own AudioContext.
    const p1 = r.setPitch(3);
    const p2 = r.setPitch(5);
    assert.equal(live, 2, 'both racing setPitch() calls allocated an AudioContext');

    await Promise.all([p1, p2]);
    await tick();
    await tick();

    // Exactly one graph survives; the loser's context must be closed, not orphaned.
    assert.equal(closed, 1, 'the redundant AudioContext was closed, not leaked');
    assert.equal(live, 1, 'exactly one live AudioContext remains (the adopted graph)');
    assert.equal(r.getPitch(), 5, 'the last requested pitch is reflected');
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    delete globalThis.AudioWorkletNode;
  }
});

// ============================================================================
// Shell setTheater(): non-finite dimLevel must not poison persistent/emitted state
// ============================================================================

await testAsync('setTheater(true, NaN/Infinity): non-finite dimLevel falls back to the default (not stored/emitted)', async () => {
  const { v } = makeViewer();
  v.open(0);
  await tick();

  const emitted = [];
  v.on('theater', (e) => emitted.push(e.dimLevel));

  // A consumer slider div-by-zero / JSON.parse('1e999') config yields a non-finite
  // dim level. Without the finite-guard it would be stored and emitted verbatim,
  // silently disabling the consumer's CSS dim and surviving toggleTheater().
  v.setTheater(true, NaN);
  assert.ok(Number.isFinite(v.getState().dimLevel), 'NaN dimLevel did not poison getState()');
  assert.equal(v.getState().dimLevel, 0.85, 'NaN → on-default (0.85)');
  assert.equal(emitted.at(-1), 0.85, "the 'theater' event carried the guarded value, not NaN");

  v.setTheater(true, Infinity);
  assert.equal(v.getState().dimLevel, 0.85, 'Infinity → on-default (0.85), not Infinity');

  // Out-of-[0,1] finite values are range-clamped (a dim opacity is [0,1]).
  v.setTheater(true, 5);
  assert.equal(v.getState().dimLevel, 1, '5 clamps to 1');
  v.setTheater(true, -2);
  assert.equal(v.getState().dimLevel, 0, '-2 clamps to 0');

  // A valid explicit value still flows through unchanged (no regression).
  v.setTheater(true, 0.4);
  assert.equal(v.getState().dimLevel, 0.4, 'a valid dimLevel is preserved');
});

// ============================================================================
// Audio renderer: unmount() during setPitch()'s SECOND await (worklet addModule)
// must not build/connect a node on the now-closed AudioContext
// ============================================================================

await testAsync('audio setPitch(): unmount() during the worklet addModule() await does not touch the closed context', async () => {
  const audioEl = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    addEventListener() {},
    removeEventListener() {},
    pause() {},
  };
  let live = 0;
  let closed = 0;
  let nodesAttemptedOnClosedCtx = 0;
  // A controllable addModule promise: it stays PENDING until we release it, so
  // we can land unmount() AFTER the graph is adopted (pitchSpeed set) but BEFORE
  // ensureWorklet()'s addModule() resolves — the second-await window.
  let releaseAddModule;
  const addModuleGate = new Promise((res) => {
    releaseAddModule = res;
  });
  class FakeAudioContext {
    constructor() {
      live++;
      this.closedFlag = false;
      this.destination = {};
      this.audioWorklet = { addModule: () => addModuleGate };
    }
    createMediaElementSource() {
      return { connect() {}, disconnect() {} };
    }
    close() {
      closed++;
      live--;
      this.closedFlag = true;
      return Promise.resolve();
    }
  }
  // Constructing an AudioWorkletNode on a closed context throws InvalidStateError
  // in the browser — assert it is NEVER attempted after close().
  let lastCtx = null;
  const prevWindow = globalThis.window;
  globalThis.window = {
    AudioContext: class extends FakeAudioContext {
      constructor() {
        super();
        lastCtx = this;
      }
    },
  };
  globalThis.AudioWorkletNode = class {
    constructor(ctx) {
      if (ctx && ctx.closedFlag) nodesAttemptedOnClosedCtx++;
      this.port = { postMessage() {} };
    }
    connect() {}
    disconnect() {}
  };
  try {
    const r = createAudioRenderer(
      { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] },
      { index: 0, options: { workletUrl: 'stub://worklet' } },
    );
    r.mount({ type: 'audio', src: 'a.mp3' }, audioEl);

    // setPitch(3) → createPitchSpeed() resolves (factory addModule isn't called
    // there), the graph is ADOPTED, then ensureWorklet() awaits addModule().
    const pending = r.setPitch(3);
    await tick(); // let createPitchSpeed() resolve and the graph be adopted
    await tick();
    assert.equal(live, 1, 'one AudioContext was allocated and adopted');

    // unmount() lands while addModule() is still pending → destroy() closes ctx.
    r.unmount();
    assert.equal(closed, 1, 'unmount closed the AudioContext');
    assert.equal(lastCtx.closedFlag, true, 'the adopted context is closed');

    // Now the worklet module finishes loading: ensureWorklet() resumes. With the
    // `destroyed` guard it returns before `new AudioWorkletNode(closedCtx)`.
    releaseAddModule();
    await pending; // must not reject (fire-and-forget caller)
    await tick();
    await tick();

    assert.equal(nodesAttemptedOnClosedCtx, 0, 'no AudioWorkletNode built on the closed context');
    assert.equal(live, 0, 'no live AudioContext leaked');
  } finally {
    if (prevWindow === undefined) delete globalThis.window;
    else globalThis.window = prevWindow;
    delete globalThis.AudioWorkletNode;
  }
});

// ============================================================================
// Audio renderer: loadWaveform() must not write freed state after unmount()
// (the decode fetch/decode can outlive the renderer; re-check teardown post-await)
// ============================================================================

await testAsync('audio loadWaveform(): a decode resolving after unmount() does not write waveformReady or emit', async () => {
  const audioEl = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    addEventListener() {},
    removeEventListener() {},
    pause() {},
  };

  // A controllable fetch: stays PENDING until released, so we can land unmount()
  // while loadWaveform() is awaiting decodePeaks' fetch — the post-teardown window.
  let releaseFetch;
  const fetchGate = new Promise((res) => {
    releaseFetch = res;
  });
  const prevFetch = globalThis.fetch;
  const prevAudioContext = globalThis.AudioContext;
  globalThis.fetch = () =>
    fetchGate.then(() => ({
      headers: { get: () => null }, // no content-length → falls through to byteLength cap
      arrayBuffer: async () => new ArrayBuffer(8),
    }));
  globalThis.AudioContext = class {
    decodeAudioData() {
      return Promise.resolve({
        numberOfChannels: 1,
        duration: 1,
        sampleRate: 8000,
        getChannelData() {
          return new Float32Array([0.5, -0.5, 0.25, -0.25]);
        },
      });
    }
    close() {
      return Promise.resolve();
    }
  };
  try {
    // No `peaks` on the item → loadWaveform() takes the decodePeaks() fetch path.
    const r = createAudioRenderer({ type: 'audio', src: 'https://x/a.mp3' }, { index: 0 });
    let waveformEvents = 0;
    r.on(RendererEvent.WAVEFORM, () => waveformEvents++);

    r.mount({ type: 'audio', src: 'https://x/a.mp3' }, audioEl); // kicks off loadWaveform(), awaiting fetch
    assert.equal(r.getState().waveformReady, false, 'waveform not ready while the decode is still pending');

    r.unmount(); // tears the renderer down mid-decode (element = null, emitter cleared)

    releaseFetch(); // fetch + decode now resolve AFTER unmount()
    // Drain the WHOLE post-unmount microtask chain (fetch → headers → arrayBuffer →
    // decodeAudioData → peaksFromBuffer → loadWaveform's post-await write). A fixed
    // 3 ticks is one turn too few and would observe `false` by timing accident even
    // without the guard; draining to quiescence is what actually exercises the guard.
    for (let i = 0; i < 12; i++) await tick();

    // Without the post-await `if (!element) return`, loadWaveform would set
    // waveformReady = true and call emit() on the torn-down renderer.
    assert.equal(r.getState().waveformReady, false, 'late decode did not write waveformReady on a torn-down renderer');
    assert.equal(waveformEvents, 0, 'no WAVEFORM event emitted after unmount');
  } finally {
    if (prevFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = prevFetch;
    if (prevAudioContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = prevAudioContext;
  }
});

// ============================================================================
// Audio renderer: load state recovers to LOADED after a `waiting`→`canplay`
// rebuffer (parity with the video sibling)
// ============================================================================

await testAsync('audio renderer: canplay after waiting recovers load to LOADED (no perpetual buffering)', async () => {
  // An element stub that records listeners and lets the test dispatch events.
  const handlers = {};
  const audioEl = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    paused: true,
    error: null,
    addEventListener(type, fn) {
      (handlers[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      const a = handlers[type];
      if (a) {
        const i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      }
    },
    pause() {},
    play() {
      return Promise.resolve();
    },
  };
  const fire = (type) => {
    for (const fn of [...(handlers[type] || [])]) fn({ type });
  };

  const r = createAudioRenderer(
    { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] },
    { index: 0, options: {} },
  );
  r.mount({ type: 'audio', src: 'a.mp3' }, audioEl);

  // Metadata loaded → LOADED.
  fire('loadedmetadata');
  assert.equal(r.getState().load, 'loaded', 'loadedmetadata → LOADED');

  // Network stall → waiting drops load to LOADING (buffering spinner).
  fire('waiting');
  assert.equal(r.getState().load, 'loading', 'waiting → LOADING');

  // Buffer recovers → canplay must return load to LOADED (was the bug: stuck LOADING).
  let lastLoadEvent = null;
  r.on(RendererEvent.LOAD, (e) => {
    lastLoadEvent = e.state;
  });
  fire('canplay');
  assert.equal(r.getState().load, 'loaded', 'canplay after waiting recovers to LOADED');
  assert.equal(lastLoadEvent, 'loaded', 'a LOAD event announced the recovery to LOADED');

  r.unmount();
});

// ============================================================================
// Video renderer: a `waiting`→`canplay` rebuffer recovery emits a fresh PLAYBACK
// snapshot, mirroring the audio sibling's onCanPlay (audit: divergent handling)
// ============================================================================

await testAsync('video renderer: canplay after waiting emits a PLAYBACK refresh (parity with audio)', async () => {
  const handlers = {};
  const videoEl = {
    playsInline: false,
    preservesPitch: true,
    playbackRate: 1,
    readyState: 0,
    paused: true,
    error: null,
    currentTime: 0,
    setAttribute() {},
    addEventListener(type, fn) {
      (handlers[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      const a = handlers[type];
      if (a) {
        const i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      }
    },
    pause() {},
    play() {
      return Promise.resolve();
    },
  };
  const fire = (type) => {
    for (const fn of [...(handlers[type] || [])]) fn({ type });
  };

  const r = createVideoRenderer({ type: 'video', src: 'v.mp4' }, { index: 0, options: {} });
  r.mount({ type: 'video', src: 'v.mp4' }, videoEl);

  // Metadata loaded → LOADED.
  fire('loadedmetadata');
  assert.equal(r.getState().load, 'loaded', 'loadedmetadata → LOADED');

  // Network stall → waiting drops load to LOADING.
  fire('waiting');
  assert.equal(r.getState().load, 'loading', 'waiting → LOADING');

  // Now count PLAYBACK events emitted ONLY by the recovery, and verify load recovers.
  let playbackEvents = 0;
  let lastLoadEvent = null;
  r.on(RendererEvent.PLAYBACK, () => playbackEvents++);
  r.on(RendererEvent.LOAD, (e) => {
    lastLoadEvent = e.state;
  });
  fire('canplay');

  assert.equal(r.getState().load, 'loaded', 'canplay after waiting recovers to LOADED');
  assert.equal(lastLoadEvent, 'loaded', 'a LOAD event announced the recovery to LOADED');
  // The fix: onCanPlay now emits a PLAYBACK refresh on recovery, mirroring audio.
  assert.equal(playbackEvents, 1, 'canplay recovery emits a fresh PLAYBACK snapshot');

  r.unmount();
});

// ============================================================================
// Audio renderer: a single-track queue under RepeatMode.ALL must LOOP at end-of-
// track. The advance wraps to the same gallery index that is already current, so
// emitting NAVIGATE there is a shell no-op (goTo dedupes) — the renderer must
// restart the element locally instead of letting the track silently stop.
// ============================================================================

function makeMediaElStub() {
  const handlers = {};
  const el = {
    preservesPitch: true,
    playbackRate: 1,
    readyState: 1,
    paused: false,
    ended: false,
    error: null,
    currentTime: 7,
    playCount: 0,
    duration: 10,
    volume: 1,
    muted: false,
    loop: false,
    seeking: false,
    buffered: { length: 0, start() { return 0; }, end() { return 0; } },
    addEventListener(type, fn) {
      (handlers[type] ||= []).push(fn);
    },
    removeEventListener(type, fn) {
      const a = handlers[type];
      if (a) {
        const i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      }
    },
    pause() {},
    play() {
      el.playCount++;
      el.paused = false;
      el.ended = false;
      return Promise.resolve();
    },
  };
  const fire = (type) => {
    for (const fn of [...(handlers[type] || [])]) fn({ type });
  };
  return { el, fire };
}

await testAsync('audio repeat-all, single track: end-of-track restarts locally (does NOT stop / dedupe to no-op)', async () => {
  const { el, fire } = makeMediaElStub();
  const r = createAudioRenderer(
    { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] },
    { index: 4, options: { repeat: RepeatMode.ALL } }, // gallery index 4, lone audio item
  );
  r.mount({ type: 'audio', src: 'a.mp3' }, el);

  let navigated = 0;
  let navIndex = null;
  r.on(RendererEvent.INTENT, (intent) => {
    if (intent.type === Intent.NAVIGATE) {
      navigated++;
      navIndex = intent.index;
    }
  });

  el.currentTime = 8; // mid-track; the restart must rewind to 0
  el.ended = true;
  el.paused = true;
  const playsBefore = el.playCount;
  fire('ended');

  // Without the fix: handleEnded emits NAVIGATE to gallery index 4 (the current
  // index), the shell dedupes it, and the track just stops.
  assert.equal(navigated, 0, 'no NAVIGATE emitted for a same-index wrap (the shell would dedupe it)');
  assert.equal(el.currentTime, 0, 'the track rewound to 0 to loop');
  assert.equal(el.playCount, playsBefore + 1, 'the element was restarted (play() called)');
  void navIndex;

  r.unmount();
});

await testAsync('audio repeat-all, single track: next() restarts the lone track locally instead of a deduped NAVIGATE', async () => {
  const { el, fire } = makeMediaElStub();
  void fire;
  const r = createAudioRenderer(
    { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] },
    { index: 2, options: { repeat: RepeatMode.ALL } },
  );
  r.mount({ type: 'audio', src: 'a.mp3' }, el);

  let navigated = 0;
  r.on(RendererEvent.INTENT, (intent) => {
    if (intent.type === Intent.NAVIGATE) navigated++;
  });

  el.currentTime = 5;
  const playsBefore = el.playCount;
  r.next(); // queue.next() wraps to {index:0} → same gallery index 2

  assert.equal(navigated, 0, 'next() on a single-track repeat-all queue does not emit a deduped NAVIGATE');
  assert.equal(el.currentTime, 0, 'next() rewound the lone track to 0');
  assert.equal(el.playCount, playsBefore + 1, 'next() restarted the element');

  r.unmount();
});

await testAsync('audio repeat-all, multi-track: end-of-track still emits NAVIGATE to the NEXT gallery index (regression guard)', async () => {
  const { el, fire } = makeMediaElStub();
  const playlist = [
    { item: { type: 'audio', src: 'a.mp3' }, index: 0 },
    { item: { type: 'audio', src: 'b.mp3' }, index: 1 },
  ];
  const r = createAudioRenderer(
    { type: 'audio', src: 'a.mp3', peaks: [0.1, 0.2] },
    { index: 0, playlist, playlistIndex: 0, options: { repeat: RepeatMode.ALL } },
  );
  r.mount({ type: 'audio', src: 'a.mp3' }, el);

  let navIndex = null;
  let navigated = 0;
  r.on(RendererEvent.INTENT, (intent) => {
    if (intent.type === Intent.NAVIGATE) {
      navigated++;
      navIndex = intent.index;
    }
  });

  const playsBefore = el.playCount;
  fire('ended'); // index 0 → advance to playlist[1], gallery index 1 (a DIFFERENT renderer)

  assert.equal(navigated, 1, 'a real advance to a different track still emits NAVIGATE');
  assert.equal(navIndex, 1, 'NAVIGATE targets the next gallery index');
  assert.equal(el.playCount, playsBefore, 'no local restart for a cross-track advance');

  r.unmount();
});

if (isMain(import.meta.url)) report({ exit: true });
