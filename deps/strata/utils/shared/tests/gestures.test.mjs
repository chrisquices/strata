// gestures.test.mjs
// Pure unit tests for the gesture recognizer: feed synthetic pointer sequences
// (+ a zoom-state stub) and assert the resolved gesture stream. This exercises
// the real §7 conflict-resolution state machine with no DOM.
//   node gestures.test.mjs
//
// Importing gestures.js here doubles as a headless-core check: it must not touch
// the DOM at module scope, or this import throws in Node.

import assert from 'node:assert/strict';
import { createGestureRecognizer, classifyDrag, Axis } from '../gestures.js';

// ---- tiny zero-dependency harness ----
let passed = 0, failed = 0;
function test(name, run) {
  try { run(); passed++; console.log(`ok   - ${name}`); }
  catch (error) { failed++; console.error(`FAIL - ${name}\n       ${error.message.split('\n').join('\n       ')}`); }
}

const ALL_EVENTS = [
  'tap', 'doubletap',
  'panstart', 'pan', 'panend',
  'navigatestart', 'navigatemove', 'navigateend',
  'dismissstart', 'dismissmove', 'dismissend',
  'pinchstart', 'pinch', 'pinchend',
  'wheelzoom',
];

// Collect every emitted gesture into an ordered log.
function collect(recognizer) {
  const log = [];
  for (const eventName of ALL_EVENTS) {
    recognizer.on(eventName, (payload) => log.push({ type: eventName, payload }));
  }
  log.types = () => log.map((entry) => entry.type);
  log.last = (eventName) => [...log].reverse().find((entry) => entry.type === eventName)?.payload;
  return log;
}

// ============================================================================
// classifyDrag (pure)
// ============================================================================

test('classifyDrag: ≤30° of horizontal → HORIZONTAL (navigate)', () => {
  assert.equal(classifyDrag(100, 0), Axis.HORIZONTAL);
  assert.equal(classifyDrag(100, 50), Axis.HORIZONTAL); // ~26.6°
  assert.equal(classifyDrag(-100, 10), Axis.HORIZONTAL);
});

test('classifyDrag: ≥60° & downward → VERTICAL (dismiss)', () => {
  assert.equal(classifyDrag(0, 100), Axis.VERTICAL);
  assert.equal(classifyDrag(40, 100), Axis.VERTICAL); // ~68°
});

test('classifyDrag: steep upward is never dismiss (no up-dismiss action)', () => {
  assert.equal(classifyDrag(0, -100), Axis.HORIZONTAL);
  assert.equal(classifyDrag(10, -100), Axis.HORIZONTAL);
});

test('classifyDrag: diagonal dead-zone (30–60°) locks to the dominant axis', () => {
  assert.equal(classifyDrag(100, 80), Axis.HORIZONTAL); // ~38.7°, |deltaX|>|deltaY|
  assert.equal(classifyDrag(80, 100), Axis.VERTICAL); // ~51°, |deltaY|>|deltaX|, downward
});

test('classifyDrag: a deadZone > 45 does not let one angle satisfy both HORIZONTAL and VERTICAL', () => {
  // Regression: the horizontal branch (angle <= dead) and the vertical branch
  // (angle >= 90 - dead && downward) overlapped once dead > 45, so a 45° DOWNWARD
  // drag satisfied BOTH `45 <= 50` (HORIZONTAL) and the old `45 >= 40` (VERTICAL),
  // resolved only by source order. The vertical lower bound is now raised to
  // Math.max(dead, 90 - dead) so the two verdicts can never overlap.
  const dead = 50;
  // A 45° downward drag falls inside the horizontal range (45 <= 50) → HORIZONTAL,
  // and the vertical branch must NOT also claim it (its lower bound is now 50).
  assert.equal(classifyDrag(100, 100, dead), Axis.HORIZONTAL, '45° downward is unambiguously HORIZONTAL');
  // A genuinely steep downward drag (> 50°) is still VERTICAL.
  assert.equal(classifyDrag(50, 100, dead), Axis.VERTICAL, '~63° downward is still VERTICAL');
  // The default dead-zone behavior is unchanged: Math.max(30, 60) === 60 === 90 - 30.
  assert.equal(classifyDrag(40, 100), Axis.VERTICAL); // ~68°, default dead-zone, still dismiss
  assert.equal(classifyDrag(100, 50), Axis.HORIZONTAL); // ~26.6°, default dead-zone, still navigate
});

// ============================================================================
// Tap & double-tap (rules 3/4)
// ============================================================================

test('tap: down then up with <10px movement emits a single tap', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 102, y: 101, time: 50 });
  assert.deepEqual(log.types(), ['tap']);
  assert.deepEqual(log[0].payload, { x: 102, y: 101 });
});

test('double-tap: second tap within window & distance → tap then doubletap', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 });
  recognizer.pointerDown({ id: 1, x: 105, y: 103, time: 200 });
  recognizer.pointerUp({ id: 1, x: 105, y: 103, time: 230 });
  assert.deepEqual(log.types(), ['tap', 'doubletap']);
});

test('double-tap: too slow → two separate taps', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 });
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 600 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 630 });
  assert.deepEqual(log.types(), ['tap', 'tap']);
});

