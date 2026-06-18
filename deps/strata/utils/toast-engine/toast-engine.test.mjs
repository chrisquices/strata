// toast-engine.test.mjs
// Pure unit tests for the toast engine. No DOM, no browser, no framework:
//   node toast-engine/toast-engine.test.mjs
//
// Importing toast-engine.js here doubles as the headless-core design check: if
// the module touched document/window/matchMedia at top level, this import would
// throw in Node. It does not — that access lives inside methods behind guards.
//
// Every timer/lifecycle test drives an INJECTABLE FAKE CLOCK so behavior is
// deterministic without real waiting: advance(ms) fires due timers in
// chronological order, moving the virtual `now` to each as it fires.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, testAsync, assert, isMain, report } from './harness.mjs';
import {
  createToaster, defaultClock,
  ToastType, ToastPhase, Position, Order, Overflow,
} from './toast-engine.js';

// ---- fake clock -----------------------------------------------------------

function makeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map(); // id -> { fireAt, fn }
  return {
    now: () => now,
    setTimeout: (fn, ms) => {
      const id = ++seq;
      timers.set(id, { fireAt: now + Math.max(0, ms || 0), fn });
      return id;
    },
    clearTimeout: (id) => { timers.delete(id); },
    /** Advance virtual time by `ms`, firing due timers in order (handles 0-delay and re-entrancy). */
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

// A toaster wired to a fresh fake clock; defaults tuned for determinism
// (no enter delay, generous explicit durations). Override per test.
function mk(opts = {}) {
  const clock = makeClock();
  const toaster = createToaster({
    enterDuration: 0,
    exitTimeout: 500,
    duration: 5000,
    pauseOnTabBlur: false, // no DOM in Node; tab-blur tested separately via a stub
    clock,
    ...opts,
  });
  return { clock, toaster };
}

// Settle every just-added toast from `entering` to `visible` (enterDuration 0).
const settle = (clock) => clock.advance(0);

// Find a toast by id across all groups of a state snapshot.
const find = (state, id) => state.toasts.find((t) => t.id === id);
const phaseOf = (toaster, id) => { const t = find(toaster.getState(), id); return t ? t.phase : undefined; };

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and constructs headless (no DOM)', () => {
  // The static import at the top already proves module scope is DOM-free.
  const t = createToaster(); // default real clock, no document/window present
  assert.equal(typeof t.toast, 'function');
  const id = t.toast('hello');
  assert.equal(typeof id, 'string');
  const state = t.getState();
  assert.ok(Array.isArray(state.groups) && Array.isArray(state.toasts), 'valid state synchronously');
  t.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./toast-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const s of specifiers) {
    assert.ok(s.startsWith('../shared/'), `import "${s}" must come from ../shared/`);
  }
});

test('getState() returns valid empty state immediately after creation', () => {
  const { toaster } = mk();
  const s = toaster.getState();
  assert.deepEqual(s.groups, []);
  assert.deepEqual(s.toasts, []);
  assert.equal(s.config.max, 3);
  assert.equal(s.config.gap, 12, 'spacing hint emitted in config');
  assert.equal(s.reduceMotion, false);
});

test('non-finite gap option is rejected (NaN/Infinity never reach the emitted config.gap)', () => {
  // gap is re-broadcast in every state snapshot; a consumer doing layout math
  // (translateY = index * gap) would get NaN positioning from a single bad option.
  for (const bad of [NaN, Infinity, -Infinity]) {
    const { toaster } = mk({ gap: bad });
    assert.equal(toaster.getState().config.gap, 12, `gap ${bad} falls back to default 12`);
  }
  // A finite value (including 0 and negatives) is still honored verbatim.
  assert.equal(mk({ gap: 0 }).toaster.getState().config.gap, 0);
  assert.equal(mk({ gap: 24 }).toaster.getState().config.gap, 24);
});

test('non-finite duration option is rejected (NaN/Infinity never reach emitted config.duration / a toast)', () => {
  // config.duration is re-broadcast in every snapshot via config:{...config} and
  // reaches the public `duration` field through resolveDuration(); a non-finite
  // value would yield NaN dismiss-progress `(duration - remaining) / duration`.
  for (const bad of [NaN, Infinity, -Infinity]) {
    const { toaster, clock } = mk({ duration: bad });
    assert.equal(toaster.getState().config.duration, 4000, `config.duration ${bad} falls back to 4000`);
    const id = toaster.toast('x'); // no explicit duration -> picks up config.duration
    settle(clock);
    const t = find(toaster.getState(), id);
    assert.ok(Number.isFinite(t.duration), `emitted duration finite for option ${bad}`);
    assert.equal(t.duration, 4000, 'toast adopts the finite default, not NaN/Infinity');
  }
  // A finite value (including 0 and negatives, which resolve sticky) is honored.
  assert.equal(mk({ duration: 0 }).toaster.getState().config.duration, 0);
  assert.equal(mk({ duration: -5 }).toaster.getState().config.duration, -5);
  assert.equal(mk({ duration: 8000 }).toaster.getState().config.duration, 8000);
});

test('convenience setters only set type, not behavior', () => {
  const { toaster, clock } = mk({ max: 10 });
  const a = toaster.toast.success('ok');
  const b = toaster.toast.error('bad');
  const c = toaster.toast.info('fyi');
  const d = toaster.toast.warning('careful');
  settle(clock);
  const s = toaster.getState();
  assert.equal(find(s, a).type, ToastType.SUCCESS);
  assert.equal(find(s, b).type, ToastType.ERROR);
  assert.equal(find(s, c).type, ToastType.INFO);
  assert.equal(find(s, d).type, ToastType.WARNING);
});

// ============================================================================
// Lifecycle phase transitions
// ============================================================================

test('add emits `entering` immediately, then `visible` after enterDuration', () => {
  const { toaster, clock } = mk({ enterDuration: 250 });
  const id = toaster.toast('hi');
  assert.equal(phaseOf(toaster, id), ToastPhase.ENTERING, 'entering on add');
  clock.advance(249);
  assert.equal(phaseOf(toaster, id), ToastPhase.ENTERING, 'still entering before enterDuration');
  clock.advance(1);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'visible at enterDuration');
});

test('auto-dismiss runs only during `visible`, then transitions to `exiting`', () => {
  const { toaster, clock } = mk({ enterDuration: 100, duration: 1000 });
  const id = toaster.toast('hi');
  clock.advance(100); // -> visible, countdown starts here
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE);
  clock.advance(999);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'timer did not start during entering');
  clock.advance(1);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'exiting after full duration in visible');
});

// ============================================================================
// The remaining-time invariant across pause/resume (the key unit)
// ============================================================================

