// toast-engine.js
// A headless toast / notification engine.
//
// The engine owns the *logic* of transient notifications — the queue, lifecycle,
// timers, stacking order, position grouping, overflow, dedup and promise wiring —
// and emits that state. It renders nothing: no DOM, no CSS, no default toast UI.
// The consumer reads the emitted state and paints every visible toast, positions
// the containers, and runs all enter/exit animations.
//
// Three ideas keep it honest:
//   1. State out, paint in. getState() returns the toasts grouped by position,
//      each with its phase and live remaining time; subscribe()/onChange push the
//      same snapshot on every change. The engine never touches a toast's element.
//   2. The consumer owns animation; the engine owns timing. It emits lifecycle
//      phases (entering -> visible -> exiting) and *when* they change. Exit is a
//      handshake: the engine marks a toast `exiting` and waits for the consumer's
//      remove() (its animation finished) OR a fallback timeout — whichever comes
//      first — so an exit animation is possible but never required, and a toast
//      can't get wedged in `exiting`.
//   3. Dependency-free and DOM-optional. The only DOM it ever touches is pausing
//      on tab-blur (document.visibilitychange) and reading prefers-reduced-motion,
//      both behind capability checks inside methods — never at module scope. The
//      pure queue/timer core runs headless (Node, SSR) with no `document`.
//
// Testability hinges on an injectable clock: createToaster({ clock }) takes
// { now(), setTimeout(fn,ms)->id, clearTimeout(id) } (defaulting to the real one),
// so a fake clock makes every timer deterministic without real waiting.
//
// Shared primitives live in ../shared/*. This file imports only Emitter from there.
//
// Exports: { createToaster, defaultClock, ToastType, ToastPhase, Position, Order, Overflow }

import { Emitter } from '../shared/emitter.js';

// ============================================================================
// Enums (engine-specific; cross-module shared enums live in shared/enums.js).
// Frozen so a typo is a missing-property error, not a silent string mismatch.
// ============================================================================

/** Severity tag, passed through untouched — it implies nothing about appearance. */
export const ToastType = Object.freeze({
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  LOADING: 'loading',
});

/**
 * Lifecycle phase the engine emits and the consumer animates.
 *   QUEUED   — held back by the max-visible cap (overflow:queue); not yet shown.
 *   ENTERING — just added/promoted; consumer plays the enter animation.
 *   VISIBLE  — settled; the auto-dismiss timer runs here (unless sticky).
 *   EXITING  — leaving; consumer plays the exit animation, then calls remove().
 */
export const ToastPhase = Object.freeze({
  QUEUED: 'queued',
  ENTERING: 'entering',
  VISIBLE: 'visible',
  EXITING: 'exiting',
});

/** Position groups. The engine groups + orders; the consumer positions the box. */
export const Position = Object.freeze({
  TOP_LEFT: 'top-left',
  TOP_CENTER: 'top-center',
  TOP_RIGHT: 'top-right',
  BOTTOM_LEFT: 'bottom-left',
  BOTTOM_CENTER: 'bottom-center',
  BOTTOM_RIGHT: 'bottom-right',
});

/** Order within a group. */
export const Order = Object.freeze({
  NEWEST_FIRST: 'newest-first',
  NEWEST_LAST: 'newest-last',
});

/** What happens when a group is at its max-visible cap. */
export const Overflow = Object.freeze({
  QUEUE: 'queue', // extra toasts wait; promote as visible ones leave
  EVICT: 'evict', // adding past the cap begins exit on the oldest (newest always shows)
});

// Canonical group order for stable emission; custom positions append after these.
const POSITION_ORDER = [
  Position.TOP_LEFT, Position.TOP_CENTER, Position.TOP_RIGHT,
  Position.BOTTOM_LEFT, Position.BOTTOM_CENTER, Position.BOTTOM_RIGHT,
];

// ============================================================================
// Clock
// ============================================================================

/**
 * The default real clock. Uses a monotonic `now` (performance.now when present,
 * else Date.now) for elapsed-time math, and the global timer functions for
 * scheduling. None of these are DOM — this works in Node and the browser. Built
 * lazily inside a call, never at module scope.
 * @returns {{ now: () => number, setTimeout: (handler: Function, milliseconds: number) => any, clearTimeout: (id: any) => void }}
 */
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

/** A finite, strictly-positive duration drives a timer; everything else is sticky. */
function isSticky(duration) {
  return !(typeof duration === 'number' && duration > 0 && Number.isFinite(duration));
}

/**
 * A single auto-dismiss countdown. The one piece worth getting exactly right:
 * pause/resume must preserve the *remaining* time (resuming a 5s toast paused at
 * 3s continues for 2s, not a fresh 5s). It tracks remaining against the injected
 * clock and reschedules from that remaining on resume.
 */