test('double-tap: too far → two separate taps', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 });
  recognizer.pointerDown({ id: 1, x: 200, y: 100, time: 200 });
  recognizer.pointerUp({ id: 1, x: 200, y: 100, time: 230 });
  assert.deepEqual(log.types(), ['tap', 'tap']);
});

test('double-tap: an intervening drag breaks the double-tap chain (tap → swipe → tap)', () => {
  // Regression: a deliberate drag between two taps used to leave lastTapTime
  // stale, so the post-drag tap paired with the pre-drag tap and a doubletap
  // fired even though tap+swipe+tap happened, not a double-tap (rule 4).
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 30 }); // tap
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 100 });
  recognizer.pointerMove({ id: 1, x: 160, y: 100, time: 130 }); // navigate (escalates)
  recognizer.pointerUp({ id: 1, x: 160, y: 100, time: 160 }); // navigateend
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 200 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 230 }); // within 300ms/30px of FIRST tap
  assert.deepEqual(
    log.types(),
    ['tap', 'navigatestart', 'navigatemove', 'navigateend', 'tap'],
    'the intervening drag must break the chain → second tap is a plain tap, not doubletap'
  );
});

test('double-tap: an intervening pinch breaks the double-tap chain (tap → pinch+pan → tap)', () => {
  // Regression: beginPinch() did not consume lastTapTime, so a tap before a
  // pinch survived the whole pinch+pan interaction and wrongly promoted a later
  // genuine single tap to doubletap. Mirrors the intervening-drag fix (rule 4),
  // which only covered the single-finger escalation path.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 30 }); // tap, records double-tap memory
  // Two fingers down/move/up → pinch, then continuePinchAsPan → panend.
  recognizer.pointerDown({ id: 2, x: 100, y: 100, time: 60 });
  recognizer.pointerDown({ id: 3, x: 200, y: 100, time: 70 }); // pinch pair = 2 & 3
  recognizer.pointerMove({ id: 3, x: 300, y: 100, time: 86 }); // pinch
  recognizer.pointerUp({ id: 2, x: 100, y: 100, time: 100 }); // pinchend → pan onto id 3
  recognizer.pointerUp({ id: 3, x: 300, y: 100, time: 110 }); // panend → idle
  // A real single tap near the first tap point, within 300ms of the FIRST tap.
  recognizer.pointerDown({ id: 4, x: 100, y: 100, time: 200 });
  recognizer.pointerUp({ id: 4, x: 100, y: 100, time: 230 }); // 230 - 30 = 200 <= 300, dist 0
  assert.deepEqual(
    log.types(),
    ['tap', 'pinchstart', 'pinch', 'pinchend', 'panstart', 'panend', 'tap'],
    'the intervening pinch must break the chain → final tap is a plain tap, not doubletap'
  );
});

test('rehome after primary lift: a stationary lift of the re-homed finger emits no spurious tap', () => {
  // Regression: rehomePrimaryAfterLift left the re-homed finger in
  // mode 'pending', escalated=false, so lifting it WITHOUT moving emitted a
  // spurious tap (and recorded fresh double-tap memory). The re-homed finger was
  // part of a multi-finger interaction, not a deliberate press; it must wind down
  // tap-free like continuePinchAsPan (escalated=true).
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // third finger, tracked
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // panend → rehome onto id 3 (pending)
  recognizer.pointerUp({ id: 3, x: 150, y: 300, time: 60 }); // STATIONARY lift of re-homed finger
  const types = log.types();
  assert.deepEqual(
    types,
    ['pinchstart', 'pinch', 'pinchend', 'panstart', 'panend'],
    'a stationary lift of the re-homed finger must not emit a tap'
  );

  // And it must not have corrupted double-tap memory: a subsequent genuine
  // single tap near the same point within 300ms must stay a plain tap.
  recognizer.pointerDown({ id: 4, x: 150, y: 300, time: 100 });
  recognizer.pointerUp({ id: 4, x: 150, y: 300, time: 130 });
  assert.deepEqual(
    log.types().slice(types.length),
    ['tap'],
    'the suppressed re-home lift must not seed a false doubletap'
  );
});

test('rehome after primary lift: a fresh drag from the re-homed finger still escalates', () => {
  // Guard the escalated=true fix did not block a genuine drag: moving the
  // re-homed finger past the threshold must still classify and drive a gesture.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // third finger, tracked
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // panend → rehome onto id 3 (pending)
  recognizer.pointerMove({ id: 3, x: 150, y: 330, time: 66 }); // >10px down → fresh dismiss
  assert.ok(
    log.types().includes('dismissstart'),
    're-homed finger still drives a fresh gesture after the tap-suppressing fix'
  );
});