test('pause/resume preserves remaining time exactly (3s into a 5s toast -> 2s left)', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast('x');
  settle(clock); // visible at t=0, countdown 5000
  clock.advance(3000);
  assert.equal(find(toaster.getState(), id).remaining, 2000, 'remaining before pause');
  toaster.pause(id);
  assert.equal(find(toaster.getState(), id).paused, true);
  clock.advance(100000); // a long time passes while paused
  assert.equal(find(toaster.getState(), id).remaining, 2000, 'remaining frozen while paused');
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'did not expire while paused');
  toaster.resume(id);
  clock.advance(1999);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'still alive 1ms before resume completes');
  assert.equal(find(toaster.getState(), id).remaining, 1, 'exactly 1ms left');
  clock.advance(1);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'resumed for exactly the remaining 2000ms');
});

test('resume of a countdown that froze to remaining==0 while paused still elapses (not wedged VISIBLE)', () => {
  // Regression: a real setTimeout can fire late, so at pause() time clock.now()
  // may already be >= the countdown deadline. pause() then freezes _remaining to
  // exactly 0. resume() used to do `if (remaining > 0) schedule()` — 0 is not > 0,
  // so it rescheduled nothing and the toast stayed VISIBLE forever, never
  // transitioning to EXITING/auto-dismiss. resume() must treat a fully-elapsed
  // paused countdown as 'elapse now', not silently drop it.
  //
  // We model the late-timer race with a clock whose `jump` advances `now` WITHOUT
  // firing pending timers (the deadline is reached before the macrotask runs).
  let now = 0;
  let seq = 0;
  const timers = new Map();
  const clock = {
    now: () => now,
    setTimeout: (fn, ms) => { const id = ++seq; timers.set(id, { fireAt: now + Math.max(0, ms || 0), fn }); return id; },
    clearTimeout: (id) => { timers.delete(id); },
    jump: (ms) => { now += ms; }, // advance time only — does NOT fire timers (simulates a late timer)
    drain: (ms) => { // advance AND fire every due timer in chronological order
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
  };
  const toaster = createToaster({ enterDuration: 0, exitTimeout: 500, duration: 5000, pauseOnTabBlur: false, clock });
  const id = toaster.toast('x');
  clock.drain(0); // settle to visible; countdown scheduled to fire at now+5000

  // The host delivered the timer late: `now` reaches the deadline before the
  // auto-dismiss macrotask has run. pause() lands in this window and freezes
  // remaining to exactly 0 while the timer is still considered running.
  clock.jump(5000); // now == deadline, but the auto-dismiss callback has NOT fired
  toaster.pause(id);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'still visible at pause (timer not fired yet)');

  toaster.resume(id);
  clock.drain(0); // a 0ms timer should now carry it through the normal dismiss path
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'fully-elapsed paused countdown elapses on resume');

  clock.drain(500); // exit fallback removes it
  assert.equal(find(toaster.getState(), id), undefined, 'removed on schedule (not wedged forever)');
});

test('pause(id) before resume(id) — multiple pause reasons resume independently', () => {
  const { toaster, clock } = mk({ duration: 4000 });
  const id = toaster.toast('x');
  settle(clock);
  clock.advance(1000); // remaining 3000
  toaster.pause(id); // 'user' reason
  // Simulate a second independent hold by pausing again with the same public reason:
  toaster.pause(id);
  toaster.resume(id);
  clock.advance(3000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'single user reason cleared, resumes correctly');
});

test('pause()/resume() with no id affect all toasts', () => {
  const { toaster, clock } = mk({ duration: 2000 });
  const a = toaster.toast('a');
  const b = toaster.toast('b');
  settle(clock);
  toaster.pause();
  clock.advance(5000);
  assert.equal(phaseOf(toaster, a), ToastPhase.VISIBLE, 'a paused globally');
  assert.equal(phaseOf(toaster, b), ToastPhase.VISIBLE, 'b paused globally');
  toaster.resume();
  clock.advance(2000); // countdown fires -> exiting
  assert.equal(phaseOf(toaster, a), ToastPhase.EXITING, 'a expires after global resume');
  clock.advance(500); // exit fallback -> removed
  assert.equal(find(toaster.getState(), a), undefined, 'a fully removed');
});

test('pause() after dismiss never reports paused:true on an exiting toast', () => {
  // Regression: `paused` was derived purely from pauseReasons.size, ignoring
  // phase. pauseRecord() adds a reason to ANY record, so dismiss(id) then
  // pause() (or pause(id)) tagged the exiting record and the next snapshot
  // reported a contradictory { phase: 'exiting', remaining: 0, paused: true }.
  // An exiting toast has no live countdown to pause, so paused must be false.
  const { toaster, clock } = mk({ duration: 5000, exitTimeout: 500 });
  const id = toaster.toast('x');
  settle(clock);
  toaster.dismiss(id); // -> exiting, countdown cleared
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'exiting after dismiss');

  toaster.pause(); // global pause tags the exiting record with 'user'
  const viaGlobal = find(toaster.getState(), id);
  assert.equal(viaGlobal.phase, ToastPhase.EXITING);
  assert.equal(viaGlobal.remaining, 0, 'exiting toast reports 0 remaining');
  assert.equal(viaGlobal.paused, false, 'exiting toast never reports paused');

  toaster.pause(id); // targeted pause on the same exiting record
  assert.equal(find(toaster.getState(), id).paused, false, 'targeted pause does not flip paused on exiting toast');

  clock.advance(500); // exit fallback removes it
  assert.equal(find(toaster.getState(), id), undefined, 'still removed on schedule');
});

// ============================================================================
// Exit handshake — both removal paths
// ============================================================================

test('exit handshake: stays `exiting` (not dropped), removed on consumer remove()', () => {
  const { toaster, clock } = mk({ duration: 1000, exitTimeout: 500 });
  const id = toaster.toast('x');
  settle(clock);
  clock.advance(1000); // auto-dismiss -> exiting
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'present and exiting, not gone');
  toaster.remove(id); // consumer signals its exit animation finished
  assert.equal(find(toaster.getState(), id), undefined, 'removed on signal');
  // The fallback timer must have been cleared — advancing past it does nothing.
  clock.advance(1000);
  assert.equal(toaster.getState().toasts.length, 0);
});

test('exit handshake: removed by fallback timeout when the consumer never signals', () => {
  const { toaster, clock } = mk({ duration: 1000, exitTimeout: 500 });
  const id = toaster.toast('x');
  settle(clock);
  clock.advance(1000); // -> exiting
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING);
  clock.advance(499);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'still exiting before fallback');
  clock.advance(1);
  assert.equal(find(toaster.getState(), id), undefined, 'fallback timeout removed it');
});

test('dismiss(id) begins exit (not an instant remove)', () => {
  const { toaster, clock } = mk();
  const id = toaster.toast('x');
  settle(clock);
  toaster.dismiss(id);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'dismiss triggers exiting');
});

