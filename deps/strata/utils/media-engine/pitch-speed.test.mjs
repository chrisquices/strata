// pitch-speed.test.mjs
// Pure unit tests for the WSOLA core, the resampler, the offline pitch shifter,
// and the streaming engine. We verify the two guarantees that matter:
//   - time-stretch changes LENGTH but preserves PITCH
//   - pitch-shift changes PITCH but preserves LENGTH
// measured via output length and zero-crossing rate (∝ frequency) on a sine.
//   node media-engine/pitch-speed.test.mjs

import { test, testAsync, assert, isMain, report } from './harness.mjs';
import {
  semitonesToRatio,
  hann,
  wsolaStretch,
  resampleLinear,
  pitchShift,
  createStretchEngine,
  createPitchSpeed,
} from './media-engine.js';

// A sine with integer period P samples (frequency 1/P cycles/sample).
function sine(P, n) {
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = Math.sin((2 * Math.PI * i) / P);
  return x;
}
// Zero-crossing rate ≈ 2·frequency; a direct, robust pitch proxy for a sine.
function zcr(x) {
  let c = 0;
  for (let i = 1; i < x.length; i++) if (x[i - 1] < 0 !== x[i] < 0) c++;
  return c / x.length;
}
const ratioOf = (a, b) => a / b;

// ============================================================================
// Helpers
// ============================================================================

test('semitonesToRatio: octaves and unison', () => {
  assert.ok(Math.abs(semitonesToRatio(12) - 2) < 1e-9);
  assert.ok(Math.abs(semitonesToRatio(0) - 1) < 1e-9);
  assert.ok(Math.abs(semitonesToRatio(-12) - 0.5) < 1e-9);
});

test('hann: zero at ends, peak in the middle, COLA at 50% hop', () => {
  const N = 8;
  const w = hann(N);
  assert.ok(Math.abs(w[0]) < 1e-9, 'w[0] = 0');
  assert.ok(w[N / 2] > 0.99, 'peak ~1 mid');
  // Hann at 50% overlap sums to 1 (constant-overlap-add). Tolerance is Float32
  // epsilon (~6e-8) because the window is stored as a Float32Array, as audio is.
  for (let i = 0; i < N / 2; i++) {
    assert.ok(Math.abs(w[i] + w[i + N / 2] - 1) < 1e-6, `COLA at ${i}`);
  }
});

// ============================================================================
// resampleLinear
// ============================================================================

test('resampleLinear: ratio 2 doubles length; ratio 0.5 halves', () => {
  const x = new Float32Array([0, 1, 2, 3]);
  assert.equal(resampleLinear(x, 2).length, 8);
  assert.equal(resampleLinear(x, 0.5).length, 2);
});

test('resampleLinear: linear interpolation midpoints (ratio 2)', () => {
  const y = resampleLinear(new Float32Array([0, 10]), 2); // positions 0, .5, 1, 1.5
  assert.ok(Math.abs(y[0] - 0) < 1e-6);
  assert.ok(Math.abs(y[1] - 5) < 1e-6, 'midpoint interpolated');
});

// ============================================================================
// wsolaStretch — length changes, pitch preserved
// ============================================================================

test('wsolaStretch: ×2 ≈ doubles length and preserves pitch (zcr)', () => {
  const x = sine(20, 8192);
  const y = wsolaStretch(x, 2);
  // Lower bound is loose: WSOLA can't place a final frame past the input edge,
  // so the last ~(frame+search) of output is unproduced — output is "≈ ×2".
  assert.ok(y.length > x.length * 1.7 && y.length < x.length * 2.2, `len ${y.length}`);
  assert.ok(Math.abs(ratioOf(zcr(y), zcr(x)) - 1) < 0.1, `pitch drift zcr ${zcr(y)} vs ${zcr(x)}`);
});

test('wsolaStretch: ×0.5 ≈ halves length and preserves pitch', () => {
  const x = sine(20, 8192);
  const y = wsolaStretch(x, 0.5);
  assert.ok(y.length > x.length * 0.4 && y.length < x.length * 0.6, `len ${y.length}`);
  assert.ok(Math.abs(ratioOf(zcr(y), zcr(x)) - 1) < 0.12, `pitch drift`);
});