test('pinch-to-zero (lift both fingers) lands in a clean idle: next tap is a plain tap, drag re-escalates', () => {
  // Symmetry fix: the pinch branch's no-fingers-remain exit (pointerUp) now calls
  // resetToIdle() — clearing mode + escalated + primaryPointerId together — to
  // match the pointerCancel sibling and every other 'no fingers remain'
  // transition (the old inline `mode = 'idle'` left escalated=true and a dangling
  // primaryPointerId). This test pins the user-facing pinch-to-zero contract:
  // lifting both fingers must leave the recognizer fully idle so the next
  // single-finger interaction starts clean.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // panend → both lifted → resetToIdle()
  assert.equal(recognizer.getMode(), 'idle', 'both fingers lifted → fully idle');

  // A fresh single-finger press/lift is a plain tap (not suppressed by a leaked
  // escalated=true, not mis-routed by a dangling primaryPointerId).
  const after = log.types().length;
  recognizer.pointerDown({ id: 3, x: 500, y: 500, time: 200 });
  recognizer.pointerUp({ id: 3, x: 500, y: 500, time: 230 });
  assert.deepEqual(
    log.types().slice(after),
    ['tap'],
    'a clean single-finger press after pinch-to-zero is a plain tap'
  );

  // And a fresh drag still escalates normally from idle.
  recognizer.pointerDown({ id: 4, x: 200, y: 200, time: 300 });
  recognizer.pointerMove({ id: 4, x: 215, y: 202, time: 316 }); // >10px horizontal → navigate
  assert.ok(
    log.types().includes('navigatestart'),
    'a fresh drag after pinch-to-zero escalates from a clean idle state'
  );
});

// ============================================================================
// Drag classification (rules 1/2) + axis lock
// ============================================================================

test('not zoomed, horizontal drag → navigate; distance past navigateDistance commits', () => {
  const recognizer = createGestureRecognizer(); // isZoomed → false
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 215, y: 202, time: 16 }); // >10px, near-horizontal → navigate
  recognizer.pointerMove({ id: 1, x: 260, y: 205, time: 32 });
  recognizer.pointerUp({ id: 1, x: 300, y: 205, time: 48 }); // total +100 > 80
  assert.deepEqual(log.types(), ['navigatestart', 'navigatemove', 'navigatemove', 'navigateend']);
  const end = log.last('navigateend');
  assert.equal(end.willNavigate, true);
  assert.equal(end.direction, 'previous'); // dragged right (+x)
});

test('not zoomed, short slow horizontal drag → navigate but does NOT commit', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 230, y: 202, time: 200 }); // slow (low velocity)
  recognizer.pointerUp({ id: 1, x: 240, y: 202, time: 400 }); // total 40 < 80, slow
  assert.equal(log.last('navigateend').willNavigate, false);
});

test('not zoomed, fast flick commits even under navigateDistance (velocity)', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 213, y: 200, time: 5 }); // velocityX = 13/5 = 2.6 px/ms
  recognizer.pointerUp({ id: 1, x: 216, y: 200, time: 8 }); // total 16 < 80, but flick
  const end = log.last('navigateend');
  assert.equal(end.willNavigate, true, `velocityX ${end.velocityX}`);
});

test('navigate flick: a fast reversal opposite to cumulative travel does NOT commit (directional flick)', () => {
  // Regression: the navigate commit used an undirected `Math.abs(velocityX)`
  // test while `direction` is derived from the cumulative `total`. Dragging
  // right (total stays positive → direction 'previous') and then flicking left
  // on the LAST move made velocityX strongly negative, so willNavigate fired
  // true and committed a 'previous' navigation even though the finger flicked
  // left ('next'). The dismiss path already guards this with a sign-agreeing,
  // non-abs check; the navigate path now mirrors it.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 260, y: 200, time: 100 }); // total +60, locks navigate
  recognizer.pointerMove({ id: 1, x: 230, y: 200, time: 102 }); // velocityX = -15 px/ms, total +30
  recognizer.pointerUp({ id: 1, x: 230, y: 200, time: 102 }); // total +30 < 80, leftward flick
  const end = log.last('navigateend');
  assert.equal(end.direction, 'previous'); // cumulative travel is still rightward
  assert.ok(end.velocityX < 0, `velocityX ${end.velocityX} (leftward flick)`);
  assert.equal(
    end.willNavigate,
    false,
    'a leftward flick must not commit a rightward ("previous") navigation'
  );
});

test('navigate flick: a flick agreeing in sign with cumulative travel still commits', () => {
  // Guard the directional fix did not break the normal case: when the flick
  // velocity agrees in sign with the cumulative travel, the velocity-driven
  // commit still fires even under navigateDistance.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 210, y: 200, time: 100 }); // locks navigate, total +10
  recognizer.pointerMove({ id: 1, x: 230, y: 200, time: 102 }); // velocityX = +10 px/ms, total +30
  recognizer.pointerUp({ id: 1, x: 230, y: 200, time: 102 }); // total +30 < 80, rightward flick
  const end = log.last('navigateend');
  assert.equal(end.direction, 'previous');
  assert.ok(end.velocityX > 0, `velocityX ${end.velocityX} (rightward flick)`);
  assert.equal(end.willNavigate, true, 'a rightward flick commits the rightward navigation');
});

test('not zoomed, downward drag → dismiss; past dismissDistance commits', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 100, time: 0 });
  recognizer.pointerMove({ id: 1, x: 202, y: 130, time: 16 }); // near-vertical down → dismiss
  recognizer.pointerUp({ id: 1, x: 205, y: 260, time: 60 }); // total +160 > 140
  assert.deepEqual(log.types(), ['dismissstart', 'dismissmove', 'dismissend']);
  assert.equal(log.last('dismissend').willDismiss, true);
});

test('axis lock: once horizontal, later vertical movement stays navigate (no dismiss)', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 220, y: 201, time: 16 }); // lock horizontal
  recognizer.pointerMove({ id: 1, x: 221, y: 320, time: 32 }); // big vertical — must NOT switch
  recognizer.pointerUp({ id: 1, x: 221, y: 320, time: 48 });
  assert.ok(!log.types().includes('dismissstart'), 'must not start dismiss after locking navigate');
  assert.deepEqual(log.types(), ['navigatestart', 'navigatemove', 'navigatemove', 'navigateend']);
});