test('dismiss during `entering` jumps cleanly entering -> exiting', () => {
  const { toaster, clock } = mk({ enterDuration: 300 });
  const id = toaster.toast('x');
  assert.equal(phaseOf(toaster, id), ToastPhase.ENTERING);
  toaster.dismiss(id); // X clicked mid enter-animation
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'no broken state');
  // The pending enter timer must not resurrect it to visible.
  clock.advance(300);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'enter timer did not flip it back to visible');
});

test('remove()/dismiss() on unknown or already-removed id is a no-op (no throw)', () => {
  const { toaster, clock } = mk();
  assert.doesNotThrow(() => toaster.remove('nope'));
  assert.doesNotThrow(() => toaster.dismiss('nope'));
  const id = toaster.toast('x');
  settle(clock);
  toaster.remove(id);
  assert.doesNotThrow(() => toaster.remove(id), 'removing twice is safe');
  assert.doesNotThrow(() => toaster.dismiss(id), 'dismissing a removed toast is safe');
});

// ============================================================================
// Sticky durations
// ============================================================================

test('non-finite per-toast duration is rejected (NaN/Infinity never reach the emitted duration field)', () => {
  // resolveDuration() returns an explicit per-call duration; a non-finite value
  // would land in record.duration and emit as the public `duration` field, giving
  // the contradictory { duration: NaN, sticky: true, remaining: Infinity } triple.
  for (const bad of [NaN, Infinity, -Infinity]) {
    const { toaster, clock } = mk();
    const id = toaster.toast('x', { duration: bad });
    settle(clock);
    const t = find(toaster.getState(), id);
    assert.ok(Number.isFinite(t.duration), `emitted duration finite for explicit ${bad}`);
    assert.equal(t.duration, 0, `bad explicit duration ${bad} maps to 0`);
    assert.equal(t.sticky, true, 'a 0 duration is still sticky (intended bad-value semantics)');
    assert.equal(t.remaining, Infinity, 'remaining consistent with the sticky 0');
    clock.advance(10 ** 9);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'never auto-dismisses, no NaN-poisoned timer');
  }
  // update() routes through resolveDuration() too: a non-finite update is guarded.
  const { toaster, clock } = mk();
  const id = toaster.toast('y'); // finite default
  settle(clock);
  toaster.update(id, 'y2', { duration: NaN });
  const u = find(toaster.getState(), id);
  assert.ok(Number.isFinite(u.duration), 'updated duration finite');
  assert.equal(u.duration, 0, 'non-finite update maps to sticky 0');
});

test('non-finite errorDuration option is rejected (NaN/Infinity never reach the emitted config / an error toast)', () => {
  // Regression: createToaster({ errorDuration: NaN }) only had a `!= null` check,
  // so the non-finite value passed through verbatim. resolveDuration(ERROR, undefined)
  // returns config.errorDuration raw, landing it in record.duration and emitting the
  // contradictory { duration: NaN, sticky: true, remaining: Infinity } triple, while
  // config.errorDuration: NaN was re-broadcast in every snapshot via config: {...config}.
  for (const bad of [NaN, Infinity, -Infinity]) {
    const { toaster, clock } = mk({ errorDuration: bad });
    // The emitted config never carries the non-finite value.
    assert.equal(toaster.getState().config.errorDuration, 0, `config.errorDuration falls back to 0 for ${bad}`);
    const id = toaster.toast.error('boom'); // no explicit per-call duration
    settle(clock);
    const t = find(toaster.getState(), id);
    assert.ok(Number.isFinite(t.duration), `emitted duration finite for errorDuration ${bad}`);
    assert.equal(t.duration, 0, `bad errorDuration ${bad} maps to the sticky default 0`);
    assert.equal(t.sticky, true, 'a 0 errorDuration is still sticky (intended error semantics)');
    assert.equal(t.remaining, Infinity, 'remaining consistent with the sticky 0 (no NaN)');
    clock.advance(10 ** 9);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'never auto-dismisses, no NaN-poisoned timer');
  }
  // A finite errorDuration (including negatives, which resolve sticky) is honored verbatim.
  const { toaster, clock } = mk({ errorDuration: 1500 });
  assert.equal(toaster.getState().config.errorDuration, 1500, 'finite errorDuration honored');
  const id = toaster.toast.error('boom');
  settle(clock);
  assert.equal(find(toaster.getState(), id).sticky, false, 'finite errorDuration is non-sticky');
  clock.advance(1500);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'finite errorDuration auto-dismisses');
});

test('duration 0 and Infinity are sticky — never auto-dismiss', () => {
  for (const duration of [0, Infinity]) {
    const { toaster, clock } = mk();
    const id = toaster.toast('x', { duration });
    settle(clock);
    const t = find(toaster.getState(), id);
    assert.equal(t.sticky, true, `duration ${duration} -> sticky`);
    assert.equal(t.remaining, Infinity, 'remaining is Infinity for sticky');
    clock.advance(10 ** 9);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, `duration ${duration} never expires`);
  }
});

test('errors default to sticky (do not auto-vanish unread); overridable', () => {
  const { toaster, clock } = mk();
  const e = toaster.toast.error('boom');
  settle(clock);
  assert.equal(find(toaster.getState(), e).sticky, true, 'error sticky by default');
  clock.advance(10 ** 8);
  assert.equal(phaseOf(toaster, e), ToastPhase.VISIBLE, 'error did not auto-dismiss');

  const e2 = toaster.toast.error('boom2', { duration: 1000 });
  settle(clock);
  clock.advance(1000);
  assert.equal(phaseOf(toaster, e2), ToastPhase.EXITING, 'explicit duration overrides sticky default');
});

test('loading toasts are sticky', () => {
  const { toaster, clock } = mk();
  const id = toaster.toast.loading('working');
  settle(clock);
  assert.equal(find(toaster.getState(), id).sticky, true);
  clock.advance(10 ** 8);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE);
});

// ============================================================================
// Max-visible + overflow
// ============================================================================

test('overflow=queue: holds extras, promotes oldest-queued as slots free; emits queued count', () => {
  const { toaster, clock } = mk({ max: 2, overflow: Overflow.QUEUE, duration: 0 }); // sticky so they stay
  const a = toaster.toast('A');
  const b = toaster.toast('B');
  const c = toaster.toast('C');
  const d = toaster.toast('D');
  settle(clock);
  let g = toaster.getState().groups[0];
  assert.equal(g.toasts.length, 2, 'only max visible');
  assert.equal(g.queued, 2, 'two queued behind the cap');
  assert.equal(g.count, 4, 'group total includes queued (for a "+N more" affordance)');
  assert.deepEqual(g.toasts.map((t) => t.content).sort(), ['A', 'B'], 'A,B visible');

  toaster.dismiss(a); // free a slot -> promote oldest queued (C, not D)
  settle(clock);
  g = toaster.getState().groups[0];
  const visibleContents = g.toasts.filter((t) => t.phase !== ToastPhase.EXITING).map((t) => t.content);
  assert.ok(visibleContents.includes('C'), 'C promoted before D (FIFO queue order)');
  assert.ok(!visibleContents.includes('D'), 'D still queued');
  assert.equal(g.queued, 1, 'one left queued');
});

