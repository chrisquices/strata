// subtitles.test.mjs
// Pure unit tests for VTT parsing and active-cue timing.
//   node media-engine/subtitles.test.mjs

import { test, assert, isMain, report } from './harness.mjs';
import { parseVTT, parseTimestamp, createCueTrack, createVideoRenderer, RendererEvent } from './media-engine.js';

// ============================================================================
// parseTimestamp
// ============================================================================

test('parseTimestamp: HH:MM:SS.mmm and MM:SS.mmm forms', () => {
  assert.equal(parseTimestamp('00:00:01.000'), 1);
  assert.equal(parseTimestamp('01:02:03.500'), 3723.5);
  assert.equal(parseTimestamp('02:05.250'), 125.25); // MM:SS
  assert.equal(parseTimestamp('00:00:00,500'), 0.5); // comma decimal tolerated
  assert.ok(Number.isNaN(parseTimestamp('nonsense')));
});

// ============================================================================
// parseVTT
// ============================================================================

const SAMPLE = `WEBVTT - Some title

1
00:00:01.000 --> 00:00:04.000 line:90% align:center
Hello <b>world</b>

00:00:05.000 --> 00:00:08.000
Second cue
on two lines

NOTE this is a comment block, ignore me

00:00:07.000 --> 00:00:09.000
Overlapping cue`;

test('parseVTT: parses cues, ids, multi-line text, and skips NOTE', () => {
  const { cues } = parseVTT(SAMPLE);
  assert.equal(cues.length, 3, 'three cues (NOTE skipped)');
  assert.equal(cues[0].id, '1');
  assert.equal(cues[0].start, 1);
  assert.equal(cues[0].end, 4);
  assert.equal(cues[0].text, 'Hello <b>world</b>');
  assert.equal(cues[0].plain, 'Hello world', 'tags stripped for plain');
  assert.deepEqual(cues[0].settings, { line: '90%', align: 'center' });
  assert.equal(cues[1].text, 'Second cue\non two lines', 'multi-line preserved');
});

test('parseVTT: cue without an id line gets an auto id', () => {
  const { cues } = parseVTT(SAMPLE);
  assert.ok(cues[1].id, 'auto id assigned');
  assert.notEqual(cues[1].id, '');
});

test('parseVTT: tolerates \\r\\n line endings and a bare WEBVTT header', () => {
  const crlf = 'WEBVTT\r\n\r\n00:00:01.000 --> 00:00:02.000\r\nHi\r\n';
  const { cues } = parseVTT(crlf);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].plain, 'Hi');
});

test('parseVTT: drops a cue with a malformed timing line, keeps the rest', () => {
  const bad = `WEBVTT

00:00:01.000 --> garbage
dropped

00:00:02.000 --> 00:00:03.000
kept`;
  const { cues } = parseVTT(bad);
  assert.equal(cues.length, 1);
  assert.equal(cues[0].plain, 'kept');
});

test('parseVTT: empty / missing input → no cues, no throw', () => {
  assert.deepEqual(parseVTT('').cues, []);
  assert.deepEqual(parseVTT(undefined).cues, []);
});

test('parseVTT: returns cues sorted by start time', () => {
  const unordered = `WEBVTT

00:00:09.000 --> 00:00:10.000
late

00:00:01.000 --> 00:00:02.000
early`;
  const { cues } = parseVTT(unordered);
  assert.deepEqual(cues.map((c) => c.plain), ['early', 'late']);
});

// ============================================================================
// createCueTrack — timing
// ============================================================================

test('cue track: activeAt returns the cue spanning the time (half-open interval)', () => {
  const { cues } = parseVTT(SAMPLE);
  const track = createCueTrack(cues);
  assert.deepEqual(track.activeAt(2).map((c) => c.id), ['1']);
  assert.deepEqual(track.activeAt(1).map((c) => c.id), ['1'], 'inclusive at start');
  assert.deepEqual(track.activeAt(4), [], 'exclusive at end');
});

test('cue track: overlapping cues are all returned', () => {
  const { cues } = parseVTT(SAMPLE);
  const track = createCueTrack(cues);
  // 7.0–8.0 overlaps "Second cue" (5–8) and "Overlapping cue" (7–9).
  const ids = track.activeAt(7.5).map((c) => c.plain);
  assert.equal(ids.length, 2, 'two overlapping cues active');
  assert.ok(ids.includes('Second cue\non two lines') && ids.includes('Overlapping cue'));
});

test('cue track: gap with no cue returns empty', () => {
  const { cues } = parseVTT(SAMPLE);
  const track = createCueTrack(cues);
  assert.deepEqual(track.activeAt(4.5), [], 'gap between cue 1 and 2');
});

test('cue track: update() reports changed only when the active set changes', () => {
  const { cues } = parseVTT(SAMPLE);
  const track = createCueTrack(cues);
  assert.equal(track.update(2).changed, true, 'entered cue 1');
  assert.equal(track.update(2.5).changed, false, 'still cue 1');
  assert.equal(track.update(4.5).changed, true, 'left into gap');
  assert.equal(track.update(4.7).changed, false, 'still gap');
  assert.equal(track.update(5).changed, true, 'entered cue 2');
});

test('cue track: reset() forces the next update to report changed', () => {
  const { cues } = parseVTT(SAMPLE);
  const track = createCueTrack(cues);
  track.update(2);
  assert.equal(track.update(2).changed, false);
  track.reset();
  assert.equal(track.update(2).changed, true, 'after reset, re-emits');
});

// ============================================================================
// Video renderer setCaptions — non-finite index guard (audit regression)
// ============================================================================

test('video setCaptions(NaN) does not poison currentCaptions or the emitted track index', () => {
  // No mount needed: setCaptions runs its index normalization directly. Before the
  // fix, setCaptions(NaN) selected NaN (NaN == null / NaN < 0 / NaN >= length are
  // all false), so getState().currentCaptions became NaN, emitTracks() emitted
  // `current: NaN`, and cycleCaptions() re-derived NaN forever. The `!(index >= 0)`
  // form rejects NaN/non-finite the same way it rejects negatives.
  const r = createVideoRenderer({ type: 'video', src: 'x.mp4' }, {});
  let lastTracks = null;
  r.on(RendererEvent.TRACKS, (p) => (lastTracks = p));

  r.setCaptions(NaN);
  assert.equal(r.getState().currentCaptions, -1, 'NaN normalized to -1 (off), not stored as NaN');
  assert.ok(lastTracks && lastTracks.current === -1, 'TRACKS emitted current:-1, not NaN');

  // The poison would be permanent: cycleCaptions() computes next from currentCaptions.
  // With currentCaptions a clean -1, cycling stays finite.
  r.cycleCaptions();
  assert.ok(Number.isFinite(r.getState().currentCaptions), 'currentCaptions stays finite after cycle');

  // Other non-finite forms are rejected too.
  r.setCaptions(Infinity);
  assert.equal(r.getState().currentCaptions, -1, 'Infinity → off');
  r.setCaptions(-Infinity);
  assert.equal(r.getState().currentCaptions, -1, '-Infinity → off');
});

if (isMain(import.meta.url)) report({ exit: true });