test('zoomed: one-finger drag is PAN regardless of direction (rule 1)', () => {
  const recognizer = createGestureRecognizer({ isZoomed: () => true });
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 230, y: 260, time: 16 }); // diagonal — would be navigate/dismiss if not zoomed
  recognizer.pointerMove({ id: 1, x: 240, y: 270, time: 32 });
  recognizer.pointerUp({ id: 1, x: 240, y: 270, time: 48 });
  assert.deepEqual(log.types(), ['panstart', 'pan', 'pan', 'panend']);
  assert.deepEqual(
    log[1].payload,
    { deltaX: 30, deltaY: 60, x: 230, y: 260 },
    'first pan delta is the step from the previous sample (= start here, no pre-threshold move)'
  );
});

test('zoomed: first pan frame reports the STEP delta, not the cumulative-from-start delta', () => {
  // Regression: the first 'pan' frame on escalation emitted deltaX/deltaY =
  // totalX/totalY (displacement from gesture START), while every later pan frame
  // and the navigate/dismiss escalation frames emit the STEP delta (since the
  // previous sample). A finger that drifts a few px BELOW moveThreshold (which
  // advances lastX/lastY but not startX) and then crosses the threshold made the
  // first pan delta include that pre-threshold drift, so a consumer summing pan
  // deltas as per-frame increments over-applied by the drift on frame 1.
  const recognizer = createGestureRecognizer({ isZoomed: () => true });
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 205, y: 203, time: 8 }); // sub-threshold drift (hypot ~5.8 < 10) → still pending
  recognizer.pointerMove({ id: 1, x: 240, y: 250, time: 16 }); // crosses threshold → escalate to pan
  assert.deepEqual(log.types(), ['panstart', 'pan'], 'escalated to pan, no pan on the sub-threshold drift');
  // STEP delta from the previous sample (205,203) → (240,250) = (35, 47),
  // NOT the cumulative-from-start (200,200) → (240,250) = (40, 50).
  assert.deepEqual(
    log.last('pan'),
    { deltaX: 35, deltaY: 47, x: 240, y: 250 },
    'first pan frame is the step delta (excludes the pre-threshold drift), matching later frames'
  );
});

test('drag suppresses tap (escalated → no tap on release)', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: 240, y: 205, time: 16 });
  recognizer.pointerUp({ id: 1, x: 240, y: 205, time: 32 });
  assert.ok(!log.types().includes('tap'), 'no tap after a drag');
});

// ============================================================================
// Pinch (rule 5)
// ============================================================================

test('two fingers → pinchstart; spreading apart → pinch scaleDelta > 1', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // distance 100, center (150,100)
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // distance 200, center (200,100)
  assert.deepEqual(log.types(), ['pinchstart', 'pinch']);
  const pinch = log.last('pinch');
  assert.ok(Math.abs(pinch.scaleDelta - 2) < 1e-9, `scaleDelta ${pinch.scaleDelta}`);
  assert.ok(Math.abs(pinch.deltaX - 50) < 1e-9, `center deltaX ${pinch.deltaX}`); // two-finger pan component
});

test('second finger during a navigate drag cancels navigate and begins pinch', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerMove({ id: 1, x: 140, y: 102, time: 16 }); // navigate
  recognizer.pointerDown({ id: 2, x: 300, y: 100, time: 20 }); // 2nd finger
  const types = log.types();
  assert.ok(types.includes('navigatestart') && types.includes('navigateend'), 'navigate ended');
  assert.equal(log.last('navigateend').willNavigate, false, 'aborted navigate does not commit');
  assert.equal(types[types.length - 1], 'pinchstart');
});

test('one finger lifting mid-pinch transitions to one-finger pan (no tap)', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 });
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // lift one → pinchend + panstart
  recognizer.pointerMove({ id: 2, x: 310, y: 110, time: 56 }); // continue as pan
  recognizer.pointerUp({ id: 2, x: 310, y: 110, time: 72 });
  const types = log.types();
  assert.deepEqual(types, ['pinchstart', 'pinch', 'pinchend', 'panstart', 'pan', 'panend']);
  assert.ok(!types.includes('tap'), 'lift mid-pinch must not produce a tap');
});

test('cancelling one finger mid-pinch transitions to pan and never crashes the next move', () => {
  // Regression: this used to leave mode === 'pinch' with one pointer, and the
  // next pointerMove crashed reading the missing second pointer.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 });
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerCancel({ id: 1, x: 100, y: 100, time: 40 }); // cancel one finger
  recognizer.pointerMove({ id: 2, x: 310, y: 110, time: 56 }); // must pan, not throw
  recognizer.pointerUp({ id: 2, x: 310, y: 110, time: 72 });
  const types = log.types();
  assert.deepEqual(types, ['pinchstart', 'pinch', 'pinchend', 'panstart', 'pan', 'panend']);
  assert.equal(log.last('pinchend').cancelled, true, 'cancelled pinch reports cancelled: true');
});