test('overflow=evict: adding past the cap evicts the oldest so the newest shows', () => {
  const { toaster, clock } = mk({ max: 2, overflow: Overflow.EVICT, duration: 0 });
  const a = toaster.toast('A');
  toaster.toast('B');
  settle(clock);
  const c = toaster.toast('C'); // evicts A
  settle(clock);
  assert.equal(phaseOf(toaster, a), ToastPhase.EXITING, 'oldest evicted (exiting)');
  const g = toaster.getState().groups[0];
  assert.equal(g.queued, 0, 'evict never queues');
  const active = g.toasts.filter((t) => t.phase !== ToastPhase.EXITING).map((t) => t.content);
  assert.deepEqual(active.sort(), ['B', 'C'], 'B and C visible, newest always shown');
});

test('overflow churn does not leak timers or lose/duplicate toasts', () => {
  const { toaster, clock } = mk({ max: 3, overflow: Overflow.QUEUE, duration: 1000, exitTimeout: 100 });
  const ids = [];
  for (let i = 0; i < 12; i++) ids.push(toaster.toast(`t${i}`));
  settle(clock);
  // Drain everything by advancing well past all timers.
  clock.advance(100000);
  assert.equal(toaster.getState().toasts.length, 0, 'all toasts drained, none stuck');
  assert.equal(clock.pending(), 0, 'no timers left pending (no leak)');
});

// ============================================================================
// Order within a group + index hint
// ============================================================================

test('order newest-first vs newest-last controls display order and index', () => {
  const first = mk({ order: Order.NEWEST_FIRST, max: 5, duration: 0 });
  first.toaster.toast('A'); first.toaster.toast('B'); first.toaster.toast('C');
  settle(first.clock);
  let g = first.toaster.getState().groups[0];
  assert.deepEqual(g.toasts.map((t) => t.content), ['C', 'B', 'A'], 'newest-first');
  assert.deepEqual(g.toasts.map((t) => t.index), [0, 1, 2], 'index follows display order, front=0');

  const last = mk({ order: Order.NEWEST_LAST, max: 5, duration: 0 });
  last.toaster.toast('A'); last.toaster.toast('B'); last.toaster.toast('C');
  settle(last.clock);
  g = last.toaster.getState().groups[0];
  assert.deepEqual(g.toasts.map((t) => t.content), ['A', 'B', 'C'], 'newest-last');
});

test('toasts are partitioned into position groups in canonical order', () => {
  const { toaster, clock } = mk({ duration: 0 });
  toaster.toast('br', { position: Position.BOTTOM_RIGHT });
  toaster.toast('tl', { position: Position.TOP_LEFT });
  toaster.toast('tr', { position: Position.TOP_RIGHT });
  settle(clock);
  const positions = toaster.getState().groups.map((g) => g.position);
  assert.deepEqual(positions, [Position.TOP_LEFT, Position.TOP_RIGHT, Position.BOTTOM_RIGHT],
    'groups emitted in canonical top->bottom, left->right order');
});

// ============================================================================
// Identity / dedup
// ============================================================================

test('caller-supplied id: re-using it updates in place instead of stacking a duplicate', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  toaster.toast('first', { id: 'job-1' });
  settle(clock);
  clock.advance(2000);
  const id2 = toaster.toast('second', { id: 'job-1' }); // spam the same action
  assert.equal(id2, 'job-1');
  const s = toaster.getState();
  assert.equal(s.toasts.length, 1, 'no duplicate');
  assert.equal(find(s, 'job-1').content, 'second', 'updated in place');
  assert.equal(find(s, 'job-1').remaining, 5000, 'timer reset on dedup update');
});

test('dedupById:false — a colliding id stacks a fresh toast instead of updating', () => {
  const { toaster, clock } = mk({ dedupById: false, max: 10, duration: 0 });
  const a = toaster.toast('first', { id: 'dup' });
  const b = toaster.toast('second', { id: 'dup' });
  settle(clock);
  const s = toaster.getState();
  assert.equal(a, 'dup', 'first honors the supplied id');
  assert.notEqual(b, 'dup', 'second gets a minted id (cannot clobber the key)');
  assert.equal(s.toasts.length, 2, 'both toasts present (stacked, not deduped)');
  assert.deepEqual(s.toasts.map((t) => t.content).sort(), ['first', 'second']);
});

test('auto-minted id never collides with an earlier consumer-supplied `t<N>` id', () => {
  // Regression: honoring an explicit id of the auto-mint form `t<N>` must advance
  // idSequence past it, so a later auto-mint cannot reuse 't2' and clobber the
  // original record (overwriting it in the Map + double-pushing into the order).
  const { toaster, clock } = mk({ duration: 0 });
  const a = toaster.toast('A', { id: 't2' }); // explicit id in the auto-mint format, minted seq still 0
  const m0 = toaster.toast('m0'); // would have minted 't1'
  const m1 = toaster.toast('m1'); // pre-fix: minted 't2' -> clobbers 'A'
  settle(clock);
  const ids = toaster.getState().toasts.map((t) => t.id);
  assert.equal(a, 't2', 'explicit id honored verbatim');
  assert.equal(new Set(ids).size, ids.length, 'no duplicate id in the display order');
  assert.notEqual(m1, 't2', 'later auto-mint must not reuse the explicit `t2`');
  assert.ok(ids.includes('t2'), "the explicit 't2' record is still present");
  const t2Records = toaster.getState().toasts.filter((t) => t.id === 't2');
  assert.equal(t2Records.length, 1, "exactly one record claims 't2'");
  assert.equal(t2Records[0].content, 'A', "'A' was not clobbered by the later toast");
});

test('a huge-digit explicit `t<N>` id cannot freeze the auto-id counter (no clobber/duplicate)', () => {
  // Regression: advancing idSequence to Number('999...20 digits') = 1e20 (> 2^53)
  // makes ++idSequence a no-op (float precision), so every later auto-mint becomes
  // the SAME string 't1e20...'. The 2nd auto toast would then overwrite the 1st in
  // the Map (leaking its timers) and double-push the id into the display order.
  // The fix only advances the counter for a safe integer, so it keeps incrementing.
  const { toaster, clock } = mk({ duration: 0 });
  const big = 't' + '9'.repeat(20); // 1e20 when Number()'d — past MAX_SAFE_INTEGER
  toaster.toast('A', { id: big }); // explicit id honored; must NOT bump the counter to 1e20
  const m0 = toaster.toast('m0');
  const m1 = toaster.toast('m1');
  settle(clock);
  const ids = toaster.getState().toasts.map((t) => t.id);
  assert.notEqual(m0, m1, 'two distinct auto-minted ids (counter still increments)');
  assert.equal(new Set(ids).size, ids.length, 'no duplicate id in the display order');
  assert.equal(toaster.getState().toasts.length, 3, 'all three toasts present (none clobbered)');
  const mintedRecords = toaster.getState().toasts.filter((t) => t.id === m1);
  assert.equal(mintedRecords.length, 1, 'exactly one record claims the latest auto id');
  assert.equal(mintedRecords[0].content, 'm1', "the second auto toast was not clobbered");
});

