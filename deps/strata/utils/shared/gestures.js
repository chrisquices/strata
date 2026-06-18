// shared/gestures.js
// Pointer-gesture recognition with the §7 conflict-resolution rules baked in.
// A self-contained leaf module: reusable input logic, independent of any
// renderer (the image renderer is its first consumer; the future image editor
// is the second) and depending only on the shared core primitives (Emitter, Axis).
//
// The recognizer CORE is pure: it is fed normalized pointer samples
// ({ id, x, y, time }) and a zoom-state callback, and it emits RESOLVED gestures
// via an Emitter. It never touches the DOM, so the whole conflict-resolution
// state machine is unit-testable in Node by feeding synthetic event sequences.
// `attach()` is the thin DOM layer that maps real PointerEvents/WheelEvents onto
// the core — that part is browser-only and verified in the browser protocol.
//
// The decided rules (do NOT re-derive at call sites — they live here):
//   1. Zoomed in → one-finger drag is always PAN; navigate/dismiss disabled.
//   2. Not zoomed → axis decides once movement crosses threshold, then LOCKS:
//      ≤30° of horizontal → navigate; ≥60° & downward → dismiss; the diagonal
//      dead-zone (and steep-up) → the dominant axis at the crossing.
//   3. Movement past ~10px before release cancels tap → it's a drag.
//   4. Second tap within ~300ms and ~30px → double-tap. Single-tap fires
//      immediately and double-tap overrides (no 300ms delay on single-tap).
//   5. Two fingers → pinch + simultaneous two-finger pan; navigate suppressed.
//      One finger lifting mid-pinch transitions smoothly to one-finger pan.
//   6. Wheel → always zoom, anchored at the pointer. No wheel-navigate/close.
//
// Emitted events and payloads:
//   tap            { x, y }
//   doubletap      { x, y }
//   panstart       { x, y }
//   pan            { deltaX, deltaY, x, y }
//   panend         { cancelled }
//   navigatestart  { x, y }
//   navigatemove   { deltaX, total, x, y }
//   navigateend    { total, velocityX, direction: 'next'|'previous', willNavigate, cancelled }
//   dismissstart   { x, y }
//   dismissmove    { deltaY, total, progress, x, y }
//   dismissend     { total, velocityY, willDismiss, cancelled }
//   pinchstart     { centerX, centerY }
//   pinch          { scaleDelta, deltaX, deltaY, centerX, centerY }
//   pinchend       { } or { cancelled: true }
//   wheelzoom      { factor, x, y }
//
// Exports: { createGestureRecognizer, classifyDrag, Axis }

// Axis and the Emitter are shared, single-source core helpers.
// Axis is re-exported below so this module's public API is unchanged; Emitter is
// used internally to emit resolved gestures.
import { Emitter } from './emitter.js';
import { Axis } from './enums.js';

export { Axis };

const RADIANS_TO_DEGREES = 180 / Math.PI;

/**
 * Pure axis decision for a not-zoomed drag (rule 2). Returns Axis.HORIZONTAL
 * (→ navigate) or Axis.VERTICAL (→ dismiss). Exported for direct unit testing.
 * @param {number} deltaX  displacement x (px) since gesture start
 * @param {number} deltaY  displacement y (px), positive = downward
 * @param {number} [deadZoneDegrees=30]
 */
export function classifyDrag(deltaX, deltaY, deadZoneDegrees = 30) {
  // 0° = horizontal, 90° = vertical.
  const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * RADIANS_TO_DEGREES;
  if (angle <= deadZoneDegrees) return Axis.HORIZONTAL; // navigate
  // The vertical (dismiss) range must never overlap the horizontal (navigate)
  // range above: with a consumer-supplied deadZoneDegrees > 45 the two intervals
  // [0, dead] and [90-dead, 90] would otherwise intersect, so the same angle
  // would satisfy both verdicts (resolved only by source order). Raise the lower
  // bound to Math.max(deadZoneDegrees, 90 - deadZoneDegrees) so it always sits
  // strictly above the horizontal range and the two verdicts stay disjoint.
  const verticalLowerBound = Math.max(deadZoneDegrees, 90 - deadZoneDegrees);
  if (angle >= verticalLowerBound && deltaY > 0) return Axis.VERTICAL; // dismiss (downward only)
  // Diagonal dead-zone or steep-up: lock to the dominant axis at the crossing.
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return Axis.HORIZONTAL;
  return deltaY > 0 ? Axis.VERTICAL : Axis.HORIZONTAL;
}