class Countdown {
  /**
   * @param {{ now: () => number, setTimeout: Function, clearTimeout: Function }} clock
   * @param {number} duration  ms; <=0 or Infinity means sticky (never fires)
   * @param {() => void} onElapsed
   */
  constructor(clock, duration, onElapsed) {
    this._clock = clock;
    this._duration = duration;
    this._onElapsed = onElapsed;
    this._remaining = duration;
    this._deadline = 0; // clock time the timer is set to fire (while running)
    this._timerId = null;
    this._running = false;
  }

  get _hasFiniteDuration() {
    return !isSticky(this._duration);
  }

  /**
   * Begin counting from the full duration. Clears any timer already pending —
   * restarting a running countdown must not leave the old timer alive (that
   * used to fire at the stale, earlier deadline and dismiss the toast early).
   */
  start() {
    this.clear();
    this._remaining = this._duration;
    if (this._hasFiniteDuration) this._schedule();
  }

  _schedule() {
    if (!this._hasFiniteDuration || this._remaining <= 0) return;
    this._deadline = this._clock.now() + this._remaining;
    this._running = true;
    this._timerId = this._clock.setTimeout(() => {
      this._timerId = null;
      this._running = false;
      this._remaining = 0;
      this._onElapsed();
    }, this._remaining);
  }

  /** Freeze the remaining time and stop the underlying timer. */
  pause() {
    if (!this._running) return;
    this._remaining = Math.max(0, this._deadline - this._clock.now());
    if (this._timerId != null) this._clock.clearTimeout(this._timerId);
    this._timerId = null;
    this._running = false;
  }

  /** Continue for the remaining time (no-op if sticky or already running). */
  resume() {
    if (this._running || !this._hasFiniteDuration) return;
    if (this._remaining > 0) {
      this._schedule();
    } else {
      // A non-positive remaining means the countdown fully elapsed while paused
      // (pause() can freeze _remaining to exactly 0 when the clock has already
      // reached/passed the deadline before the auto-dismiss timer fired — a real
      // timer can fire late, so now() may be >= deadline at pause time). Such a
      // toast must elapse on resume, not be silently dropped and wedged VISIBLE
      // forever. Schedule a 0ms timer so the dismiss still flows through the
      // normal _onElapsed callback (keeping _running/_remaining bookkeeping correct).
      this._remaining = 0;
      this._deadline = this._clock.now();
      this._running = true;
      this._timerId = this._clock.setTimeout(() => {
        this._timerId = null;
        this._running = false;
        this._remaining = 0;
        this._onElapsed();
      }, 0);
    }
  }

  /** Live remaining ms (Infinity for sticky). */
  remaining() {
    if (!this._hasFiniteDuration) return Infinity;
    if (this._running) return Math.max(0, this._deadline - this._clock.now());
    return this._remaining;
  }

  clear() {
    if (this._timerId != null) this._clock.clearTimeout(this._timerId);
    this._timerId = null;
    this._running = false;
  }
}

// ============================================================================
// Types (erased at runtime; for editors and humans)
// ============================================================================

/**
 * @typedef {Object} Toast  the emitted, read-only view of a toast
 * @property {string} id
 * @property {*} content              opaque to the engine; the consumer renders it
 * @property {string} type            info|success|warning|error|loading|custom
 * @property {string} position        a Position group key
 * @property {string} phase           a ToastPhase (queued ones are not in group.toasts)
 * @property {number} duration        resolved ms; <=0 (incl. negative) or non-finite = sticky
 * @property {number} remaining       live ms remaining (Infinity if sticky, 0 while exiting)
 * @property {boolean} sticky         true when duration is <=0 or not finite (no auto-dismiss timer)
 * @property {boolean} paused         an auto-dismiss pause is in effect (hover/tab/manual)
 * @property {number} createdAt
 * @property {number} updatedAt
 * @property {*} data                 arbitrary consumer data carried through
 * @property {('polite'|'assertive')} ariaLive  suggested live-region politeness
 * @property {('status'|'alert')} role          suggested ARIA role
 * @property {number} count           >=1; >1 when identical content was collapsed
 * @property {number} index           display index within its group (0 = front)
 */

/**
 * @typedef {Object} ToasterState
 * @property {Array<{ position: string, toasts: Toast[], queued: number, count: number }>} groups
 *           non-empty groups in canonical order, each with its display-ordered toasts
 *           and the count of queued (overflow) toasts behind the cap
 * @property {Toast[]} toasts         flat list of every visible toast across groups
 * @property {boolean} reduceMotion   prefers-reduced-motion is active (skip animation)
 * @property {Object} config          the resolved configuration (spacing hints, etc.)
 */

// ============================================================================
// createToaster
// ============================================================================