test('wsolaStretch: input shorter than a frame passes through', () => {
  const x = sine(8, 100);
  const y = wsolaStretch(x, 2, { frameSize: 1024 });
  assert.equal(y.length, x.length);
});

// ============================================================================
// pitchShift — pitch changes, length preserved
// ============================================================================

test('pitchShift: octave up ≈ same length, ~double frequency', () => {
  const x = sine(20, 8192);
  const y = pitchShift(x, 2);
  assert.ok(Math.abs(y.length - x.length) < 1100, `len ${y.length} vs ${x.length}`);
  const r = ratioOf(zcr(y), zcr(x));
  assert.ok(r > 1.8 && r < 2.2, `frequency ratio ${r} (want ~2)`);
});

test('pitchShift: octave down ≈ same length, ~half frequency', () => {
  const x = sine(20, 8192);
  const y = pitchShift(x, 0.5);
  const r = ratioOf(zcr(y), zcr(x));
  assert.ok(r > 0.4 && r < 0.6, `frequency ratio ${r} (want ~0.5)`);
});

test('pitchShift: ratio 1 is an exact passthrough', () => {
  const x = sine(20, 256);
  const y = pitchShift(x, 1);
  assert.equal(y.length, x.length);
  for (let i = 0; i < x.length; i++) assert.equal(y[i], x[i]);
});

// ============================================================================
// createStretchEngine — streaming
// ============================================================================

function runEngine(engine, input, quantum = 128) {
  // Push everything, then pull until drained (1:1 average rate).
  engine.push(input);
  const out = [];
  const buf = new Float32Array(quantum);
  let starvedRuns = 0;
  for (let iter = 0; iter < 2000 && starvedRuns < 4; iter++) {
    const got = engine.pull(buf, quantum);
    for (let i = 0; i < got; i++) out.push(buf[i]);
    starvedRuns = got < quantum ? starvedRuns + 1 : 0;
  }
  return Float32Array.from(out);
}

test('engine: ratio 1 is a transparent passthrough', () => {
  const eng = createStretchEngine();
  const x = sine(20, 1024);
  const y = runEngine(eng, x);
  assert.equal(y.length, x.length);
  for (let i = 0; i < x.length; i++) assert.equal(y[i], x[i]);
});

test('engine: octave-up streams ~1:1 length and shifts pitch ~2×', () => {
  const eng = createStretchEngine();
  eng.setPitchRatio(2);
  const x = sine(24, 16384);
  const y = runEngine(eng, x);
  // Net tempo 1 → output length within a frame or two of the input.
  assert.ok(y.length > x.length * 0.85 && y.length <= x.length + 2048, `len ${y.length} vs ${x.length}`);
  assert.ok(y.some((v) => Math.abs(v) > 0.1), 'output is not silence');
  // Measure pitch on the steady-state middle (skip startup latency).
  const mid = y.subarray(2048, y.length - 512);
  const r = ratioOf(zcr(mid), zcr(x));
  assert.ok(r > 1.7 && r < 2.3, `frequency ratio ${r} (want ~2)`);
});

test('engine: reset clears state for reuse', () => {
  const eng = createStretchEngine();
  eng.setPitchRatio(2);
  runEngine(eng, sine(24, 4096));
  eng.reset();
  const y = runEngine(eng, sine(24, 4096));
  assert.ok(y.length > 0, 'produces output again after reset');
});

// ============================================================================
// Non-finite ratio guards (audit regressions)
// ============================================================================

test('wsolaStretch/resampleLinear: non-finite ratio → passthrough (no empty array, no RangeError)', () => {
  const x = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7]);
  assert.equal(wsolaStretch(x, NaN, { frameSize: 4 }).length, x.length, 'NaN ratio → input length, not 0');
  assert.equal(resampleLinear(x, NaN).length, x.length, 'NaN ratio → passthrough copy, not empty');
  assert.equal(resampleLinear(x, Infinity).length, x.length, 'Infinity ratio → passthrough, not RangeError');
});

test('wsolaStretch: huge finite ratio is output-length-capped (no unbounded allocation)', () => {
  // A large finite ratio passes the finite/positive guard, so without the
  // outputLength cap it would size a Float32Array of input.length * ratio floats
  // (here ~3.2e10) → RangeError / memory-exhaustion DoS. The cap bounds output to
  // MAX_STRETCH(=4)× the input, mirroring the streaming engine's [0.25, 4] clamp.
  const x = sine(20, 8192);
  const y = wsolaStretch(x, 4e6);
  assert.ok(y.length <= x.length * 4 + 1024, `capped len ${y.length} (must be ≤ ~4× input)`);
  assert.ok(y.length > 0, 'still produces output, not empty');
});