test('content dedup (collapseDuplicates) collapses identical content with a count', () => {
  const { toaster, clock } = mk({ collapseDuplicates: true, duration: 0 });
  const id = toaster.toast('Saved');
  settle(clock);
  toaster.toast('Saved');
  toaster.toast('Saved');
  const s = toaster.getState();
  assert.equal(s.toasts.length, 1, 'collapsed to one');
  assert.equal(find(s, id).count, 3, 'count reflects the collapses (consumer renders "(3)")');
});

// ============================================================================
// update-in-place + timer reset
// ============================================================================

test('update changes content/type in place and resets the timer by default', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast.loading('Loading…');
  settle(clock);
  clock.advance(1000);
  toaster.update(id, 'Done!', { type: ToastType.SUCCESS, duration: 4000 });
  const t = find(toaster.getState(), id);
  assert.equal(t.content, 'Done!');
  assert.equal(t.type, ToastType.SUCCESS);
  assert.equal(t.remaining, 4000, 'fresh success duration, not the loading sticky');
  clock.advance(4000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'auto-dismisses on the new duration');
});

test('update with resetTimer:false keeps the current remaining time', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast('x');
  settle(clock);
  clock.advance(2000); // remaining 3000
  toaster.update(id, 'x updated', { resetTimer: false });
  assert.equal(find(toaster.getState(), id).remaining, 3000, 'remaining untouched');
});

test('update finite -> sticky with resetTimer:false reconciles the stale countdown', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast('x'); // finite
  settle(clock);
  clock.advance(1000); // finite countdown running, remaining 4000
  // Flip to a sticky loading type without resetting the timer.
  toaster.update(id, 'Loading…', { type: ToastType.LOADING, resetTimer: false });
  const t = find(toaster.getState(), id);
  assert.equal(t.sticky, true, 'now sticky');
  assert.equal(t.remaining, Infinity, 'remaining reconciled to Infinity (no contradictory snapshot)');
  // The stale finite countdown must NOT fire and auto-dismiss the now-sticky toast.
  clock.advance(100000);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'sticky toast never auto-dismisses');
  assert.equal(clock.pending(), 0, 'no stray finite timer left pending');
});

test('update sticky -> finite with resetTimer:false starts a finite countdown', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast.loading('Loading…'); // sticky
  settle(clock);
  clock.advance(1000);
  // Flip to a finite success type without resetting the timer.
  toaster.update(id, 'Done!', { type: ToastType.SUCCESS, duration: 4000, resetTimer: false });
  const t = find(toaster.getState(), id);
  assert.equal(t.sticky, false, 'now finite');
  assert.equal(t.remaining, 4000, 'a finite countdown was created and started');
  clock.advance(4000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'now-finite toast auto-dismisses');
});

test('update finite -> finite with resetTimer:false keeps duration consistent with the preserved countdown', () => {
  const { toaster, clock } = mk({ duration: 5000 });
  const id = toaster.toast('x', { duration: 10000 });
  settle(clock);
  clock.advance(1000); // remaining 9000 on the running 10000ms countdown
  // Supply a NEW finite duration without resetting the timer. Sticky-ness does
  // not flip (finite -> finite), so the running countdown is deliberately
  // preserved. The public duration must NOT jump to 2000 while remaining/dismiss
  // still honor the old 10000ms countdown (that yielded remaining 9000 > duration
  // 2000 — an impossible >100% progress bar).
  toaster.update(id, 'x updated', { duration: 2000, resetTimer: false });
  const t = find(toaster.getState(), id);
  assert.equal(t.remaining, 9000, 'remaining still reflects the preserved countdown');
  assert.equal(t.duration, 10000, 'duration stays consistent with the live countdown (not 2000)');
  assert.ok(t.remaining <= t.duration, 'remaining never exceeds duration');
  // The toast still auto-dismisses on the OLD 10000ms deadline (9000ms from here),
  // never on the supplied 2000ms.
  clock.advance(2000);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'does not dismiss on the new 2000ms');
  clock.advance(7000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'dismisses on the preserved 10000ms deadline');
});

test('update on an already-exiting toast is ignored', () => {
  const { toaster, clock } = mk();
  const id = toaster.toast('x');
  settle(clock);
  toaster.dismiss(id); // -> exiting
  const ok = toaster.update(id, 'changed', { type: ToastType.SUCCESS });
  assert.equal(ok, false, 'update returns false for exiting toast');
  assert.equal(find(toaster.getState(), id).content, 'x', 'content unchanged');
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'stays exiting (not revived)');
});

test('update on an unknown id is a no-op (no throw)', () => {
  const { toaster } = mk();
  assert.doesNotThrow(() => assert.equal(toaster.update('nope', 'x'), false));
});

// ============================================================================
// Promise integration
// ============================================================================

await testAsync('toast.promise resolves -> updates loading to success (message can be a fn of value)', async () => {
  const { toaster, clock } = mk({ duration: 3000 });
  const p = Promise.resolve(42);
  const ret = toaster.toast.promise(p, {
    loading: 'Saving…',
    success: (v) => `Saved ${v}`,
    error: 'Failed',
  });
  // Loading toast is present immediately.
  settle(clock);
  let s = toaster.getState();
  assert.equal(s.toasts.length, 1);
  assert.equal(s.toasts[0].type, ToastType.LOADING);
  assert.equal(s.toasts[0].content, 'Saving…');

  const value = await ret; // chainable: original value preserved
  assert.equal(value, 42, 'returns the resolved value');
  settle(clock);
  s = toaster.getState();
  assert.equal(s.toasts[0].type, ToastType.SUCCESS);
  assert.equal(s.toasts[0].content, 'Saved 42');
  assert.equal(s.toasts[0].sticky, false, 'success got a real (non-sticky) duration');
});

await testAsync('toast.promise rejects -> updates to error AND the rejection still propagates', async () => {
  const { toaster, clock } = mk();
  const err = new Error('nope');
  const settled = toaster.toast.promise(Promise.reject(err), {
    loading: 'Working…',
    success: 'ok',
    error: (e) => `Error: ${e.message}`,
  });
  await assert.rejects(settled, /nope/, 'rejection propagates to the caller (not swallowed)');
  settle(clock);
  const t = toaster.getState().toasts[0];
  assert.equal(t.type, ToastType.ERROR);
  assert.equal(t.content, 'Error: nope');
  assert.equal(t.sticky, true, 'error toast sticky by default');
});

