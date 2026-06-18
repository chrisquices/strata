// waveform.test.mjs
// Pure unit tests for peak extraction (the math behind the consumer's waveform).
//   node media-engine/waveform.test.mjs

import { test, testAsync, assert, isMain, report } from './harness.mjs';
import { extractPeaks, extractMinMax, mixToMono, peaksFromBuffer, decodePeaks } from './media-engine.js';

test('extractPeaks: max |sample| per bucket', () => {
  const samples = [0, 0.5, -1, 0.25, 0.1, -0.2];
  // 2 buckets, size 3: [0,0.5,-1] → 1 ; [0.25,0.1,-0.2] → 0.25
  assert.deepEqual(extractPeaks(samples, 2), [1, 0.25]);
});

test('extractPeaks: bucket count clamps to sample count', () => {
  const samples = [0.2, -0.4, 0.6];
  const peaks = extractPeaks(samples, 100);
  assert.equal(peaks.length, 3, 'cannot have more buckets than samples');
  assert.deepEqual(peaks, [0.2, 0.4, 0.6]);
});

test('extractPeaks: empty input → []', () => {
  assert.deepEqual(extractPeaks([], 10), []);
  assert.deepEqual(extractPeaks([0.1, 0.2], 0), []);
});

test('extractPeaks: normalize scales the loudest peak to 1', () => {
  const samples = [0.1, 0.2, 0.4, 0.5]; // 2 buckets → [0.2, 0.5]
  const peaks = extractPeaks(samples, 2, { normalize: true });
  assert.ok(Math.abs(peaks[1] - 1) < 1e-9, 'loudest → 1');
  assert.ok(Math.abs(peaks[0] - 0.4) < 1e-9, '0.2/0.5 = 0.4');
});

test('extractMinMax: signed envelope per bucket', () => {
  const samples = [0.2, -0.8, 0.5, -0.1];
  const { min, max } = extractMinMax(samples, 2);
  assert.deepEqual(min, [-0.8, -0.1]);
  assert.deepEqual(max, [0.2, 0.5]);
});

test('mixToMono: single channel passes through; multi averages', () => {
  const a = new Float32Array([1, 0]);
  assert.equal(mixToMono([a]), a, 'single channel not copied');
  const mono = mixToMono([new Float32Array([1, 0]), new Float32Array([0, 1])]);
  assert.ok(Math.abs(mono[0] - 0.5) < 1e-9 && Math.abs(mono[1] - 0.5) < 1e-9);
});

test('peaksFromBuffer: reads channels and mixes (fake AudioBuffer)', () => {
  const fakeBuffer = {
    numberOfChannels: 2,
    getChannelData(c) {
      return c === 0 ? new Float32Array([1, 0, 0, 0]) : new Float32Array([0, 0, 1, 0]);
    },
  };
  // mono = [0.5, 0, 0.5, 0]; 2 buckets → [0.5, 0.5]
  assert.deepEqual(peaksFromBuffer(fakeBuffer, 2), [0.5, 0.5]);
});

test('extractPeaks/extractMinMax: NaN bucket count → empty, not a RangeError', () => {
  const samples = [0.1, -0.2, 0.3, -0.4];
  // `new Array(NaN)` throws; the guard must reject NaN like the empty-input case.
  assert.deepEqual(extractPeaks(samples, NaN), [], 'NaN buckets → []');
  assert.deepEqual(extractMinMax(samples, NaN), { min: [], max: [] }, 'NaN buckets → empty envelope');
  // Infinity is gracefully clamped to one bucket per sample (Math.min), not a crash.
  assert.equal(extractPeaks(samples, Infinity).length, samples.length);
});

// ---- decodePeaks maxBytes DoS cap ------------------------------------------
// Regression for: a non-finite waveformMaxBytes forwarded raw into decodePeaks
// disables BOTH size guards (NaN/Infinity comparisons are always false), which
// is why loadWaveform() finite-guards the consumer value before forwarding it.

// A fake AudioContext lets decodePeaks reach decodeAudioData without Web Audio.
// (The byteLength guard throws BEFORE decode for the oversized cases below, so
// decodeAudioData is only exercised by the under-cap case.)
function fakeAudioContext() {
  return {
    decodeAudioData(_buf) {
      return Promise.resolve({
        numberOfChannels: 1,
        duration: 1,
        sampleRate: 8000,
        getChannelData() {
          return new Float32Array([0.5, -0.5, 0.25, -0.25]);
        },
      });
    },
    // no close() — ownsContext is false when audioContext is supplied
  };
}

await testAsync('decodePeaks: a finite maxBytes rejects an oversized arrayBuffer', async () => {
  const big = new ArrayBuffer(2048);
  await assert.rejects(
    () => decodePeaks({ arrayBuffer: big, maxBytes: 1024, audioContext: fakeAudioContext() }),
    /exceeds maxBytes/,
    'over-cap buffer must be rejected',
  );
});

await testAsync('decodePeaks: a non-finite maxBytes DEFEATS the cap (why the call site must guard)', async () => {
  const big = new ArrayBuffer(2048);
  // NaN: `2048 > NaN` is false, so the guard no-ops and decode proceeds.
  const nan = await decodePeaks({ arrayBuffer: big, maxBytes: NaN, audioContext: fakeAudioContext() });
  assert.ok(Array.isArray(nan.peaks), 'NaN maxBytes lets an oversized buffer through — guard disabled');
  // Infinity (e.g. JSON.parse("1e999")) likewise disables the cap.
  const inf = await decodePeaks({ arrayBuffer: big, maxBytes: Infinity, audioContext: fakeAudioContext() });
  assert.ok(Array.isArray(inf.peaks), 'Infinity maxBytes lets an oversized buffer through — guard disabled');
});

await testAsync('decodePeaks: omitted maxBytes applies the 64MB default cap', async () => {
  // An under-default buffer decodes via the default cap (undefined → 64MB).
  const small = new ArrayBuffer(512);
  const { peaks } = await decodePeaks({ arrayBuffer: small, audioContext: fakeAudioContext(), buckets: 2 });
  assert.deepEqual(peaks, [0.5, 0.25], 'small buffer decodes under the default cap');
});

if (isMain(import.meta.url)) report({ exit: true });