test('a third finger lifting mid-pinch must not end the pinch', () => {
  // Regression: any pointerUp during pinch mode used to end the pinch and fall
  // into pan, even when the lifted finger was not one of the pinch pair.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 12 }); // third finger, ignored
  recognizer.pointerUp({ id: 3, x: 150, y: 300, time: 20 }); // third lifts — pinch continues
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // still pinching
  const types = log.types();
  assert.deepEqual(types, ['pinchstart', 'pinch'], 'pinch survived the third finger lifting');
});

test('cancelling a stray third finger must not end the primary pan', () => {
  // Regression: any cancel used to end the in-progress drag, even when the
  // cancelled pointer was not the one dragging.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 12 }); // third finger, ignored
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 20 }); // pinch → pan with id 2
  recognizer.pointerMove({ id: 2, x: 210, y: 110, time: 30 }); // panning
  recognizer.pointerCancel({ id: 3, x: 150, y: 300, time: 34 }); // stray cancel — must not end pan
  recognizer.pointerMove({ id: 2, x: 220, y: 120, time: 40 }); // still panning
  recognizer.pointerUp({ id: 2, x: 220, y: 120, time: 50 });
  const types = log.types();
  assert.equal(types.filter((type) => type === 'panend').length, 1, 'exactly one panend');
  assert.equal(types[types.length - 1], 'panend');
  assert.equal(log.last('panend').cancelled, false, 'the pan ended normally, not cancelled');
});

test('primary lifting with another finger still down does not strand a stale single-finger mode', () => {
  // Regression: pinch loses a finger → continuePinchAsPan re-homes onto the
  // remaining finger (mode 'pan', primary = that finger). When THAT primary then
  // lifts while a third finger is still down, pointerUp emitted panend but only
  // reset on size===0; size was 1 (third finger), so mode stayed 'pan' with a
  // dead primaryPointerId. That stranded the live finger and made the next
  // pointerDown fire a spurious panend{cancelled:true} before pinchstart.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // third finger, tracked
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan re-homed onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // PRIMARY lifts; id 3 still down
  // The gesture must not be stranded in 'pan' with the dead primary id 2.
  assert.notEqual(recognizer.getMode(), 'pan', 'must not stay in pan with the lifted primary');

  // The remaining live finger (id 3) must be able to drive a fresh gesture.
  recognizer.pointerMove({ id: 3, x: 150, y: 330, time: 66 }); // >10px down → fresh dismiss
  assert.ok(log.types().includes('dismissstart'), 'remaining finger drives a fresh gesture, not ignored');

  // And the previous pan must have ended exactly once, with no spurious cancel.
  recognizer.pointerUp({ id: 3, x: 150, y: 330, time: 80 });
  assert.equal(
    log.types().filter((type) => type === 'panend').length,
    1,
    'exactly one panend; no spurious panend{cancelled:true} on the next gesture'
  );
});

test('cancelling the primary with another finger still down re-homes instead of stranding it', () => {
  // Regression: the pointerUp path was fixed to re-home onto a remaining finger
  // when the primary lifts mid-multi-finger interaction, but pointerCancel was
  // not. A 3-finger pinch loses a finger → continuePinchAsPan re-homes onto one
  // (mode 'pan', map = {2,3}); CANCELLING that primary ran resetToIdle()
  // unconditionally, leaving id 3 stranded (mode 'idle', primary=null) so its
  // moves were silently ignored. It must mirror pointerUp: re-home onto id 3.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // third finger, tracked
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan re-homed onto id 2
  recognizer.pointerCancel({ id: 2, x: 300, y: 100, time: 50 }); // CANCEL the primary; id 3 still down

  // The gesture must not be stranded in 'idle' with the live finger orphaned.
  assert.notEqual(recognizer.getMode(), 'idle', 'must re-home onto the remaining finger, not idle');

  // The remaining live finger (id 3) must be able to drive a fresh gesture, the
  // same as the pointerUp path does.
  const before = log.types().length;
  recognizer.pointerMove({ id: 3, x: 150, y: 330, time: 66 }); // >10px down → fresh dismiss
  recognizer.pointerUp({ id: 3, x: 150, y: 330, time: 80 });
  const newEvents = log.types().slice(before);
  assert.ok(
    newEvents.includes('dismissstart') && newEvents.includes('dismissend'),
    'remaining finger drives a fresh gesture after the primary was cancelled, not ignored'
  );
});

test('after primary lift, a brand-new touch starts a clean gesture (no spurious panend before pinchstart)', () => {
  // Same root cause: the stale 'pan' mode + dead primary would make the next
  // pointerDown (size 1→2) run endSingleFingerDrag({cancelled:true}) and fire a
  // spurious panend before pinchstart.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 });
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // third finger
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // → pan re-homed onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // primary lifts; id 3 remains

  const before = log.types().length;
  recognizer.pointerDown({ id: 4, x: 400, y: 400, time: 60 }); // new finger → size 1→2 → pinch
  const newEvents = log.types().slice(before);
  assert.ok(!newEvents.includes('panend'), 'no spurious panend on the next pointerDown');
  assert.equal(newEvents[newEvents.length - 1], 'pinchstart', 'next gesture is a clean pinchstart');
});