/**
 * Create a headless toaster instance.
 *
 * @param {Object} [options]
 * @param {string} [options.position='top-right']     default position group
 * @param {number} [options.duration=4000]            default auto-dismiss ms (non-error)
 * @param {number} [options.errorDuration=0]          default ms for error toasts (0 = sticky)
 * @param {number} [options.max=3]                    max visible per group (>=1)
 * @param {string} [options.order='newest-first']     order within a group
 * @param {string} [options.overflow='queue']         'queue' or 'evict' past the cap
 * @param {number} [options.gap=12]                   spacing hint emitted for the consumer
 * @param {boolean} [options.pauseOnHover=true]       hint: consumer should pause on hover
 * @param {boolean} [options.pauseOnTabBlur=true]     pause running timers while the tab is hidden
 * @param {boolean} [options.reverseExitOrder=false]  dismissAll exits oldest-first by default; set true to exit newest-first
 * @param {number} [options.enterDuration=200]        ms in `entering` before `visible`
 * @param {number} [options.exitTimeout=1000]         fallback ms to remove after `exiting`
 * @param {boolean} [options.dedupById=true]          a re-used id updates in place
 * @param {boolean} [options.collapseDuplicates=false] collapse identical content (count++)
 * @param {boolean} [options.reduceMotion]            force the reduced-motion flag (else detected)
 * @param {Object} [options.clock]                    injectable { now, setTimeout, clearTimeout }
 * @param {(state: ToasterState) => void} [options.onChange]  called with state on every change
 * @returns {Object} the toaster instance
 */