test('pitchShift: huge finite ratio does not attempt an unbounded allocation', () => {
  // pitchShift forwards its ratio straight into wsolaStretch; the cap there must
  // protect this public entry point too (must not throw RangeError or hang).
  const x = sine(20, 8192);
  const y = pitchShift(x, 4e6);
  assert.ok(y instanceof Float32Array, 'returns a Float32Array, no RangeError');
  // pitchShift resamples the stretched buffer by 1/ratio, so a huge ratio yields
  // a tiny (here ~0-length) result — the point is it stays bounded and never
  // attempts the input.length*ratio allocation that would crash before resampling.
  assert.ok(y.length <= x.length, `bounded len ${y.length}`);
});

test('resampleLinear: huge finite ratio is output-length-capped (no unbounded allocation)', () => {
  // A large finite ratio passes resampleLinear's finite/positive guard, so without
  // the outputLength cap it would size a Float32Array of input.length * ratio floats
  // (here ~3.3e10) → RangeError / memory-exhaustion DoS. The cap bounds output to
  // MAX_STRETCH(=4)× the input, mirroring wsolaStretch.
  const x = sine(20, 8192);
  const y = resampleLinear(x, 4e6);
  assert.ok(y instanceof Float32Array, 'returns a Float32Array, no RangeError');
  assert.ok(y.length <= x.length * 4, `capped len ${y.length} (must be ≤ 4× input)`);
});

test('pitchShift: tiny ratio cannot drive resampleLinear into an unbounded allocation', () => {
  // pitchShift(buf, tiny) = resampleLinear(wsolaStretch(buf, tiny), 1/tiny). The
  // wsolaStretch shortens to ~1 frame, but 1/tiny is a huge resample factor — without
  // the resampleLinear cap this sizes ~frame*1e7 floats and crashes. Must stay bounded.
  const x = sine(20, 8192);
  const y = pitchShift(x, 1e-7);
  assert.ok(y instanceof Float32Array, 'returns a Float32Array, no RangeError');
  // The intermediate wsolaStretch output (~a frame) is capped to MAX_STRETCH× by
  // resampleLinear, so the result stays small and bounded rather than exploding.
  assert.ok(y.length <= x.length * 4, `bounded len ${y.length}`);
});

test('createStretchEngine.setPitchRatio(NaN/Infinity) keeps the prior ratio', () => {
  const eng = createStretchEngine();
  eng.setPitchRatio(2);
  eng.setPitchRatio(NaN);
  assert.equal(eng.getPitchRatio(), 2, 'NaN ignored — ratio not poisoned (clamp would keep NaN)');
  eng.setPitchRatio(Infinity);
  assert.equal(eng.getPitchRatio(), 2, 'Infinity ignored too');
});

test('createStretchEngine: non-finite size options fall back to defaults (no RangeError on allocation)', () => {
  // The `|| default` idiom rejects NaN (falsy) but NOT +Infinity (truthy), which
  // would reach `new Float32Array(Infinity)` (hann(N)/accum/Ring) → RangeError.
  // Each must fall back to the default size and stay constructible + functional.
  for (const opts of [
    { frameSize: Infinity },
    { capacity: Infinity },
    { searchWindow: Infinity },
    { frameSize: NaN, capacity: NaN, searchWindow: NaN },
    { frameSize: -1, capacity: -1 },
  ]) {
    const eng = createStretchEngine(opts);
    // Default frameSize=1024 → latency 1024; confirms the size fell back, not exploded.
    assert.equal(eng.latencySamples(), 1024, `latency for ${JSON.stringify(opts)}`);
    // Still runs end to end (passthrough at ratio 1).
    const y = runEngine(eng, sine(20, 1024));
    assert.equal(y.length, 1024, `passthrough length for ${JSON.stringify(opts)}`);
  }
});