test('re-homed pan with a stray finger upgrades to pinch when another finger lands', () => {
  // Regression: a 3+-finger pinch that loses one pinch finger re-homes onto a
  // survivor as a one-finger 'pan' while a stray (3rd) finger is still tracked
  // (map size 2, mode 'pan'). The pinch trigger was keyed strictly on the
  // size 1→2 transition, so a later finger taking size 2→3 hit neither the
  // size===1 nor the size===2 branch and beginPinch() never ran — the user was
  // stranded in a one-finger pan even though two pinch-capable fingers were
  // down. The trigger now fires whenever NOT already pinching and ≥2 fingers
  // are down.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerDown({ id: 3, x: 150, y: 300, time: 30 }); // stray third, tracked
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan re-homed onto id 2, map {2,3}
  assert.equal(recognizer.getMode(), 'pan', 're-homed onto a survivor as a one-finger pan');

  const before = log.types().length;
  recognizer.pointerDown({ id: 4, x: 400, y: 400, time: 50 }); // size 2→3 with two pinch-capable fingers down
  assert.equal(recognizer.getMode(), 'pinch', 'a new finger upgrades the re-homed pan to a pinch');
  const newEvents = log.types().slice(before);
  assert.deepEqual(
    newEvents,
    ['panend', 'pinchstart'],
    'the stranded pan ends and a pinch begins on the first two pointers'
  );
  assert.equal(log.last('panend').cancelled, true, 'the abandoned single-finger pan reports cancelled');
});

// ============================================================================
// Wheel (rule 6)
// ============================================================================

test('wheel up (deltaY < 0) → zoom-in factor > 1, anchored at pointer', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.wheel({ x: 50, y: 60, deltaY: -100 });
  const zoom = log.last('wheelzoom');
  assert.ok(zoom.factor > 1, `factor ${zoom.factor}`);
  assert.equal(zoom.x, 50);
  assert.equal(zoom.y, 60);
});

test('wheel down (deltaY > 0) → zoom-out factor < 1; clamped per-event', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.wheel({ x: 0, y: 0, deltaY: 100000 }); // huge → clamps, not 0
  const zoom = log.last('wheelzoom');
  assert.ok(zoom.factor < 1 && zoom.factor >= 0.8, `factor ${zoom.factor} clamped`);
});

test('wheel: non-finite deltaY emits no wheelzoom (no factor: NaN escaping the clamp)', () => {
  // Regression: Math.pow(base, -NaN) = NaN and Math.max/min do not reject NaN,
  // so wheel({ deltaY: NaN }) used to emit wheelzoom { factor: NaN }. The
  // finite-guard drops the event instead (recurring non-finite class #1).
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.wheel({ x: 10, y: 20, deltaY: NaN });
  recognizer.wheel({ x: 10, y: 20, deltaY: Infinity });
  recognizer.wheel({ x: 10, y: 20, deltaY: -Infinity });
  assert.deepEqual(log.types(), [], 'no wheelzoom for non-finite deltaY');
});

test('wheel: a non-finite anchor x/y emits no wheelzoom (no NaN zoom anchor) (class #1)', () => {
  // Regression: wheel() guarded only deltaY, so wheel({ x: NaN, y: 0, deltaY })
  // emitted wheelzoom { factor: <finite>, x: NaN } — a NaN zoom anchor handed to
  // the consumer. The pointer handlers guard x/y/time together; wheel() now
  // guards x/y/deltaY together to match (non-finite class #1, source-level guard).
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.wheel({ x: NaN, y: 0, deltaY: -100 });
  recognizer.wheel({ x: 0, y: NaN, deltaY: -100 });
  recognizer.wheel({ x: Infinity, y: 0, deltaY: -100 });
  recognizer.wheel({ x: 0, y: -Infinity, deltaY: -100 });
  assert.deepEqual(log.types(), [], 'no wheelzoom for non-finite anchor coordinates');
});

test('pointer: a non-finite coordinate is dropped, never poisoning deltas/velocity (class #1)', () => {
  // Regression: pointerMove wrote the raw sample coordinate into pointer.x/y and
  // derived velocity/stepDelta/total/lastX from it with no finite-guard. A
  // consumer-fed x:NaN yielded total:NaN; Math.hypot(NaN,NaN) < threshold is
  // false so the gesture escalated and emitted navigatemove {deltaX:NaN, x:NaN}
  // and navigateend {velocityX:NaN}, with lastX/velocityX stuck NaN. The wheel()
  // path was already guarded; the pointer path now matches it.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 200, time: 0 });
  recognizer.pointerMove({ id: 1, x: NaN, y: 200, time: 16 }); // poisoned move — dropped
  // The poisoned move must emit nothing and leave the gesture a clean candidate.
  assert.deepEqual(log.types(), [], 'a non-finite move emits no gesture');
  assert.equal(recognizer.getMode(), 'pending', 'gesture stays a clean tap candidate');

  // A subsequent valid horizontal drag must escalate and emit FINITE payloads
  // (state was not poisoned by the dropped sample).
  recognizer.pointerMove({ id: 1, x: 260, y: 202, time: 32 }); // >10px, near-horizontal
  recognizer.pointerUp({ id: 1, x: 300, y: 202, time: 48 });
  assert.deepEqual(log.types(), ['navigatestart', 'navigatemove', 'navigateend']);
  const move = log.last('navigatemove');
  assert.ok(Number.isFinite(move.deltaX) && Number.isFinite(move.total) && Number.isFinite(move.x), 'finite move payload');
  const end = log.last('navigateend');
  assert.ok(Number.isFinite(end.total) && Number.isFinite(end.velocityX), 'finite end payload');
});