export function createToaster(options = {}) {
  const config = {
    position: options.position || Position.TOP_RIGHT,
    // Guard like the other numeric options (max/gap/enterDuration/exitTimeout):
    // a non-finite duration is re-broadcast in every state via `config: {...config}`
    // and reaches the public `duration` field through resolveDuration(), so a
    // consumer computing dismiss progress `(duration - remaining) / duration`
    // would get NaN. Negatives are fine — they resolve as sticky via isSticky().
    duration: Number.isFinite(options.duration) ? options.duration : 4000,
    errorDuration: Number.isFinite(options.errorDuration) ? options.errorDuration : 0,
    max: (() => {
      // A non-finite max (NaN/Infinity from a consumer) would poison every cap
      // comparison — `n < NaN` is always false, so every toast would be stuck
      // QUEUED forever and the promotion loop would never run. Reject non-finite
      // and <=0 with the `!(m > 0)` form (rejects NaN and <=0 together), keeping
      // the default 3.
      const m = options.max != null ? options.max : 3;
      return !(m > 0) || !Number.isFinite(m) ? 3 : Math.max(1, m);
    })(),
    order: options.order || Order.NEWEST_FIRST,
    overflow: options.overflow || Overflow.QUEUE,
    // gap is an emitted layout hint (re-broadcast in every state via config),
    // not internal loop/timer state, so a non-finite value only poisons consumer
    // layout math (e.g. translateY = index * gap -> NaN). Guard it like the other
    // numeric options so config.gap is always finite.
    gap: Number.isFinite(options.gap) ? options.gap : 12,
    pauseOnHover: options.pauseOnHover !== false,
    pauseOnTabBlur: options.pauseOnTabBlur !== false,
    reverseExitOrder: !!options.reverseExitOrder,
    // Like `max`, these feed clock.setTimeout directly (the enter timer in
    // enter(), the exit timer in beginExit()). A non-finite delay from a consumer poisons a faithful
    // injected clock: Infinity schedules a timer that never fires (toast wedged
    // forever in `entering`/`exiting`), NaN coerces to a 0-delay timer. The real
    // host setTimeout masks this (clamps Infinity to 1ms, NaN to 0), but a
    // deterministic clock honors the delay and hangs. Reject NaN/Infinity and
    // negatives back to the default with a finite-guard, mirroring `max`.
    enterDuration: Number.isFinite(options.enterDuration) && options.enterDuration >= 0 ? options.enterDuration : 200,
    exitTimeout: Number.isFinite(options.exitTimeout) && options.exitTimeout >= 0 ? options.exitTimeout : 1000,
    dedupById: options.dedupById !== false,
    collapseDuplicates: !!options.collapseDuplicates,
  };

  // Unknown enum values must throw, not silently fall back to a sibling mode:
  // order:'oldest-first' would otherwise behave as NEWEST_LAST and overflow:'drop'
  // as QUEUE (both compared by identity downstream). Validate against the frozen
  // enums, mirroring the other engines (transform2d/selection/color throw on
  // unknown enum inputs). `position` is deliberately exempt — custom keys are
  // appended at buildState() — so it has no allowlist here.
  if (options.order != null && !Object.values(Order).includes(config.order)) {
    throw new TypeError(`Unknown order: ${config.order}`);
  }
  if (options.overflow != null && !Object.values(Overflow).includes(config.overflow)) {
    throw new TypeError(`Unknown overflow: ${config.overflow}`);
  }

  const clock = options.clock || defaultClock();
  const emitter = new Emitter();
  const onChange = typeof options.onChange === 'function' ? options.onChange : null;

  /** @type {Map<string, Object>} id -> internal record */
  const records = new Map();
  /** @type {Map<string, string[]>} position -> ids in insertion order (oldest first) */
  const idsByPosition = new Map();
  let idSequence = 0;
  let destroyed = false;

  let reduceMotion = options.reduceMotion != null ? !!options.reduceMotion : false;
  let tabHidden = false; // mirror of document.hidden while pauseOnTabBlur is wired
  let detachVisibilityListener = null; // teardown for the visibilitychange listener
  let detachReducedMotionListener = null; // teardown for the reduced-motion media-query listener

  // ---- small helpers ------------------------------------------------------

  const { QUEUED, ENTERING, VISIBLE, EXITING } = ToastPhase;

  function getOrCreateGroupIds(position) {
    let ids = idsByPosition.get(position);
    if (!ids) {
      ids = [];
      idsByPosition.set(position, ids);
    }
    return ids;
  }

  /** Suggested ARIA politeness: errors/warnings are assertive, the rest polite. */
  function ariaSuggestionsFor(type, toastOptions) {
    if (toastOptions.ariaLive || toastOptions.role) {
      const ariaLive =
        toastOptions.ariaLive || (toastOptions.role === 'alert' ? 'assertive' : 'polite');
      const role = toastOptions.role || (ariaLive === 'assertive' ? 'alert' : 'status');
      return { ariaLive, role };
    }
    const assertive = type === ToastType.ERROR || type === ToastType.WARNING;
    return assertive
      ? { ariaLive: 'assertive', role: 'alert' }
      : { ariaLive: 'polite', role: 'status' };
  }

  /**
   * Resolve a toast's duration. An explicit value (including 0/Infinity) always
   * wins; otherwise loading and error default to sticky (errors auto-hiding
   * before they're read is a common a11y complaint), everything else to the
   * default duration.
   */
  function resolveDuration(type, explicitDuration) {
    // An explicit value wins, but finite-guard it first: a non-finite duration
    // (NaN/Infinity) would land in record.duration and emit as the public
    // `duration` field, producing the contradictory { duration, sticky, remaining }
    // triple and NaN dismiss-progress for consumers. Map a bad value to 0, which
    // keeps the intended sticky semantics via isSticky() without emitting NaN/Infinity.
    if (explicitDuration !== undefined && explicitDuration !== null) {
      return Number.isFinite(explicitDuration) ? explicitDuration : 0;
    }
    if (type === ToastType.LOADING) return 0;
    if (type === ToastType.ERROR) return config.errorDuration;
    return config.duration;
  }

  /** Count of toasts occupying a visible slot (entering or visible). */
  function activeSlotCount(position) {
    const ids = idsByPosition.get(position);
    if (!ids) return 0;
    let activeCount = 0;
    for (const id of ids) {
      const record = records.get(id);
      if (record && (record.phase === ENTERING || record.phase === VISIBLE)) activeCount++;
    }
    return activeCount;
  }

  /** Oldest toast still occupying a slot (insertion order) — the eviction target. */
  function oldestActiveId(position) {
    const ids = idsByPosition.get(position);
    if (!ids) return null;
    for (const id of ids) {
      const record = records.get(id);
      if (record && (record.phase === ENTERING || record.phase === VISIBLE)) return id;
    }
    return null;
  }

  function clearTimers(record) {
    if (record.enterTimer != null) {
      clock.clearTimeout(record.enterTimer);
      record.enterTimer = null;
    }
    if (record.exitTimer != null) {
      clock.clearTimeout(record.exitTimer);
      record.exitTimer = null;
    }
    if (record.countdown) record.countdown.clear();
  }

  // ---- lifecycle transitions (none of these notify; callers do) -----------

  /** queued/new -> entering; schedule the settle to `visible`. */
  function enter(record) {
    // Clear any enter timer already pending so a second enter() (e.g. the EVICT
    // path, where beginExit -> fillFromQueue may have already promoted this very
    // record before add() calls enter() again) doesn't orphan the first timer —
    // overwriting record.enterTimer would leave the old one uncancelable. Mirrors
    // the Countdown.start() fix.
    if (record.enterTimer != null) clock.clearTimeout(record.enterTimer);
    record.phase = ENTERING;
    const enterMilliseconds = reduceMotion ? 0 : config.enterDuration;
    record.enterTimer = clock.setTimeout(() => {
      record.enterTimer = null;
      if (record.phase !== ENTERING) return; // dismissed/removed mid-enter
      becomeVisible(record);
      notify();
    }, enterMilliseconds);
  }

  /** entering -> visible; start the auto-dismiss countdown (honoring any pause). */
  function becomeVisible(record) {
    record.phase = VISIBLE;
    // A toast that goes visible while the tab is already hidden must begin
    // paused — handleVisibilityChange only touches records that existed at the
    // blur event, so a toast created/promoted later would otherwise run its
    // full countdown and expire on a backgrounded tab (contradicting
    // pauseOnTabBlur). Apply the 'tab' reason from the live visibility state.
    if (tabHidden && !record.pauseReasons.has('tab')) record.pauseReasons.add('tab');
    record.countdown = new Countdown(clock, record.duration, () => {
      beginExit(record);
      notify();
    });
    record.countdown.start();
    if (record.pauseReasons.size > 0) record.countdown.pause();
  }

  /**
   * Begin a toast's exit. Sets `exiting` and starts the fallback removal timer;
   * actual removal happens on the consumer's remove() or this timeout, whichever
   * is first. A queued toast was never shown, so it's just dropped. Freeing a
   * visible slot pulls the next queued toast in.
   */
  function beginExit(record) {
    if (record.phase === EXITING) return;
    if (record.phase === QUEUED) {
      hardRemove(record.id, false);
      return;
    }
    if (record.enterTimer != null) {
      clock.clearTimeout(record.enterTimer);
      record.enterTimer = null;
    }
    if (record.countdown) record.countdown.clear();
    record.phase = EXITING;
    record.updatedAt = clock.now();
    const exitMilliseconds = reduceMotion ? 0 : config.exitTimeout;
    record.exitTimer = clock.setTimeout(() => {
      record.exitTimer = null;
      hardRemove(record.id, true);
      notify();
    }, exitMilliseconds);
    fillFromQueue(record.position);
  }

  /** Drop a toast immediately (no exit phase). Optionally pull in a queued toast. */
  function hardRemove(id, promote) {
    const record = records.get(id);
    if (!record) return;
    clearTimers(record);
    records.delete(id);
    const ids = idsByPosition.get(record.position);
    if (ids) {
      const index = ids.indexOf(id);
      if (index >= 0) ids.splice(index, 1);
      if (ids.length === 0) idsByPosition.delete(record.position);
    }
    if (promote) fillFromQueue(record.position);
  }

  /** Promote queued toasts (oldest first) into `entering` while a slot is free. */
  function fillFromQueue(position) {
    const ids = idsByPosition.get(position);
    if (!ids) return;
    while (activeSlotCount(position) < config.max) {
      const queuedId = ids.find((id) => records.get(id)?.phase === QUEUED);
      if (!queuedId) break;
      enter(records.get(queuedId));
    }
  }

  // ---- pause/resume by reason ---------------------------------------------
  // Multiple independent reasons (hover, tab, manual) can hold a toast paused;
  // it resumes only when the last is lifted. Keeps hover + tab-blur from
  // stepping on each other.

  function pauseRecord(record, reason) {
    record.pauseReasons.add(reason);
    if (record.countdown) record.countdown.pause();
  }

  function resumeRecord(record, reason) {
    record.pauseReasons.delete(reason);
    if (record.pauseReasons.size === 0 && record.countdown && record.phase === VISIBLE) {
      record.countdown.resume();
    }
  }

  // ---- state emission -----------------------------------------------------

  function recordsInDisplayOrder(position) {
    const ids = idsByPosition.get(position) || [];
    const visibleRecords = [];
    for (const id of ids) {
      const record = records.get(id);
      if (record && record.phase !== QUEUED) visibleRecords.push(record);
    }
    // Insertion order is oldest -> newest; newest-first reverses it.
    return config.order === Order.NEWEST_FIRST ? visibleRecords.reverse() : visibleRecords;
  }

  function toPublicToast(record, index) {
    let remaining;
    if (record.phase === EXITING) remaining = 0;
    else if (record.countdown) remaining = record.countdown.remaining();
    else remaining = isSticky(record.duration) ? Infinity : record.duration; // entering: not started yet
    return {
      id: record.id,
      content: record.content,
      type: record.type,
      position: record.position,
      phase: record.phase,
      duration: record.duration,
      remaining,
      sticky: isSticky(record.duration),
      // `paused` means a live auto-dismiss countdown is held — only VISIBLE
      // toasts have one. pauseRecord() adds a reason to any record (incl. an
      // exiting one whose countdown was already cleared in beginExit), so gate
      // the public flag on VISIBLE; otherwise an exiting toast (remaining: 0)
      // could contradictorily report paused: true.
      paused: record.phase === VISIBLE && record.pauseReasons.size > 0,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      data: record.data,
      ariaLive: record.ariaLive,
      role: record.role,
      count: record.count,
      index,
    };
  }

  function buildState() {
    const positions = [...new Set([...POSITION_ORDER, ...idsByPosition.keys()])];
    const groupsForState = [];
    const flatToasts = [];
    for (const position of positions) {
      if (!idsByPosition.has(position)) continue;
      const displayRecords = recordsInDisplayOrder(position);
      const ids = idsByPosition.get(position) || [];
      let queuedCount = 0;
      for (const id of ids) {
        if (records.get(id)?.phase === QUEUED) queuedCount++;
      }
      if (displayRecords.length === 0 && queuedCount === 0) continue;
      const toasts = displayRecords.map((record, index) => toPublicToast(record, index));
      groupsForState.push({
        position,
        toasts,
        queued: queuedCount,
        count: toasts.length + queuedCount,
      });
      flatToasts.push(...toasts);
    }
    return { groups: groupsForState, toasts: flatToasts, reduceMotion, config: { ...config } };
  }

  function notify() {
    if (destroyed) return;
    const state = buildState();
    emitter.emit('change', state);
    if (onChange) onChange(state);
  }

  // ---- add / update (the create paths) ------------------------------------

  function add(content, toastOptions) {
    if (destroyed) return undefined;
    const type = toastOptions.type || ToastType.INFO;
    const position = toastOptions.position || config.position;

    // Identity: with dedupById (default), a re-used id updates in place instead of
    // stacking a duplicate. With it off, a colliding id can't become the map key, so
    // we fall through and mint a fresh id below rather than clobber the existing one.
    if (config.dedupById && toastOptions.id != null && records.has(String(toastOptions.id))) {
      updateToast(String(toastOptions.id), content, toastOptions);
      return String(toastOptions.id);
    }

    // Optional content-based dedup: collapse identical content into one (count++).
    // `collapse: false` lets a caller opt a record out of this (e.g. promiseToast,
    // where collapsing two concurrent loading toasts would let one promise's async
    // resolution clobber the other's shared record).
    if (config.collapseDuplicates && toastOptions.id == null && toastOptions.collapse !== false) {
      const dedupKey = toastOptions.dedupKey != null ? toastOptions.dedupKey : content;
      for (const record of records.values()) {
        if (record.position !== position) continue;
        if (record.phase === EXITING || record.phase === QUEUED) continue;
        const isSame =
          record.dedupKey != null ? record.dedupKey === dedupKey : record.content === content;
        if (isSame) {
          record.count += 1;
          record.updatedAt = clock.now();
          if (record.countdown) {
            record.countdown.start(); // refresh the auto-dismiss from the full duration
            if (record.pauseReasons.size) record.countdown.pause();
          }
          notify();
          return record.id;
        }
      }
    }

    // Honor a supplied id only if free; otherwise (collision with dedup off) mint one.
    const honorsExplicitId = toastOptions.id != null && !records.has(String(toastOptions.id));
    const id = honorsExplicitId ? String(toastOptions.id) : `t${++idSequence}`;
    // If a consumer supplies an explicit id matching our auto-id format `t<N>`, advance the
    // auto counter past it so a future auto id can never reuse (and silently clobber) it.
    if (honorsExplicitId) {
      const reserved = /^t(\d+)$/.exec(id);
      // Only advance past a safe integer. A very long digit string (e.g. `t999...`)
      // parses to >= 2^53 where `++idSequence` can no longer increment (float
      // precision), which would otherwise freeze the counter and make every later
      // auto-minted id identical — clobbering records and double-listing ids.
      if (reserved) {
        const n = Number(reserved[1]);
        if (Number.isSafeInteger(n)) idSequence = Math.max(idSequence, n);
      }
    }
    const aria = ariaSuggestionsFor(type, toastOptions);
    const now = clock.now();
    const record = {
      id,
      content,
      type,
      position,
      phase: QUEUED,
      duration: resolveDuration(type, toastOptions.duration),
      createdAt: now,
      updatedAt: now,
      data: toastOptions.data !== undefined ? toastOptions.data : {},
      ariaLive: aria.ariaLive,
      role: aria.role,
      count: 1,
      dedupKey: toastOptions.dedupKey != null ? toastOptions.dedupKey : null,
      pauseReasons: new Set(),
      countdown: null,
      enterTimer: null,
      exitTimer: null,
    };
    records.set(id, record);
    getOrCreateGroupIds(position).push(id);

    if (activeSlotCount(position) < config.max) {
      enter(record);
    } else if (config.overflow === Overflow.EVICT) {
      const oldestId = oldestActiveId(position);
      if (oldestId != null) beginExit(records.get(oldestId)); // frees a slot
      enter(record);
    } else {
      record.phase = QUEUED; // wait for a slot
    }

    notify();
    return id;
  }

  /**
   * Change an existing toast in place. Preserves its position/identity. By
   * default resets the auto-dismiss timer to the resolved duration (so
   * Loading -> Success gives the success toast its own fresh time); pass
   * { resetTimer: false } to keep the current remaining time. Updating a toast
   * that is already `exiting` is ignored (safer than reviving it).
   */
  function updateToast(id, content, toastOptions) {
    const record = records.get(String(id));
    if (!record || destroyed) return false;
    if (record.phase === EXITING) return false;

    if (content !== undefined) record.content = content;
    if (toastOptions.type) {
      record.type = toastOptions.type;
      const aria = ariaSuggestionsFor(toastOptions.type, toastOptions);
      record.ariaLive = aria.ariaLive;
      record.role = aria.role;
    } else if (toastOptions.ariaLive || toastOptions.role) {
      // Mirror the add path: when only one of ariaLive/role is supplied, derive
      // the missing partner via ariaSuggestionsFor instead of applying each field
      // independently (which left a contradictory pair, e.g. ariaLive:'assertive'
      // alongside a stale role:'status').
      const aria = ariaSuggestionsFor(record.type, toastOptions);
      record.ariaLive = aria.ariaLive;
      record.role = aria.role;
    }
    if (toastOptions.data !== undefined) record.data = toastOptions.data;
    const durationChanged = toastOptions.duration !== undefined || toastOptions.type;
    // Resolve the new duration into a local; whether it actually lands on the
    // record depends on whether the live countdown will be rebuilt to honor it
    // (see below). Committing it eagerly is what made remaining/duration
    // contradict for a preserved countdown.
    const resolvedDuration = durationChanged
      ? resolveDuration(record.type, toastOptions.duration)
      : record.duration;
    record.updatedAt = clock.now();

    const resetTimer = toastOptions.resetTimer !== false;
    if (record.phase === VISIBLE) {
      // resetTimer:false normally keeps the running countdown's remaining time
      // untouched. But if the resolved duration's sticky-ness flipped, the old
      // countdown is now wrong: a finite countdown left running on a now-sticky
      // toast would still fire (auto-dismissing a loading/sticky toast — exactly
      // what stickiness exists to prevent), and a sticky/absent countdown on a
      // now-finite toast would never fire (the toast never auto-dismisses). Only
      // the genuine finite->finite case should preserve the old remaining time.
      const nowSticky = isSticky(resolvedDuration);
      const wasSticky = record.countdown ? !record.countdown._hasFiniteDuration : true;
      if (resetTimer || nowSticky !== wasSticky) {
        // The countdown is being rebuilt to the new duration, so commit it.
        record.duration = resolvedDuration;
        if (record.countdown) record.countdown.clear();
        record.countdown = new Countdown(clock, record.duration, () => {
          beginExit(record);
          notify();
        });
        record.countdown.start();
        if (record.pauseReasons.size > 0) record.countdown.pause();
      }
      // Otherwise the running countdown is preserved (resetTimer:false,
      // finite->finite). Keep record.duration as-is so the public snapshot's
      // duration matches the remaining/auto-dismiss the live timer still honors;
      // overwriting it here would report a duration the timer never adopted.
    } else {
      // entering/queued: no live countdown yet — the new duration is stored and
      // applied when the toast goes visible.
      record.duration = resolvedDuration;
    }

    notify();
    return true;
  }

  // ---- promise integration ------------------------------------------------

  function resolveMessage(message, argument) {
    return typeof message === 'function' ? message(argument) : message;
  }

  function promiseToast(promise, messages, toastOptions) {
    const loadingContent =
      messages && messages.loading !== undefined ? resolveMessage(messages.loading) : 'Loading…';
    // collapse:false so each promise owns a dedicated record. Without it, two
    // concurrent promises with identical loading content would collapse onto one
    // toast, and whichever settled last would clobber the other's success/error.
    const id = add(loadingContent, {
      ...toastOptions,
      type: ToastType.LOADING,
      duration: 0,
      collapse: false,
    });

    // Mirror the promise so the caller still gets the original outcome: success
    // returns the value, rejection re-throws (never swallowed). Side effect:
    // update the loading toast to success/error.
    const mirroredPromise = Promise.resolve(promise).then(
      (value) => {
        updateToast(id, resolveMessage(messages && messages.success, value), {
          ...toastOptions,
          type: ToastType.SUCCESS,
          duration:
            toastOptions.duration !== undefined ? toastOptions.duration : config.duration,
        });
        return value;
      },
      (error) => {
        updateToast(id, resolveMessage(messages && messages.error, error), {
          ...toastOptions,
          type: ToastType.ERROR,
          duration:
            toastOptions.duration !== undefined ? toastOptions.duration : config.errorDuration,
        });
        throw error;
      },
    );
    return mirroredPromise;
  }

  // ---- public command surface ---------------------------------------------

  function toast(content, toastOptions) {
    return add(content, toastOptions || {});
  }
  toast.success = (content, toastOptions) => add(content, { ...toastOptions, type: ToastType.SUCCESS });
  toast.error = (content, toastOptions) => add(content, { ...toastOptions, type: ToastType.ERROR });
  toast.info = (content, toastOptions) => add(content, { ...toastOptions, type: ToastType.INFO });
  toast.warning = (content, toastOptions) => add(content, { ...toastOptions, type: ToastType.WARNING });
  toast.loading = (content, toastOptions) => add(content, { ...toastOptions, type: ToastType.LOADING });
  toast.promise = (promise, messages, toastOptions) =>
    promiseToast(promise, messages || {}, toastOptions || {});

  function update(id, content, toastOptions) {
    return updateToast(String(id), content, toastOptions || {});
  }

  function dismiss(id) {
    if (destroyed) return;
    const record = records.get(String(id));
    if (!record || record.phase === EXITING) return;
    beginExit(record);
    notify();
  }

  function dismissAll(position) {
    if (destroyed) return;
    let ids = [...records.keys()];
    if (position != null) ids = ids.filter((id) => records.get(id).position === position);
    if (config.reverseExitOrder) ids.reverse();
    const targetRecords = ids.map((id) => records.get(id)).filter(Boolean);
    // Drop queued ones outright first, without promoting siblings, so dismissing
    // everything doesn't pull a waiting toast in as the visibles leave.
    for (const record of targetRecords) {
      if (record.phase === QUEUED) hardRemove(record.id, false);
    }
    for (const record of targetRecords) {
      if (record.phase === ENTERING || record.phase === VISIBLE) beginExit(record);
    }
    notify();
  }

  function remove(id) {
    if (destroyed) return;
    if (!records.has(String(id))) return;
    hardRemove(String(id), true);
    notify();
  }

  function pause(id) {
    if (destroyed) return;
    if (id == null) {
      for (const record of records.values()) pauseRecord(record, 'user');
    } else {
      const record = records.get(String(id));
      if (record) pauseRecord(record, 'user');
    }
    notify();
  }

  function resume(id) {
    if (destroyed) return;
    if (id == null) {
      for (const record of records.values()) resumeRecord(record, 'user');
    } else {
      const record = records.get(String(id));
      if (record) resumeRecord(record, 'user');
    }
    notify();
  }

  function subscribe(callback) {
    if (typeof callback !== 'function' || destroyed) return () => {};
    return emitter.on('change', callback);
  }

  function getState() {
    if (destroyed) return { groups: [], toasts: [], reduceMotion, config: { ...config } };
    return buildState();
  }

  // ---- environment wiring (DOM, all guarded; never at module scope) -------

  function handleVisibilityChange() {
    const hidden = typeof document !== 'undefined' && !!document.hidden;
    tabHidden = hidden;
    for (const record of records.values()) {
      if (hidden) pauseRecord(record, 'tab');
      else resumeRecord(record, 'tab');
    }
    notify();
  }

  function setupEnvironmentListeners() {
    // prefers-reduced-motion: read once, then track changes. Only when not forced
    // by the caller and matchMedia exists (browser only).
    if (
      options.reduceMotion == null &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function'
    ) {
      try {
        const mediaQueryList = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduceMotion = !!mediaQueryList.matches;
        const handler = () => {
          reduceMotion = !!mediaQueryList.matches;
          notify();
        };
        if (typeof mediaQueryList.addEventListener === 'function') {
          mediaQueryList.addEventListener('change', handler);
          detachReducedMotionListener = () => mediaQueryList.removeEventListener('change', handler);
        } else if (typeof mediaQueryList.addListener === 'function') {
          mediaQueryList.addListener(handler);
          detachReducedMotionListener = () => mediaQueryList.removeListener(handler);
        }
      } catch {
        /* matchMedia present but unusable — leave reduceMotion as-is */
      }
    }

    // pauseOnTabBlur: pause running timers while the tab is hidden so a toast
    // doesn't silently expire on a backgrounded tab.
    if (
      config.pauseOnTabBlur &&
      typeof document !== 'undefined' &&
      typeof document.addEventListener === 'function'
    ) {
      tabHidden = !!document.hidden; // seed from the current state, not the next event
      document.addEventListener('visibilitychange', handleVisibilityChange);
      detachVisibilityListener = () =>
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    for (const record of records.values()) clearTimers(record);
    records.clear();
    idsByPosition.clear();
    if (detachVisibilityListener) {
      detachVisibilityListener();
      detachVisibilityListener = null;
    }
    if (detachReducedMotionListener) {
      detachReducedMotionListener();
      detachReducedMotionListener = null;
    }
    emitter.clear();
  }

  setupEnvironmentListeners();
  // Emit the initial (empty) state once after construction, like the other
  // engines — deferred a microtask so a synchronous subscribe() right after
  // creation still receives it.
  queueMicrotask(() => {
    if (!destroyed) notify();
  });

  return {
    toast,
    update,
    dismiss,
    dismissAll,
    remove,
    pause,
    resume,
    subscribe,
    getState,
    destroy,
  };
}