test('wsolaStretch: non-finite frameSize/searchWindow fall back to defaults (no RangeError)', () => {
  // Same +Infinity-survives-`||` hazard as the engine: Infinity frameSize would
  // reach `new Float32Array(Infinity)` for the window/output. Must fall back.
  const x = sine(20, 4096);
  const yFrame = wsolaStretch(x, 1.5, { frameSize: Infinity });
  assert.ok(yFrame instanceof Float32Array && yFrame.length > 0, 'Infinity frameSize → bounded output, no RangeError');
  const ySearch = wsolaStretch(x, 1.5, { searchWindow: Infinity });
  assert.ok(ySearch instanceof Float32Array && ySearch.length > 0, 'Infinity searchWindow → bounded output, no RangeError');
  // NaN frameSize was already falsy-rejected by `||`, but pin it stays at default 1024.
  const yNaN = wsolaStretch(x, 1.5, { frameSize: NaN });
  assert.ok(yNaN instanceof Float32Array && yNaN.length > 0, 'NaN frameSize → default 1024, bounded output');
});

test('createStretchEngine.pull: non-finite requestedCount does not hang (DoS guard)', () => {
  // requestedCount flows into two zero-pad loops. Because out-of-bounds typed-
  // array writes are silently discarded, `while (i < Infinity) out[i++] = 0`
  // never terminates — a hard CPU hang. The guard must clamp it to out.length.
  const out = new Float32Array(128);

  // Passthrough branch (ratio === 1, the default).
  const eng = createStretchEngine();
  eng.push(sine(20, 256)); // some real input to copy first
  const got = eng.pull(out, Infinity); // must return, not hang
  assert.ok(Number.isFinite(got), 'pull(out, Infinity) returns a finite count in passthrough');
  assert.ok(got <= out.length, 'produced count is bounded by out.length');

  // Pitch-shift branch (ratio !== 1): the other zero-pad loop.
  const eng2 = createStretchEngine();
  eng2.setPitchRatio(2);
  for (let k = 0; k < 16; k++) eng2.push(sine(20, 256));
  const got2 = eng2.pull(out, Infinity); // must return, not hang
  assert.ok(Number.isFinite(got2), 'pull(out, Infinity) returns a finite count in pitch branch');
  assert.ok(got2 <= out.length, 'produced count is bounded by out.length');

  // NaN is benign (every `i < NaN` is false) but must still terminate cleanly.
  assert.equal(createStretchEngine().pull(out, NaN), 0, 'NaN count → 0 produced, no hang');
});

test('createStretchEngine.push: non-finite explicit length does not loop unboundedly (DoS guard)', () => {
  // push(samples, length) forwards length into Ring.write's `for (i<length)` loop.
  // Overruns drop the oldest sample, so a non-finite length never terminates.
  const eng = createStretchEngine();
  assert.doesNotThrow(() => eng.push(sine(20, 64), Infinity), 'push(.., Infinity) returns, does not hang');
  // The engine is still usable afterward (passthrough copies whatever landed).
  const out = new Float32Array(8);
  const got = eng.pull(out, 8);
  assert.ok(Number.isFinite(got) && got <= 8, 'engine still works after a guarded push');
});

test('createStretchEngine.push: a finite length > samples.length writes no NaN and is bounded', () => {
  // push(samples, length) forwards length into Ring.write's `for (i<length)` loop,
  // reading samples[i]. A finite length BEYOND the array end (which the finite-
  // guard cannot catch) reads `undefined` → stored as NaN in the Float32Array,
  // permanently poisoning the ring; and a HUGE finite length would drive the
  // write loop a huge-but-finite number of times. The cap to samples.length
  // prevents both: only real samples are written, and the loop is bounded.
  const eng = createStretchEngine();
  const x = sine(20, 128);
  // Ask to write far more than exist (and a huge count to prove boundedness).
  eng.push(x, 5000);
  eng.push(x, 1e10); // must return promptly, not spin ~1e10 iterations
  // Passthrough (ratio 1) drains exactly what was really written — and none of
  // it is NaN. Without the cap the ring would be full of NaN from the overruns.
  const out = new Float32Array(256);
  const got = eng.pull(out, 256);
  assert.ok(got > 0, 'real samples were written and pulled back');
  for (let i = 0; i < got; i++) {
    assert.ok(Number.isFinite(out[i]), `sample ${i} is finite (no NaN poisoning), got ${out[i]}`);
  }
});

// ============================================================================
// createPitchSpeed — bypass routing state machine (audit regressions)
// ============================================================================