test('pointer: a non-finite pointerDown coordinate/time is dropped (no pointer registered)', () => {
  // Guard pointerDown's finite-guard: a poisoned down must not register a
  // pointer, so a later up for that id is a no-op and emits nothing.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: Infinity, time: 0 }); // poisoned — dropped
  recognizer.pointerUp({ id: 1, x: 200, y: 200, time: 30 }); // no such pointer → no tap
  assert.deepEqual(log.types(), [], 'a non-finite down registers nothing and emits nothing');
  assert.equal(recognizer.getMode(), 'idle');
});

test('pointer: a non-finite pointerCancel time is dropped, never poisoning lastTime/velocity (class #1)', () => {
  // Regression: pointerCancel was the lone pointer entry point with no finite-
  // guard. Cancelling a pinch finger with another still down fed sample.time
  // straight into continuePinchAsPan(time) → lastTime = NaN. The next
  // pointerMove then computed `elapsed = time - NaN = NaN`, so the `elapsed > 0`
  // branch never ran and velocityX/velocityY stayed stuck at 0 — a fast flick
  // could never commit a navigate. The guard now matches the sibling handlers.
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerDown({ id: 2, x: 200, y: 100, time: 10 }); // pinch pair = 1 & 2
  recognizer.pointerMove({ id: 2, x: 300, y: 100, time: 26 }); // pinch
  recognizer.pointerCancel({ id: 1, x: 100, y: 100, time: NaN }); // poisoned cancel — dropped

  // The dropped cancel must not transition or strand the gesture: id 1 is still
  // tracked, so it is still the pinch pair with id 2 (no pinchend, still pinch).
  assert.ok(!log.types().includes('pinchend'), 'a non-finite cancel emits no pinchend');
  assert.equal(recognizer.getMode(), 'pinch', 'gesture stays in pinch (cancel was dropped)');

  // Lift both fingers cleanly and start a fresh single-finger flick. lastTime
  // must NOT be poisoned, so the velocity-driven navigate commit still fires.
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 40 }); // pinchend → pan re-homed onto id 2
  recognizer.pointerUp({ id: 2, x: 300, y: 100, time: 50 }); // back to idle
  recognizer.reset();

  const before = log.types().length;
  recognizer.pointerDown({ id: 5, x: 200, y: 200, time: 100 });
  recognizer.pointerMove({ id: 5, x: 213, y: 200, time: 105 }); // velocityX = 13/5 = 2.6 px/ms
  recognizer.pointerUp({ id: 5, x: 215, y: 200, time: 106 });
  const end = log.slice(before).reverse().find((e) => e.type === 'navigateend')?.payload;
  assert.ok(end, 'a fresh horizontal flick still escalates to navigate');
  assert.ok(Number.isFinite(end.velocityX) && end.velocityX > 0, `velocityX ${end?.velocityX} not stuck at 0/NaN`);
  assert.equal(end.willNavigate, true, 'fast flick still commits — lastTime was not poisoned');
});

test('wheel: a non-finite wheelZoomClamp bound is rejected at construction (no factor: NaN)', () => {
  // Regression: the constructor merged consumer options raw, so a NaN clamp
  // bound reached `Math.max(NaN, Math.min(maxFactor, rawFactor)) = NaN` and
  // wheel() emitted wheelzoom { factor: NaN }. The settings sanitizer coerces a
  // non-finite bound back to its DEFAULT_SETTINGS value (class #1, options path).
  for (const badClamp of [[NaN, 1.25], [0.8, NaN], [NaN, NaN], [Infinity, 1.25]]) {
    const recognizer = createGestureRecognizer({ wheelZoomClamp: badClamp });
    const log = collect(recognizer);
    recognizer.wheel({ x: 10, y: 20, deltaY: -100 });
    const zoom = log.last('wheelzoom');
    assert.ok(zoom, `wheelzoom still emitted for clamp ${badClamp}`);
    assert.ok(
      Number.isFinite(zoom.factor),
      `factor ${zoom.factor} finite despite clamp ${badClamp}`
    );
  }
});

test('dismiss: a non-finite dismissDistance option does not poison progress with NaN', () => {
  // Regression: progress = clampProgress(totalY / settings.dismissDistance) used
  // the raw consumer option, so dismissDistance: NaN gave totalY / NaN = NaN and
  // clampProgress(NaN) fell through to `return ratio` (NaN < 0 and NaN > 1 are
  // both false). The sanitizer falls back to the default, and clampProgress is
  // now NaN-safe; both dismissstart/dismissmove must report a finite progress.
  const recognizer = createGestureRecognizer({ dismissDistance: NaN });
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 200, y: 100, time: 0 });
  recognizer.pointerMove({ id: 1, x: 202, y: 130, time: 16 }); // near-vertical down → dismiss
  recognizer.pointerMove({ id: 1, x: 205, y: 200, time: 32 });
  const move = log.last('dismissmove');
  assert.ok(move, 'dismiss escalated');
  assert.ok(
    Number.isFinite(move.progress) && move.progress >= 0 && move.progress <= 1,
    `progress ${move.progress} finite and in [0,1] despite dismissDistance NaN`
  );
});