const DEFAULT_SETTINGS = {
  moveThreshold: 10, // px before a press is reclassified as a drag (rules 2/3)
  doubleTapMilliseconds: 300, // double-tap time window (rule 4)
  doubleTapDistance: 30, // double-tap distance window, px (rule 4)
  axisDeadZoneDegrees: 30, // rule 2
  navigateDistance: 80, // px of horizontal travel that commits a navigate
  dismissDistance: 140, // px of downward travel that commits a dismiss
  flickVelocity: 0.5, // px/ms; a fast flick commits regardless of distance
  wheelZoomBase: 1.0015, // factor = base^(−deltaY); tuned for typical wheel deltas
  wheelZoomClamp: [0.8, 1.25], // per-event factor clamp so one notch can't leap
};

/** Keep a finite override; otherwise fall back to the default (rejects NaN/±Infinity). */
const finiteOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

/**
 * Merge consumer overrides over DEFAULT_SETTINGS, coercing every non-finite
 * numeric option back to its default. clamp()/Math.min/max and Math.pow do NOT
 * reject NaN, so an unguarded NaN bound (wheelZoomClamp), base (wheelZoomBase),
 * or distance (dismissDistance) would poison an emitted factor/progress field —
 * the same non-finite class the per-event pointer/wheel guards already block,
 * reached instead through the options object (recurring non-finite class #1).
 */
function sanitizeSettings(options) {
  const merged = { ...DEFAULT_SETTINGS, ...options };
  const [defaultMinFactor, defaultMaxFactor] = DEFAULT_SETTINGS.wheelZoomClamp;
  const [rawMinFactor, rawMaxFactor] = Array.isArray(merged.wheelZoomClamp)
    ? merged.wheelZoomClamp
    : DEFAULT_SETTINGS.wheelZoomClamp;
  return {
    ...merged,
    moveThreshold: finiteOr(merged.moveThreshold, DEFAULT_SETTINGS.moveThreshold),
    doubleTapMilliseconds: finiteOr(merged.doubleTapMilliseconds, DEFAULT_SETTINGS.doubleTapMilliseconds),
    doubleTapDistance: finiteOr(merged.doubleTapDistance, DEFAULT_SETTINGS.doubleTapDistance),
    axisDeadZoneDegrees: finiteOr(merged.axisDeadZoneDegrees, DEFAULT_SETTINGS.axisDeadZoneDegrees),
    navigateDistance: finiteOr(merged.navigateDistance, DEFAULT_SETTINGS.navigateDistance),
    dismissDistance: finiteOr(merged.dismissDistance, DEFAULT_SETTINGS.dismissDistance),
    flickVelocity: finiteOr(merged.flickVelocity, DEFAULT_SETTINGS.flickVelocity),
    // wheelZoomBase must be finite AND > 0: wheel() computes
    // Math.pow(base, -deltaY), and real wheel/trackpad deltaY is routinely
    // non-integer (e.g. 53.7). Math.pow(negativeBase, nonIntegerExponent) is
    // NaN and Math.pow(0, negativeExponent) is Infinity — both escape the
    // Math.max/min factor clamp (which does not reject NaN/Infinity) and poison
    // the emitted wheelzoom factor. finiteOr alone passes a finite-but-non-
    // positive base through, so guard the sign here too (class #1, options path).
    wheelZoomBase:
      Number.isFinite(merged.wheelZoomBase) && merged.wheelZoomBase > 0
        ? merged.wheelZoomBase
        : DEFAULT_SETTINGS.wheelZoomBase,
    wheelZoomClamp: [
      finiteOr(rawMinFactor, defaultMinFactor),
      finiteOr(rawMaxFactor, defaultMaxFactor),
    ],
  };
}

/**
 * @param {Object & Partial<typeof DEFAULT_SETTINGS>} [options]  isZoomed plus
 *   threshold overrides (merged over DEFAULT_SETTINGS).
 * @param {() => boolean} [options.isZoomed]  read at classification time (rule 1)
 */