await testAsync('toast.promise that never settles leaves a sticky loading toast (no leak)', async () => {
  const { toaster, clock } = mk();
  toaster.toast.promise(new Promise(() => {}), { loading: 'Forever…', success: 's', error: 'e' });
  settle(clock);
  await Promise.resolve();
  clock.advance(10 ** 8);
  const t = toaster.getState().toasts[0];
  assert.equal(t.type, ToastType.LOADING);
  assert.equal(phaseOf(toaster, t.id), ToastPhase.VISIBLE, 'loading stays put, never auto-dismisses');
});

await testAsync('toast.promise does NOT collapse with collapseDuplicates: each promise owns its own toast', async () => {
  // Two concurrent promises with identical (default) loading content under
  // collapseDuplicates must NOT collapse into one record; otherwise the later
  // settler clobbers the earlier one's success/error.
  const { toaster, clock } = mk({ collapseDuplicates: true, duration: 3000 });
  const p1 = toaster.toast.promise(Promise.resolve('one'), {
    loading: 'Loading…',
    success: (v) => `done ${v}`,
    error: 'err',
  });
  const p2 = toaster.toast.promise(Promise.resolve('two'), {
    loading: 'Loading…',
    success: (v) => `done ${v}`,
    error: 'err',
  });
  settle(clock);
  assert.equal(toaster.getState().toasts.length, 2, 'two distinct loading toasts, not one collapsed record');

  await Promise.all([p1, p2]);
  settle(clock);
  const contents = toaster.getState().toasts.map((t) => t.content).sort();
  assert.deepEqual(contents, ['done one', 'done two'], 'each promise updated its own toast; neither clobbered the other');
});

// ============================================================================
// dismissAll
// ============================================================================

test('dismissAll() exits every toast; dismissAll(position) scopes to one group', () => {
  const { toaster, clock } = mk({ max: 10, duration: 0 });
  const a = toaster.toast('a', { position: Position.TOP_LEFT });
  const b = toaster.toast('b', { position: Position.TOP_LEFT });
  const c = toaster.toast('c', { position: Position.BOTTOM_RIGHT });
  settle(clock);

  toaster.dismissAll(Position.TOP_LEFT);
  assert.equal(phaseOf(toaster, a), ToastPhase.EXITING);
  assert.equal(phaseOf(toaster, b), ToastPhase.EXITING);
  assert.equal(phaseOf(toaster, c), ToastPhase.VISIBLE, 'other group untouched');

  toaster.dismissAll();
  assert.equal(phaseOf(toaster, c), ToastPhase.EXITING, 'now all exiting');
});

test('dismissAll also clears queued toasts without promoting them', () => {
  const { toaster, clock } = mk({ max: 2, overflow: Overflow.QUEUE, duration: 0 });
  toaster.toast('A'); toaster.toast('B'); toaster.toast('C'); toaster.toast('D');
  settle(clock);
  assert.equal(toaster.getState().groups[0].queued, 2);
  toaster.dismissAll();
  clock.advance(100000); // let exits complete
  assert.equal(toaster.getState().toasts.length, 0, 'queued ones cleared too, none promoted back');
  assert.equal(clock.pending(), 0, 'no leftover timers');
});

// ============================================================================
// Accessibility values (emitted, not rendered)
// ============================================================================

test('emits ARIA politeness per type: errors/warnings assertive(alert), info/success polite(status)', () => {
  const { toaster, clock } = mk({ duration: 0, max: 10 });
  const e = toaster.toast.error('e');
  const w = toaster.toast.warning('w');
  const i = toaster.toast.info('i');
  const s = toaster.toast.success('s');
  settle(clock);
  const st = toaster.getState();
  assert.deepEqual([find(st, e).ariaLive, find(st, e).role], ['assertive', 'alert']);
  assert.deepEqual([find(st, w).ariaLive, find(st, w).role], ['assertive', 'alert']);
  assert.deepEqual([find(st, i).ariaLive, find(st, i).role], ['polite', 'status']);
  assert.deepEqual([find(st, s).ariaLive, find(st, s).role], ['polite', 'status']);
});

test('update() with ariaLive-only or role-only derives the missing partner (matches add path)', () => {
  const { toaster, clock } = mk({ duration: 0, max: 10 });

  // Baseline: add with only ariaLive derives role:'alert' (the add path).
  const onAdd = toaster.toast.info('a', { ariaLive: 'assertive' });
  settle(clock);
  assert.deepEqual(
    [find(toaster.getState(), onAdd).ariaLive, find(toaster.getState(), onAdd).role],
    ['assertive', 'alert'],
    'add: ariaLive-only derives role'
  );

  // update with only ariaLive on an info toast must derive role:'alert' too,
  // not leave a contradictory { ariaLive:'assertive', role:'status' } pair.
  const a = toaster.toast.info('b');
  settle(clock);
  assert.deepEqual(
    [find(toaster.getState(), a).ariaLive, find(toaster.getState(), a).role],
    ['polite', 'status'],
    'info starts polite/status'
  );
  toaster.update(a, undefined, { ariaLive: 'assertive' });
  assert.deepEqual(
    [find(toaster.getState(), a).ariaLive, find(toaster.getState(), a).role],
    ['assertive', 'alert'],
    'update: ariaLive-only derives role:alert (no stale status)'
  );

  // The reverse direction: update with only role must derive ariaLive.
  const b = toaster.toast.info('c');
  settle(clock);
  toaster.update(b, undefined, { role: 'alert' });
  assert.deepEqual(
    [find(toaster.getState(), b).ariaLive, find(toaster.getState(), b).role],
    ['assertive', 'alert'],
    'update: role-only derives ariaLive:assertive (no stale polite)'
  );
});

// ============================================================================
// Reduced motion
// ============================================================================

test('reduceMotion flag is emitted and forces near-zero enter/exit (prompt removal)', () => {
  const { toaster, clock } = mk({ reduceMotion: true, enterDuration: 400, exitTimeout: 400, duration: 1000 });
  assert.equal(toaster.getState().reduceMotion, true, 'flag emitted for the consumer to skip animation');
  const id = toaster.toast('x');
  // enter is near-zero: a single 0-advance settles it to visible.
  clock.advance(0);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'enter collapsed under reduced motion');
  clock.advance(1000); // auto-dismiss -> exiting; fallback is near-zero
  // exit fallback fired within the same advance (0ms), so it is already removed.
  assert.equal(find(toaster.getState(), id), undefined, 'removed promptly without an exit animation');
});

// ============================================================================
// Subscription
// ============================================================================

test('subscribe is called on change and returns a working unsubscribe', () => {
  const { toaster, clock } = mk({ duration: 0 });
  const states = [];
  const off = toaster.subscribe((s) => states.push(s));
  toaster.toast('a');
  settle(clock);
  assert.ok(states.length >= 1, 'notified on add and on the entering->visible transition');
  const last = states[states.length - 1];
  assert.equal(last.toasts[0].content, 'a', 'callback receives current state');
  off();
  const n = states.length;
  toaster.toast('b');
  settle(clock);
  assert.equal(states.length, n, 'no calls after unsubscribe');
});