test('wheel: a non-finite wheelZoomBase option does not poison factor with NaN', () => {
  // Regression: rawFactor = Math.pow(settings.wheelZoomBase, -deltaY) used the
  // raw option, so wheelZoomBase: NaN gave Math.pow(NaN, …) = NaN, which then
  // escaped Math.max/min (they do not reject NaN) and emitted factor: NaN. The
  // sanitizer coerces a non-finite base back to its default (class #1).
  const recognizer = createGestureRecognizer({ wheelZoomBase: NaN });
  const log = collect(recognizer);
  recognizer.wheel({ x: 10, y: 20, deltaY: -100 });
  const zoom = log.last('wheelzoom');
  assert.ok(zoom, 'wheelzoom still emitted');
  assert.ok(Number.isFinite(zoom.factor) && zoom.factor > 1, `factor ${zoom.factor} finite zoom-in`);
});

test('wheel: a non-positive wheelZoomBase option does not poison factor with NaN/Infinity', () => {
  // Regression: finiteOr only rejected non-finite wheelZoomBase, so a finite-but-
  // non-positive base (e.g. -1.5 or 0) passed through. wheel() computes
  // rawFactor = Math.pow(base, -deltaY), and real wheel/trackpad deltaY is
  // routinely non-integer (e.g. 53.7). Math.pow(-1.5, -53.7) === NaN and
  // Math.pow(0, -53.7) === Infinity; both escape the Math.max/min clamp (which
  // does not reject NaN/Infinity) and emit wheelzoom { factor: NaN|Infinity }.
  // The sanitizer now coerces a non-positive base back to its default (class #1).
  for (const badBase of [-1.5, 0, -0.001]) {
    const recognizer = createGestureRecognizer({ wheelZoomBase: badBase });
    const log = collect(recognizer);
    // A non-integer deltaY is what real trackpads produce and what triggers the bug.
    recognizer.wheel({ x: 10, y: 20, deltaY: 53.7 });
    recognizer.wheel({ x: 10, y: 20, deltaY: -53.7 });
    for (const zoom of log) {
      assert.ok(
        Number.isFinite(zoom.payload.factor),
        `factor ${zoom.payload.factor} finite despite wheelZoomBase ${badBase}`
      );
    }
    assert.ok(log.length > 0, `wheelzoom still emitted for base ${badBase}`);
  }
});

test('attach/detach: detaching mid-gesture releases an outstanding pointer capture (no dangling capture)', () => {
  // Regression: handlePointerDown called setPointerCapture but the only matching
  // release was in handlePointerUp. If the consumer detaches while a finger is
  // still down (surface change / unmount mid-gesture), the capture set on the
  // element was left dangling — the listeners were gone but the element still
  // held the capture. detach() now releases every still-captured pointer id.
  // attach() is normally DOM-only; here we drive it with a minimal fake element.
  const events = {};
  const captured = new Set();
  const released = [];
  const fakeElement = {
    addEventListener: (name, handler) => { events[name] = handler; },
    removeEventListener: (name) => { delete events[name]; },
    setPointerCapture: (id) => { captured.add(id); },
    releasePointerCapture: (id) => { captured.delete(id); released.push(id); },
  };
  const recognizer = createGestureRecognizer();
  const detach = recognizer.attach(fakeElement);

  // A finger presses (capture taken) and never lifts before detach.
  events.pointerdown({ pointerId: 7, clientX: 100, clientY: 100, timeStamp: 0 });
  assert.ok(captured.has(7), 'pointerdown captured the pointer');

  detach(); // mid-gesture teardown
  assert.ok(!captured.has(7), 'detach released the outstanding capture');
  assert.deepEqual(released, [7], 'detach released exactly the still-captured pointer id');

  // And detach must still unwire every listener.
  assert.deepEqual(Object.keys(events), [], 'detach removed all listeners');
});

test('attach/detach: pointerup releases capture so detach has nothing left to release', () => {
  // Guard the bookkeeping: a normal down→up cycle releases the capture on up, so
  // a later detach must NOT double-release a pointer the browser already freed.
  const events = {};
  const released = [];
  const fakeElement = {
    addEventListener: (name, handler) => { events[name] = handler; },
    removeEventListener: (name) => { delete events[name]; },
    setPointerCapture: () => {},
    releasePointerCapture: (id) => { released.push(id); },
  };
  const recognizer = createGestureRecognizer();
  const detach = recognizer.attach(fakeElement);
  events.pointerdown({ pointerId: 3, clientX: 100, clientY: 100, timeStamp: 0 });
  events.pointerup({ pointerId: 3, clientX: 100, clientY: 100, timeStamp: 30 });
  assert.deepEqual(released, [3], 'pointerup released the capture');
  detach();
  assert.deepEqual(released, [3], 'detach did not re-release the already-released pointer');
});

test('reset() clears in-flight gesture and double-tap memory', () => {
  const recognizer = createGestureRecognizer();
  const log = collect(recognizer);
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 0 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 30 }); // tap, records double-tap memory
  recognizer.reset();
  recognizer.pointerDown({ id: 1, x: 100, y: 100, time: 100 });
  recognizer.pointerUp({ id: 1, x: 100, y: 100, time: 130 }); // would be doubletap if memory survived
  assert.deepEqual(log.types(), ['tap', 'tap'], 'reset wiped double-tap memory');
  assert.equal(recognizer.getMode(), 'idle');
});

// ---- summary ----
console.log(`\n${passed} passed, ${failed} failed (${passed + failed} tests)`);
process.exit(failed ? 1 : 0);