// A minimal Web Audio graph fake that records edges so a test can read which
// route is live (source->dest direct passthrough, or source->node->dest).
function makeFakeGraph({ addModuleDeferred = false } = {}) {
  const edges = new Set(); // "from->to" tags
  function tag(from, to) {
    return `${from.label}->${to.label}`;
  }
  function makeNode(label) {
    const n = {
      label,
      connect(to) {
        edges.add(tag(this, to));
      },
      disconnect(to) {
        if (to) edges.delete(tag(this, to));
        else for (const e of [...edges]) if (e.startsWith(label + '->')) edges.delete(e);
      },
      port: { postMessage() {} },
    };
    return n;
  }
  const dest = makeNode('dest');
  let sourceNode = null;
  let resolveAddModule = null;
  const ctx = {
    destination: dest,
    audioWorklet: {
      addModule() {
        if (!addModuleDeferred) return Promise.resolve();
        return new Promise((res) => {
          resolveAddModule = res;
        });
      },
    },
    createMediaElementSource() {
      sourceNode = makeNode('source');
      return sourceNode;
    },
    close() {},
  };
  return {
    ctx,
    dest,
    edges,
    get source() {
      return sourceNode;
    },
    finishAddModule() {
      resolveAddModule && resolveAddModule();
    },
    hasEdge(from, to) {
      return edges.has(`${from}->${to}`);
    },
  };
}

const mediaElementStub = () => ({ playbackRate: 1, preservesPitch: true });

await testAsync('createPitchSpeed.setBypass(false) as the first call does not silence the element', async () => {
  // setBypass(false) on a fresh graph must NOT capture the element via
  // createMediaElementSource() only to wire it nowhere — that mutes playback
  // (the element no longer plays on its own once captured). It should be a no-op
  // so the element keeps playing natively.
  const g = makeFakeGraph();
  globalThis.AudioWorkletNode = class {
    constructor() {
      this.label = 'node';
      this.port = { postMessage() {} };
    }
    connect() {}
    disconnect() {}
  };
  try {
    const graph = await createPitchSpeed({ mediaElement: mediaElementStub(), audioContext: g.ctx, workletUrl: 'stub://w' });
    graph.setBypass(false);
    // Either the element was never captured (preferred), or — if captured — it
    // must reach output. The bug captured it and connected nothing → silence.
    assert.ok(g.source === null || g.hasEdge('source', 'dest'), 'fresh setBypass(false) did not strand the element off the graph');
  } finally {
    delete globalThis.AudioWorkletNode;
  }
});

await testAsync('createPitchSpeed: setBypass(true) during the addModule await is honored, not reverted', async () => {
  // setPitch(nonzero) awaits addModule() inside ensureWorklet(). A setBypass(true)
  // issued in that window establishes a direct source->dest route; when addModule
  // resolves, ensureWorklet() must NOT force audio back through the pitch node and
  // silently undo the latest bypass intent.
  const g = makeFakeGraph({ addModuleDeferred: true });
  globalThis.AudioWorkletNode = class {
    constructor() {
      this.label = 'node';
      this.port = { postMessage() {} };
    }
    connect(to) {
      g.edges.add(`node->${to.label}`);
    }
    disconnect(to) {
      if (to) g.edges.delete(`node->${to.label}`);
    }
  };
  try {
    const graph = await createPitchSpeed({ mediaElement: mediaElementStub(), audioContext: g.ctx, workletUrl: 'stub://w' });
    // setPitch() runs synchronously up to `await addModule()`, which is the
    // deferred (still-pending) promise — so the worklet build is in flight.
    const pending = graph.setPitch(3);
    graph.setBypass(true); // direct bypass requested mid-await
    assert.ok(g.hasEdge('source', 'dest'), 'bypass established source->dest while addModule pending');
    g.finishAddModule(); // ensureWorklet() resumes (microtask) and builds the node
    await pending;
    // The latest intent (bypass on) must win: audio stays direct, NOT forced
    // through the node.
    assert.ok(g.hasEdge('source', 'dest'), 'bypass preserved after addModule resolved');
    assert.ok(!g.hasEdge('source', 'node'), 'audio was NOT re-routed through the pitch node');
  } finally {
    delete globalThis.AudioWorkletNode;
  }
});

if (isMain(import.meta.url)) report({ exit: true });