// ============================================================================
// Tab-blur pause (the one DOM touch) — exercised via a minimal document stub
// ============================================================================

test('pauseOnTabBlur pauses running timers on visibilitychange and resumes on return', () => {
  // Minimal document stub: a single visibilitychange listener + a hidden flag.
  const listeners = new Set();
  const stub = {
    hidden: false,
    addEventListener: (type, fn) => { if (type === 'visibilitychange') listeners.add(fn); },
    removeEventListener: (type, fn) => { listeners.delete(fn); },
  };
  const prev = globalThis.document;
  globalThis.document = stub;
  try {
    const clock = makeClock();
    const toaster = createToaster({ enterDuration: 0, duration: 3000, pauseOnTabBlur: true, clock });
    const id = toaster.toast('x');
    settle(clock);
    clock.advance(1000); // remaining 2000

    stub.hidden = true;
    listeners.forEach((fn) => fn()); // tab backgrounded
    assert.equal(find(toaster.getState(), id).paused, true, 'paused on tab hide');
    clock.advance(100000);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'did not expire while tab hidden');

    stub.hidden = false;
    listeners.forEach((fn) => fn()); // tab foregrounded
    clock.advance(1999);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'resumed with remaining preserved');
    clock.advance(1);
    assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'expired after exactly the remaining 2000ms');

    toaster.destroy();
    assert.equal(listeners.size, 0, 'destroy() removed the visibilitychange listener');
  } finally {
    if (prev === undefined) delete globalThis.document; else globalThis.document = prev;
  }
});

// ============================================================================
// destroy
// ============================================================================

test('destroy clears all timers, drops state, and emits nothing afterward', () => {
  const { toaster, clock } = mk({ duration: 1000, exitTimeout: 500 });
  let calls = 0;
  toaster.subscribe(() => { calls++; });
  toaster.toast('a');
  toaster.toast('b');
  settle(clock);
  const before = calls;
  toaster.destroy();
  assert.deepEqual(toaster.getState().toasts, [], 'state cleared');
  assert.equal(clock.pending(), 0, 'all timers cleared');
  clock.advance(100000);
  assert.equal(calls, before, 'no callbacks fire after destroy');
  // Post-destroy commands are inert no-ops.
  assert.doesNotThrow(() => { toaster.toast('c'); toaster.dismiss('a'); toaster.pause(); });
  assert.deepEqual(toaster.getState().toasts, []);
});

test('collapse refresh restarts the countdown without leaving the old timer alive', () => {
  // Regression: Countdown.start() did not clear a pending timer, so collapsing a
  // duplicate onto a RUNNING toast left two timers — the stale one fired at the
  // original deadline and dismissed the toast early.
  const { toaster, clock } = mk({ collapseDuplicates: true, duration: 4000 });
  const id = toaster.toast('saving');
  settle(clock); // -> visible at t=0, countdown 4000
  clock.advance(2000);
  toaster.toast('saving'); // collapse -> count 2, countdown restarts from 4000
  assert.equal(find(toaster.getState(), id).count, 2, 'collapsed');
  clock.advance(2001); // t=4001 — the OLD deadline has passed
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'survives the stale deadline');
  clock.advance(1999); // t=6000 — the refreshed deadline (2000 + 4000)
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'dismisses at the refreshed deadline');
});

// ============================================================================
// Non-finite-input guards (regression)
// ============================================================================

test('non-finite max (NaN) does not poison the cap — toasts still show and dismiss', () => {
  // Regression: createToaster({ max: NaN }) set config.max = Math.max(1, NaN) = NaN,
  // so every `n < config.max` was false — toasts stuck QUEUED forever, never shown,
  // never auto-dismissed, and the NaN was re-emitted to the consumer via config.max.
  const clock = makeClock();
  const toaster = createToaster({ enterDuration: 0, duration: 1000, exitTimeout: 500, max: NaN, clock });
  assert.equal(toaster.getState().config.max, 3, 'NaN max falls back to default 3 (not NaN)');
  const id = toaster.toast('x');
  settle(clock);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'shown, not stuck queued');
  clock.advance(1000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'auto-dismisses normally');
});

test('non-finite max (Infinity) falls back to the default cap', () => {
  const { toaster } = mk({ max: Infinity });
  assert.equal(toaster.getState().config.max, 3, 'Infinity max falls back to default 3');
});

test('max <= 0 falls back to the default cap (rejected like non-finite)', () => {
  assert.equal(mk({ max: 0 }).toaster.getState().config.max, 3, 'max 0 -> 3');
  assert.equal(mk({ max: -5 }).toaster.getState().config.max, 3, 'negative max -> 3');
});

test('non-finite enterDuration (Infinity) does not wedge a toast in `entering`', () => {
  // Regression: enterDuration fed clock.setTimeout directly with only a `!= null`
  // check. Under a faithful injected clock, clock.setTimeout(fn, Infinity)
  // schedules fireAt=Infinity, so the enter timer never fires — the toast stayed
  // `entering` forever, never became VISIBLE and never auto-dismissed. Now it
  // falls back to the default 200ms enter delay.
  const clock = makeClock();
  const toaster = createToaster({ enterDuration: Infinity, duration: 1000, exitTimeout: 500, clock });
  const id = toaster.toast('x');
  assert.equal(phaseOf(toaster, id), ToastPhase.ENTERING, 'starts entering');
  clock.advance(200); // the default enter delay
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'settled to visible (not wedged in entering)');
  clock.advance(1000);
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'auto-dismiss countdown ran normally');
});

test('non-finite enterDuration (NaN) does not coerce to a 0-delay timer', () => {
  // Regression: NaN fell through `!= null` and reached the clock, where the fake
  // clock's `Math.max(0, ms || 0)` coerced it to a 0-delay enter (off-by phase
  // timing). Now NaN falls back to the default 200ms, so the toast is still
  // ENTERING before that delay elapses.
  const clock = makeClock();
  const toaster = createToaster({ enterDuration: NaN, duration: 1000, exitTimeout: 500, clock });
  const id = toaster.toast('x');
  clock.advance(0); // would settle a wrongly-coerced 0-delay enter
  assert.equal(phaseOf(toaster, id), ToastPhase.ENTERING, 'still entering — NaN did not become a 0-delay timer');
  clock.advance(200);
  assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'settles at the default 200ms enter delay');
});

