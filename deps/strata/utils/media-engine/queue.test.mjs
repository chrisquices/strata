// queue.test.mjs
// Pure unit tests for the audio playback-policy module: ordering, repeat modes,
// play-once-and-stop, and A-B segment repeat.
//   node media-engine/queue.test.mjs

import { test, assert, isMain, report } from './harness.mjs';
import { createQueue, RepeatMode } from './media-engine.js';

const tracks = ['a', 'b', 'c'];

// ============================================================================
// Navigation + repeat
// ============================================================================

test('next/prev with repeat none clamps at the ends', () => {
  const q = createQueue({ items: tracks });
  assert.equal(q.current(), 'a');
  assert.deepEqual(q.next(), { index: 1, wrapped: false });
  assert.deepEqual(q.next(), { index: 2, wrapped: false });
  assert.equal(q.next(), null, 'no advance past the last track');
  assert.equal(q.current(), 'c', 'stayed on last');
  assert.deepEqual(q.prev(), { index: 1, wrapped: false });
});

test('repeat all wraps both directions', () => {
  const q = createQueue({ items: tracks, repeat: RepeatMode.ALL });
  q.jump(2);
  assert.deepEqual(q.next(), { index: 0, wrapped: true });
  assert.deepEqual(q.prev(), { index: 2, wrapped: true });
});

test('hasNext/hasPrev reflect repeat mode', () => {
  const q = createQueue({ items: tracks });
  q.jump(2);
  assert.equal(q.hasNext(), false);
  q.setRepeat(RepeatMode.ALL);
  assert.equal(q.hasNext(), true, 'wrap makes next always available');
  q.jump(0);
  assert.equal(q.hasPrev(), true);
});

test('jump clamps to range', () => {
  const q = createQueue({ items: tracks });
  assert.equal(q.jump(99), 2);
  assert.equal(q.jump(-5), 0);
});

// ============================================================================
// onEnded — the end-of-track decision
// ============================================================================

test('onEnded: repeat none advances mid-queue, stops at the last track', () => {
  const q = createQueue({ items: tracks });
  assert.deepEqual(q.onEnded(), { action: 'advance', index: 1, wrapped: false });
  q.jump(2);
  assert.deepEqual(q.onEnded(), { action: 'stop', index: 2 });
});

test('onEnded: repeat all wraps at the last track', () => {
  const q = createQueue({ items: tracks, repeat: RepeatMode.ALL });
  q.jump(2);
  assert.deepEqual(q.onEnded(), { action: 'advance', index: 0, wrapped: true });
});

test('onEnded: repeat one restarts the current track', () => {
  const q = createQueue({ items: tracks, repeat: RepeatMode.ONE });
  q.jump(1);
  assert.deepEqual(q.onEnded(), { action: 'repeat', index: 1 });
  assert.equal(q.current(), 'b', 'index unchanged on repeat');
});

test('onEnded: play-once-and-stop halts on the current track (distinct from loop)', () => {
  const q = createQueue({ items: tracks, playOnce: true, repeat: RepeatMode.ALL });
  q.jump(1);
  assert.deepEqual(q.onEnded(), { action: 'stop', index: 1 }, 'play-once overrides repeat');
});

test('onEnded: empty queue → stop', () => {
  const q = createQueue({ items: [] });
  assert.deepEqual(q.onEnded(), { action: 'stop', index: -1 });
  assert.equal(q.current(), null);
});

// ============================================================================
// setItems
// ============================================================================

test('setItems replaces the queue, resets A-B, sets index', () => {
  const q = createQueue({ items: tracks });
  q.setAB(1, 2);
  q.setItems(['x', 'y'], { index: 1 });
  assert.equal(q.size, 2);
  assert.equal(q.current(), 'y');
  assert.equal(q.getAB(), null, 'A-B cleared on new queue');
});

// ============================================================================
// A-B repeat
// ============================================================================

test('A-B: abSeek returns the loop start once time reaches b, else null', () => {
  const q = createQueue({ items: tracks });
  q.setAB(10, 20);
  assert.equal(q.abSeek(15), null, 'inside the segment, no wrap');
  assert.equal(q.abSeek(20), 10, 'at b → seek to a');
  assert.equal(q.abSeek(25), 10, 'past b → seek to a');
  assert.equal(q.abSeek(5), null, 'before a → left alone');
});

test('A-B: endpoints are ordered; degenerate span is ignored', () => {
  const q = createQueue({ items: tracks });
  assert.deepEqual(q.setAB(20, 10), { a: 10, b: 20 }, 'swapped into order');
  assert.equal(q.setAB(5, 5), null, 'zero-length span rejected');
  assert.equal(q.getAB(), null);
});

test('A-B: clearAB disables looping', () => {
  const q = createQueue({ items: tracks });
  q.setAB(10, 20);
  q.clearAB();
  assert.equal(q.abSeek(25), null);
});

test('A-B: a non-finite endpoint is rejected — abSeek never returns -Infinity into currentTime', () => {
  const q = createQueue({ items: tracks });
  // setAB(-Infinity, 10): Math.max(-Infinity, 10) > Math.min(...) is true, so the
  // old code accepted { a: -Infinity, b: 10 } and abSeek(>=10) returned -Infinity,
  // which throws on the HTMLMediaElement currentTime setter from inside timeupdate.
  assert.equal(q.setAB(-Infinity, 10), null, 'lower -Infinity endpoint rejected');
  assert.equal(q.getAB(), null);
  assert.equal(q.abSeek(15), null, 'no -Infinity seek target leaks out');

  assert.equal(q.setAB(5, Infinity), null, '+Infinity endpoint rejected');
  assert.equal(q.setAB(NaN, 10), null, 'NaN endpoint rejected');
  assert.equal(q.getAB(), null, 'state stays null after rejected endpoints');

  // A valid segment still works after rejections.
  assert.deepEqual(q.setAB(10, 20), { a: 10, b: 20 });
  assert.equal(q.abSeek(20), 10);
});

// ============================================================================
// Non-finite guards + enum validation (audit regressions)
// ============================================================================

test('jump(NaN)/jump(Infinity) are ignored — index stays valid, queue not bricked', () => {
  const q = createQueue({ items: tracks });
  q.jump(1);
  assert.equal(q.jump(NaN), 1, 'NaN jump keeps the current index (clamp would let NaN through)');
  assert.equal(q.jump(Infinity), 1, 'Infinity jump keeps the current index');
  assert.equal(q.current(), 'b', 'current() still resolves — not null');
  assert.deepEqual(q.next(), { index: 2, wrapped: false }, 'navigation still advances');
});

test('setItems with a non-finite index falls back to 0', () => {
  const q = createQueue({ items: tracks });
  q.setItems(['x', 'y', 'z'], { index: NaN });
  assert.equal(q.index, 0, 'NaN index → 0, never NaN');
  assert.equal(q.current(), 'x');
});

test('setRepeat / options.repeat reject an unknown mode (throw, not silent NONE)', () => {
  const q = createQueue({ items: tracks });
  assert.throws(() => q.setRepeat('shuffle'), TypeError, 'unknown mode throws');
  assert.equal(q.getRepeat(), RepeatMode.NONE, 'the rejected mode did not take effect');
  assert.throws(() => createQueue({ items: tracks, repeat: 'bogus' }), TypeError);
  assert.equal(q.setRepeat(RepeatMode.ALL), RepeatMode.ALL, 'valid modes still work');
});

if (isMain(import.meta.url)) report({ exit: true });