export function createGestureRecognizer(options = {}) {
  const settings = sanitizeSettings(options);
  const isZoomed = typeof options.isZoomed === 'function' ? options.isZoomed : () => false;
  const emitter = new Emitter();

  // Active pointers, insertion-ordered (Map preserves order). We support up to
  // two for pinch; a third+ is tracked but ignored by the pinch math.
  /** @type {Map<number, {x:number, y:number, startX:number, startY:number}>} */
  const activePointers = new Map();

  let mode = 'idle'; // idle | pending | pan | navigate | dismiss | pinch
  let escalated = false; // crossed into a drag/pinch → no tap on release

  // Single-finger tracking (the "primary" pointer).
  let primaryPointerId = null;
  let lastX = 0;
  let lastY = 0;
  let lastTime = 0;
  let velocityX = 0;
  let velocityY = 0;

  // Pinch tracking (incremental).
  let previousPinchDistance = 0;
  let previousPinchCenterX = 0;
  let previousPinchCenterY = 0;

  // Double-tap memory.
  let lastTapTime = -Infinity;
  let lastTapX = 0;
  let lastTapY = 0;

  const emit = (eventName, payload) => emitter.emit(eventName, payload);

  function firstTwoPointerIds() {
    const ids = activePointers.keys();
    return [ids.next().value, ids.next().value];
  }

  /** True when this pointer is one of the two fingers driving the pinch math. */
  function isPinchFinger(pointerId) {
    const [firstId, secondId] = firstTwoPointerIds();
    return pointerId === firstId || pointerId === secondId;
  }

  function pinchCenterAndDistance() {
    const [firstId, secondId] = firstTwoPointerIds();
    const firstPointer = activePointers.get(firstId);
    const secondPointer = activePointers.get(secondId);
    return {
      centerX: (firstPointer.x + secondPointer.x) / 2,
      centerY: (firstPointer.y + secondPointer.y) / 2,
      distance: Math.hypot(firstPointer.x - secondPointer.x, firstPointer.y - secondPointer.y) || 1,
    };
  }

  function startXOfPrimary() {
    const pointer = activePointers.get(primaryPointerId);
    return pointer ? pointer.startX : lastX;
  }
  function startYOfPrimary() {
    const pointer = activePointers.get(primaryPointerId);
    return pointer ? pointer.startY : lastY;
  }

  function navigateDirectionFor(total) {
    return total < 0 ? 'next' : 'previous';
  }

  // End whatever single-finger drag is in progress (used when a 2nd finger lands
  // or on cancel). Emits the matching *end with the commit flag false.
  function endSingleFingerDrag({ cancelled }) {
    if (mode === 'pan') {
      emit('panend', { cancelled });
    } else if (mode === 'navigate') {
      const total = lastX - startXOfPrimary();
      emit('navigateend', {
        total,
        velocityX,
        direction: navigateDirectionFor(total),
        willNavigate: false,
        cancelled,
      });
    } else if (mode === 'dismiss') {
      const total = lastY - startYOfPrimary();
      emit('dismissend', { total, velocityY, willDismiss: false, cancelled });
    }
  }

  function beginPinch() {
    mode = 'pinch';
    escalated = true;
    lastTapTime = -Infinity; // an intervening pinch breaks the double-tap chain (rule 4)
    const pinch = pinchCenterAndDistance();
    previousPinchDistance = pinch.distance;
    previousPinchCenterX = pinch.centerX;
    previousPinchCenterY = pinch.centerY;
    emit('pinchstart', { centerX: pinch.centerX, centerY: pinch.centerY });
  }

  // After a pinch loses a finger (lift or cancel), continue with the remaining
  // finger as a one-finger pan — no tap, no new gesture decision (rule 5).
  // Resets velocity/last so the pan does not jump.
  function continuePinchAsPan(time) {
    const [remainingId] = activePointers.keys();
    primaryPointerId = remainingId;
    const remainingPointer = activePointers.get(remainingId);
    lastX = remainingPointer.x;
    lastY = remainingPointer.y;
    lastTime = time;
    velocityX = 0;
    velocityY = 0;
    mode = 'pan';
    escalated = true;
    emit('panstart', { x: remainingPointer.x, y: remainingPointer.y });
  }

  function resetToIdle() {
    mode = 'idle';
    escalated = false;
    primaryPointerId = null;
  }

  // The primary single-finger pointer lifted while other (non-pinch) fingers are
  // still down. The single-finger *end was already emitted, so the gesture is
  // over; re-home onto a remaining finger as a fresh drag candidate rather
  // than leaving `mode`/`primaryPointerId` stale (which would strand the live
  // finger and corrupt the next gesture). Mirrors continuePinchAsPan's discipline
  // of never sitting in a single-finger mode with a dead primary — including its
  // `escalated = true`: the re-homed finger was part of a multi-finger
  // interaction, not a deliberate press, so a stationary lift must not emit a
  // tap (which would also corrupt double-tap memory). A fresh drag still works:
  // the start re-anchoring below means crossing the move threshold escalates and
  // classifies normally.
  function rehomePrimaryAfterLift(time) {
    const [remainingId] = activePointers.keys();
    const remainingPointer = activePointers.get(remainingId);
    primaryPointerId = remainingId;
    mode = 'pending';
    escalated = true;
    lastX = remainingPointer.x;
    lastY = remainingPointer.y;
    lastTime = time;
    velocityX = 0;
    velocityY = 0;
    // The remaining finger's drag must restart from its current position, not
    // from where it first touched, so re-anchor its start to "now".
    remainingPointer.startX = remainingPointer.x;
    remainingPointer.startY = remainingPointer.y;
  }

  return {
    /** Subscribe to resolved gestures. Returns an unsubscribe function. */
    on: (eventName, handler) => emitter.on(eventName, handler),

    /** @param {{id:number, x:number, y:number, time:number}} sample */
    pointerDown(sample) {
      // A non-finite consumer/DOM coordinate or time would poison startX/startY,
      // lastX/lastY, velocity, and emitted deltas (clamp/Math.min-max and
      // Math.hypot do not reject NaN). Drop the sample, matching the wheel()
      // finite-guard and transform2d's guards on consumer input (class #1).
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.time)) return;
      activePointers.set(sample.id, {
        x: sample.x,
        y: sample.y,
        startX: sample.x,
        startY: sample.y,
      });

      if (activePointers.size === 1) {
        primaryPointerId = sample.id;
        mode = 'pending';
        escalated = false;
        lastX = sample.x;
        lastY = sample.y;
        lastTime = sample.time;
        velocityX = 0;
        velocityY = 0;
      } else if (activePointers.size >= 2 && mode !== 'pinch') {
        // A finger landed while NOT already pinching and two+ fingers are now
        // down: abandon any single-finger drag and start pinching. This is the
        // normal size 1→2 second finger, but ALSO the re-homed-pan case — a 3+
        // finger pinch that lost a pinch finger re-homes onto a survivor as a
        // one-finger 'pan' with a stray finger still tracked (map size 2, mode
        // 'pan'); a later finger then takes size 2→3, which a strict size===2
        // check would skip, stranding the user in a one-finger pan even though
        // two pinch-capable fingers are down. Keying on "not pinching and ≥2
        // fingers" upgrades that case to a pinch on the first two pointers.
        if (escalated) endSingleFingerDrag({ cancelled: true });
        beginPinch();
      }
      // While already pinching, 3rd+ pointers are tracked but do not change the
      // pinch pair (mode === 'pinch' fails the guard above).
    },

    /** @param {{id:number, x:number, y:number, time:number}} sample */
    pointerMove(sample) {
      // Non-finite x/y/time poisons velocity, stepDelta, total, and lastX/lastY
      // for the rest of the gesture (and escapes the move-threshold/axis logic,
      // since Math.hypot(NaN,NaN) < threshold is false). Drop it, matching the
      // wheel() guard and transform2d's consumer-coordinate guards (class #1).
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.time)) return;
      const pointer = activePointers.get(sample.id);
      if (!pointer) return;
      pointer.x = sample.x;
      pointer.y = sample.y;

      if (mode === 'pinch') {
        if (!isPinchFinger(sample.id)) return; // 3rd+ finger; pinch math ignores it
        const pinch = pinchCenterAndDistance();
        const scaleDelta = pinch.distance / (previousPinchDistance || 1);
        const deltaX = pinch.centerX - previousPinchCenterX;
        const deltaY = pinch.centerY - previousPinchCenterY;
        previousPinchDistance = pinch.distance;
        previousPinchCenterX = pinch.centerX;
        previousPinchCenterY = pinch.centerY;
        emit('pinch', { scaleDelta, deltaX, deltaY, centerX: pinch.centerX, centerY: pinch.centerY });
        return;
      }

      // Single-finger paths use the primary pointer only.
      if (sample.id !== primaryPointerId) return;

      const elapsed = sample.time - lastTime;
      if (elapsed > 0) {
        velocityX = (sample.x - lastX) / elapsed;
        velocityY = (sample.y - lastY) / elapsed;
      }
      const stepDeltaX = sample.x - lastX;
      const stepDeltaY = sample.y - lastY;
      lastX = sample.x;
      lastY = sample.y;
      lastTime = sample.time;

      const totalX = sample.x - pointer.startX;
      const totalY = sample.y - pointer.startY;

      if (mode === 'pending') {
        if (Math.hypot(totalX, totalY) < settings.moveThreshold) return; // still a candidate tap
        // Classify (rule 1 then rule 2).
        escalated = true;
        lastTapTime = -Infinity; // an intervening drag breaks the double-tap chain (rule 4)
        if (isZoomed()) {
          mode = 'pan';
          emit('panstart', { x: sample.x, y: sample.y });
          // Emit the STEP delta (displacement since the previous sample), not the
          // cumulative totalX/totalY: every later 'pan' frame and the sibling
          // navigate/dismiss escalation frames report the step delta, so the
          // first pan frame must too. Using totalX/totalY here would over-apply
          // any sub-threshold pre-escalation drift on frame 1 for a consumer that
          // sums pan deltas as per-frame increments.
          emit('pan', { deltaX: stepDeltaX, deltaY: stepDeltaY, x: sample.x, y: sample.y });
        } else {
          const lockedAxis = classifyDrag(totalX, totalY, settings.axisDeadZoneDegrees);
          if (lockedAxis === Axis.HORIZONTAL) {
            mode = 'navigate';
            emit('navigatestart', { x: sample.x, y: sample.y });
            emit('navigatemove', { deltaX: stepDeltaX, total: totalX, x: sample.x, y: sample.y });
          } else {
            mode = 'dismiss';
            emit('dismissstart', { x: sample.x, y: sample.y });
            emit('dismissmove', {
              deltaY: stepDeltaY,
              total: totalY,
              progress: clampProgress(totalY / settings.dismissDistance),
              x: sample.x,
              y: sample.y,
            });
          }
        }
        return;
      }

      if (mode === 'pan') {
        emit('pan', { deltaX: stepDeltaX, deltaY: stepDeltaY, x: sample.x, y: sample.y });
      } else if (mode === 'navigate') {
        emit('navigatemove', { deltaX: stepDeltaX, total: totalX, x: sample.x, y: sample.y });
      } else if (mode === 'dismiss') {
        emit('dismissmove', {
          deltaY: stepDeltaY,
          total: totalY,
          progress: clampProgress(totalY / settings.dismissDistance),
          x: sample.x,
          y: sample.y,
        });
      }
    },

    /** @param {{id:number, x:number, y:number, time:number}} sample */
    pointerUp(sample) {
      // Non-finite x/y/time poisons the emitted *end totals (sample.x/y -
      // startX/Y), the double-tap memory, and re-home anchoring. Drop it,
      // matching the wheel() and pointerDown/pointerMove finite-guards (class #1).
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.time)) return;
      const pointer = activePointers.get(sample.id);
      if (!pointer) return;

      // Pinch: one finger lifting with another remaining → transition to pan.
      if (mode === 'pinch') {
        const wasPinchFinger = isPinchFinger(sample.id);
        activePointers.delete(sample.id);
        if (!wasPinchFinger) return; // a 3rd+ finger lifted; the pinch continues
        emit('pinchend', {});
        if (activePointers.size >= 1) {
          continuePinchAsPan(sample.time);
        } else {
          // No fingers remain: clear mode, escalated, and primaryPointerId
          // together, matching the pointerCancel sibling (resetToIdle below)
          // and every other 'no fingers remain' transition. An inline
          // `mode = 'idle'` would leave escalated=true and a dangling
          // primaryPointerId pointing at the just-deleted pinch finger.
          resetToIdle();
        }
        return;
      }

      activePointers.delete(sample.id);
      if (sample.id !== primaryPointerId) return; // a non-primary finger lifted; ignore

      if (!escalated && mode === 'pending') {
        // Tap vs double-tap (rules 3/4). Movement was under threshold (else we'd
        // have escalated), so this is a tap.
        const isDoubleTap =
          sample.time - lastTapTime <= settings.doubleTapMilliseconds &&
          Math.hypot(sample.x - lastTapX, sample.y - lastTapY) <= settings.doubleTapDistance;
        if (isDoubleTap) {
          lastTapTime = -Infinity; // consume; a 3rd quick tap starts fresh
          emit('doubletap', { x: sample.x, y: sample.y });
        } else {
          lastTapTime = sample.time;
          lastTapX = sample.x;
          lastTapY = sample.y;
          emit('tap', { x: sample.x, y: sample.y }); // fires immediately; double-tap overrides
        }
      } else if (mode === 'pan') {
        emit('panend', { cancelled: false });
      } else if (mode === 'navigate') {
        const total = sample.x - pointer.startX;
        // The flick test must be directional and agree with the reported
        // `direction` (derived from `total`), mirroring the dismiss path below.
        // An undirected `Math.abs(velocityX)` would commit when the LAST move is
        // a fast reversal opposite to the cumulative travel, navigating the wrong
        // way (e.g. drag right then flick left → direction 'previous' but a
        // leftward flick). Requiring sign agreement keeps commit and direction
        // consistent.
        const willNavigate =
          Math.abs(total) > settings.navigateDistance ||
          (Math.abs(velocityX) > settings.flickVelocity &&
            Math.sign(velocityX) === Math.sign(total));
        emit('navigateend', {
          total,
          velocityX,
          direction: navigateDirectionFor(total),
          willNavigate,
          cancelled: false,
        });
      } else if (mode === 'dismiss') {
        const total = sample.y - pointer.startY;
        const willDismiss =
          total > settings.dismissDistance ||
          (velocityY > settings.flickVelocity && total > 0);
        emit('dismissend', { total, velocityY, willDismiss, cancelled: false });
      }

      // The primary lifted (non-primary fingers returned early above). If other
      // fingers remain, re-home onto one as a fresh candidate; otherwise idle.
      // A size-only reset would strand the live finger and leave a dead primary.
      if (activePointers.size === 0) {
        resetToIdle();
      } else {
        rehomePrimaryAfterLift(sample.time);
      }
    },

    /** @param {{id:number, x:number, y:number, time:number}} sample */
    pointerCancel(sample) {
      // Non-finite sample.time flows through continuePinchAsPan/rehomePrimaryAfterLift
      // into lastTime, poisoning the next
      // pointerMove's `elapsed = sample.time - lastTime` so velocityX/Y stay stuck
      // at 0 and a fast flick can never commit. Drop it, matching the
      // pointerDown/pointerMove/pointerUp finite-guards (class #1).
      if (!Number.isFinite(sample.x) || !Number.isFinite(sample.y) || !Number.isFinite(sample.time)) return;
      if (!activePointers.has(sample.id)) return;

      if (mode === 'pinch') {
        const wasPinchFinger = isPinchFinger(sample.id);
        activePointers.delete(sample.id);
        if (!wasPinchFinger) return; // a 3rd+ finger cancelled; the pinch continues
        emit('pinchend', { cancelled: true });
        // Mirror pointerUp: continue as a pan with the remaining finger, so the
        // recognizer never sits in pinch mode with fewer than two fingers
        // (that used to crash the next pointerMove).
        if (activePointers.size >= 1) {
          continuePinchAsPan(sample.time);
        } else {
          resetToIdle();
        }
        return;
      }

      // Single-finger modes: only the primary pointer's cancel ends the drag.
      // A stray extra finger cancelling must not end the primary's gesture.
      if (sample.id === primaryPointerId) {
        if (escalated) endSingleFingerDrag({ cancelled: true });
        activePointers.delete(sample.id);
        // Mirror pointerUp: the single-finger *end was emitted, so the gesture is
        // over. If other fingers remain (e.g. a 3-finger pinch that re-homed onto
        // one finger then had its primary cancelled), re-home onto a remaining
        // one as a fresh candidate; otherwise idle. A size-only reset would
        // strand the live finger with a dead primary, so its moves are ignored.
        if (activePointers.size === 0) {
          resetToIdle();
        } else {
          rehomePrimaryAfterLift(sample.time);
        }
        return;
      }

      activePointers.delete(sample.id);
      if (activePointers.size === 0) resetToIdle();
    },

    /**
     * Wheel → zoom, anchored at the pointer (rule 6). deltaY < 0 zooms in.
     * @param {{x:number, y:number, deltaY:number}} wheelSample
     */
    wheel(wheelSample) {
      // A non-finite deltaY would make rawFactor NaN, which escapes the
      // Math.max/min clamp below (Math.min/max do not reject NaN) and emit
      // wheelzoom { factor: NaN }. A non-finite x/y would emit a NaN zoom
      // anchor. Drop the event instead, guarding x/y/deltaY together to match
      // the pointer handlers' finite-guards (rule 6 clamp intent, class #1).
      if (!Number.isFinite(wheelSample.deltaY) || !Number.isFinite(wheelSample.x) || !Number.isFinite(wheelSample.y)) return;
      const rawFactor = Math.pow(settings.wheelZoomBase, -wheelSample.deltaY);
      const [minFactor, maxFactor] = settings.wheelZoomClamp;
      const factor = Math.max(minFactor, Math.min(maxFactor, rawFactor));
      emit('wheelzoom', { factor, x: wheelSample.x, y: wheelSample.y });
    },

    /** Clear all in-flight state (call on unmount / surface change). */
    reset() {
      activePointers.clear();
      resetToIdle();
      lastTapTime = -Infinity;
    },

    /** Current internal mode — exposed for tests/diagnostics. */
    getMode() {
      return mode;
    },

    /**
     * DOM binding (browser-only): wire real PointerEvents/WheelEvents on
     * `element` onto the core. The consumer should set `touch-action: none` on
     * the element so the browser doesn't claim the gesture for scrolling.
     * Returns a detach function.
     *
     * Not exercised by the Node tests — the core above is. This is intentionally
     * the only DOM-touching function in the module, and it touches nothing at
     * module scope.
     */
    attach(element) {
      // Pointer ids whose capture this element currently holds, so detach() can
      // release any still-outstanding capture symmetrically (see below).
      const capturedPointerIds = new Set();
      const normalizePointerEvent = (event) => ({
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        time: event.timeStamp,
      });
      const handlePointerDown = (event) => {
        element.setPointerCapture?.(event.pointerId);
        capturedPointerIds.add(event.pointerId);
        this.pointerDown(normalizePointerEvent(event));
      };
      const handlePointerMove = (event) => this.pointerMove(normalizePointerEvent(event));
      const handlePointerUp = (event) => {
        this.pointerUp(normalizePointerEvent(event));
        element.releasePointerCapture?.(event.pointerId);
        capturedPointerIds.delete(event.pointerId);
      };
      const handlePointerCancel = (event) => {
        // The Pointer Events spec implicitly releases the capture on
        // pointercancel, so only drop our bookkeeping here.
        capturedPointerIds.delete(event.pointerId);
        this.pointerCancel(normalizePointerEvent(event));
      };
      const handleWheel = (event) => {
        event.preventDefault(); // we own the wheel here (zoom), don't scroll the page
        this.wheel({ x: event.clientX, y: event.clientY, deltaY: event.deltaY });
      };
      element.addEventListener('pointerdown', handlePointerDown);
      element.addEventListener('pointermove', handlePointerMove);
      element.addEventListener('pointerup', handlePointerUp);
      element.addEventListener('pointercancel', handlePointerCancel);
      element.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        // Releasing the capture is the one setup here that pointerup undoes but
        // the spec does not auto-clean on detach: if the consumer detaches
        // mid-gesture (surface change / unmount while a finger is down), the
        // setPointerCapture set in handlePointerDown would otherwise dangle on
        // the element. Release every still-captured id before unwiring so detach
        // is symmetric with attach across all exit paths.
        for (const pointerId of capturedPointerIds) {
          element.releasePointerCapture?.(pointerId);
        }
        capturedPointerIds.clear();
        element.removeEventListener('pointerdown', handlePointerDown);
        element.removeEventListener('pointermove', handlePointerMove);
        element.removeEventListener('pointerup', handlePointerUp);
        element.removeEventListener('pointercancel', handlePointerCancel);
        element.removeEventListener('wheel', handleWheel);
      };
    },
  };
}

/** Clamp a dismiss progress ratio into [0, 1]. The `!(ratio > 0)` form rejects
 *  NaN and <=0 together so a non-finite ratio can never fall through (class #1). */
function clampProgress(ratio) {
  if (!(ratio > 0)) return 0;
  if (ratio > 1) return 1;
  return ratio;
}