test('non-finite exitTimeout (Infinity) does not wedge a dismissed toast in `exiting`', () => {
  // Regression: exitTimeout fed clock.setTimeout directly with only a `!= null`
  // check. clock.setTimeout(fn, Infinity) scheduled a fallback-removal timer that
  // never fired, so a dismissed toast (whose consumer never calls remove()) stayed
  // `exiting` forever. Now it falls back to the default 1000ms fallback removal.
  const clock = makeClock();
  const toaster = createToaster({ enterDuration: 0, duration: 1000, exitTimeout: Infinity, clock });
  const id = toaster.toast('x');
  settle(clock); // entering -> visible
  clock.advance(1000); // auto-dismiss -> exiting (consumer never calls remove())
  assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'now exiting, awaiting fallback removal');
  clock.advance(1000); // the default fallback-removal delay
  assert.equal(find(toaster.getState(), id), undefined, 'removed by the fallback timer (not wedged in exiting)');
});

// ============================================================================
// Tab-blur: a toast created/promoted while the tab is already hidden (regression)
// ============================================================================

test('a toast added while the tab is ALREADY hidden begins paused (does not expire backgrounded)', () => {
  // Regression: handleVisibilityChange only paused records that existed at the
  // blur event. A toast created afterward (a background fetch completing while
  // the user is on another tab) ran its full countdown and auto-dismissed while
  // the tab was still hidden, contradicting the documented pauseOnTabBlur.
  const listeners = new Set();
  const stub = {
    hidden: true, // tab is hidden BEFORE the toaster is even constructed
    addEventListener: (type, fn) => { if (type === 'visibilitychange') listeners.add(fn); },
    removeEventListener: (type, fn) => { listeners.delete(fn); },
  };
  const prev = globalThis.document;
  globalThis.document = stub;
  try {
    const clock = makeClock();
    const toaster = createToaster({ enterDuration: 0, duration: 3000, pauseOnTabBlur: true, clock });
    const id = toaster.toast('x'); // added while hidden
    settle(clock); // entering -> visible
    assert.equal(find(toaster.getState(), id).paused, true, 'starts paused because the tab is hidden');
    clock.advance(100000);
    assert.equal(phaseOf(toaster, id), ToastPhase.VISIBLE, 'did NOT expire while the tab stayed hidden');

    stub.hidden = false;
    listeners.forEach((fn) => fn()); // tab foregrounded
    assert.equal(find(toaster.getState(), id).paused, false, 'unpaused on return');
    clock.advance(3000);
    assert.equal(phaseOf(toaster, id), ToastPhase.EXITING, 'runs its full duration only once visible');

    toaster.destroy();
  } finally {
    if (prev === undefined) delete globalThis.document; else globalThis.document = prev;
  }
});

// ============================================================================
// EVICT overflow does not schedule a duplicate enter timer (regression)
// ============================================================================

test('evict overflow promotes the new toast without orphaning a duplicate enter timer', () => {
  // Regression: in the EVICT branch, beginExit(oldest) -> fillFromQueue already
  // called enter() on the just-pushed new record (timer T1); add() then called
  // enter() again, overwriting record.enterTimer with T2 and orphaning T1 — a
  // redundant, uncancelable timer. enter() now clears any pending enter timer.
  const { toaster, clock } = mk({ max: 2, overflow: Overflow.EVICT, enterDuration: 200, exitTimeout: 500, duration: 0 });
  toaster.toast('A');
  toaster.toast('B');
  clock.advance(200); // settle A,B to visible (sticky, no countdown timers => 0 pending now)
  assert.equal(clock.pending(), 0, 'A,B visible and sticky — no timers pending');
  const c = toaster.toast('C'); // evicts A, promotes C
  // Pre-fix this scheduled TWO enter timers for C (one from fillFromQueue, one
  // from add) plus A's exit timer => 3 pending. With enter() clearing the first,
  // it is exactly one enter timer for C + one exit timer for A => 2 pending.
  assert.equal(clock.pending(), 2, 'one enter timer for C + one exit timer for A (no orphan)');
  clock.advance(200); // settle C's single enter timer
  assert.equal(phaseOf(toaster, c), ToastPhase.VISIBLE, 'C settled to visible exactly once');
  assert.equal(clock.pending(), 1, 'only A\'s exit fallback remains pending (no leftover enter timer)');
});

// ============================================================================
// dismissAll exit order matches the documented reverseExitOrder semantics
// ============================================================================

// Observe the order beginExit() runs: every dismissed toast schedules an exit
// fallback timer with the SAME exitTimeout, so the fake clock fires (and removes)
// them in the order beginExit() was called. Capturing removal order = exit order.
function dismissAllExitOrder(opts) {
  const { toaster, clock } = mk({ max: 10, duration: 0, exitTimeout: 500, ...opts });
  const a = toaster.toast('A');
  const b = toaster.toast('B');
  const c = toaster.toast('C'); // creation/insertion order: A (oldest) -> B -> C (newest)
  settle(clock);
  const removed = [];
  toaster.subscribe((state) => {
    for (const id of [a, b, c]) {
      if (!removed.includes(id) && !state.toasts.some((t) => t.id === id)) removed.push(id);
    }
  });
  toaster.dismissAll();
  clock.advance(500); // fire every exit fallback, in beginExit() order
  return removed.map((id) => ({ [a]: 'A', [b]: 'B', [c]: 'C' }[id]));
}

test('dismissAll default (reverseExitOrder:false) exits oldest-first', () => {
  // The JSDoc documents the default as oldest-first; verify the default really
  // begins exit on the oldest toast and proceeds to the newest.
  assert.deepEqual(dismissAllExitOrder({}), ['A', 'B', 'C'],
    'default exits oldest (A) first through newest (C)');
});

test('dismissAll with reverseExitOrder:true exits newest-first', () => {
  assert.deepEqual(dismissAllExitOrder({ reverseExitOrder: true }), ['C', 'B', 'A'],
    'reverseExitOrder:true exits newest (C) first through oldest (A)');
});

// ============================================================================
// Unknown order/overflow enum values throw (silent-fallback-vs-throw)
// ============================================================================

test('unknown order value throws TypeError instead of silently falling back', () => {
  assert.throws(() => createToaster({ order: 'oldest-first' }), TypeError,
    'a typo/unknown order must throw, not behave as newest-last');
  // Valid enum values still construct fine.
  assert.doesNotThrow(() => createToaster({ order: Order.NEWEST_LAST }).destroy());
  assert.doesNotThrow(() => createToaster({ order: Order.NEWEST_FIRST }).destroy());
  // Omitting the option uses the default without throwing.
  assert.doesNotThrow(() => createToaster({}).destroy());
});

test('unknown overflow value throws TypeError instead of silently falling back', () => {
  assert.throws(() => createToaster({ overflow: 'drop' }), TypeError,
    'a typo/unknown overflow must throw, not behave as queue');
  assert.throws(() => createToaster({ overflow: 'evcit' }), TypeError, 'typo of "evict" throws');
  // Valid enum values still construct fine.
  assert.doesNotThrow(() => createToaster({ overflow: Overflow.QUEUE }).destroy());
  assert.doesNotThrow(() => createToaster({ overflow: Overflow.EVICT }).destroy());
});

// ---- summary --------------------------------------------------------------

if (isMain(import.meta.url)) report({ exit: true });
