# toast-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an
option, touching the lifecycle state machine, the timer math, overflow, dedup, or
promise handling. It is the definition of "still working."

It mirrors `media-engine` and `virtualization-engine`'s suites: layered gates, run in
order. A failure at an earlier gate makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The
  whole lifecycle and every timer behavior are driven by an **injectable fake clock**,
  so there is no real waiting and no flakiness. Run on every change; if red, stop and
  fix before anything else.
- **Gate 2 — Browser verification protocol.** The DOM behaviors `node` can't reach:
  enter/exit animations actually running through the exit handshake, hover-to-pause,
  tab-blur pause, multiple positions stacking, overflow + "+N more", the promise
  toast transitioning, reduced-motion. Run after meaningful changes.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no DOM and no CSS,
  that the demo's toast UI is entirely consumer-rendered, and that swapping the
  rendering needs no engine change. Run after any change to what the engine emits.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs` from
the repository root, then open `http://localhost:8788/demo/toast-engine.html`.
ES-module imports are blocked over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Headless.** The engine creates no DOM and ships no CSS. It manages the *state* of
   a set of toasts — which exist, their order, position group, remaining time and
   lifecycle phase — and emits it via `getState()` + `subscribe()`/`onChange`. The
   consumer renders every visible toast, positions the containers, and applies all
   styling and enter/exit animation. There is no built-in toast component, no default
   look.
2. **State out, paint in.** Everything visual is emitted state (phase, order index,
   `remaining`, `queued` count, suggested `role`/`ariaLive`, `reduceMotion`, spacing
   hints). The engine never touches a toast's element.
3. **The consumer owns animation; the engine owns timing.** The engine emits phases
   (`entering` → `visible` → `exiting`) and *when* they change. Exit is a handshake:
   the engine marks a toast `exiting` and removes it on the consumer's `remove()` **or**
   a fallback timeout, whichever is first — so an exit animation is possible but never
   required, and a toast can't wedge in `exiting`.
4. **Pure, DOM-optional core.** The queue/timer logic runs headless: constructing a
   toaster and queuing toasts must not throw with no `document` (SSR/Node). The only
   DOM touched at all is `document.visibilitychange` (tab-blur pause) and
   `matchMedia('(prefers-reduced-motion)')`, both behind capability checks inside
   methods — never at module scope.
5. **Injectable clock.** All time comes from an injected `{ now, setTimeout, clearTimeout }`
   (defaulting to the real one), so timer/lifecycle behavior is deterministic and
   unit-testable without real waiting. This is the key testability decision.
6. **Remaining-time fidelity.** Pause/resume preserves the *remaining* time exactly
   (pausing at 3s into a 5s toast and resuming continues for 2s, not a fresh 5s).
7. **Content-agnostic.** `content` is opaque — string, object, anything. The engine
   never interprets or renders it; the consumer's render function decides.
8. **Dependency-free.** Zero runtime dependencies beyond the in-repo `shared/` helpers.
   This file imports only `Emitter` from `../shared/emitter.js`.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/toast-engine/toast-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **39**).

The suite (`tests/toast-engine/toast-engine.test.mjs`, harness in
`tests/toast-engine/harness.mjs`) drives a fake clock — `advance(ms)` fires due timers
in chronological order, moving the virtual `now` to each as it fires — so every timing
assertion is exact. Coverage maps directly to the invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createToaster()` constructs and queues with no `document`; `getState()` is valid synchronously. |
| Import boundary | The engine source imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| Phase transitions | `entering` emitted on add; `visible` only after `enterDuration`; the auto-dismiss timer runs **only** in `visible`, then `exiting`. |
| **Remaining time** | Pause at 3s into a 5s toast → exactly 2s left; frozen across a long pause; resumes for exactly the remainder. Tab-blur and global `pause()`/`resume()` use the same path. |
| **Exit handshake** | Stays `exiting` (not dropped); removed on `remove()` **and**, separately, by the fallback timeout when the consumer never signals; the other timer is cleared (no double remove). |
| Dismiss edge cases | `dismiss` during `entering` jumps cleanly to `exiting` (the enter timer can't revive it); `remove`/`dismiss`/`update` on an unknown/removed id is a no-op. |
| Sticky | `duration: 0` and `Infinity` never auto-dismiss; errors and loading default to sticky; explicit duration overrides. |
| Overflow | `queue` holds extras and promotes oldest-queued FIFO as slots free, emitting `queued`; `evict` begins exit on the oldest so the newest always shows; churn leaks no timers and loses no toasts. |
| Order | `newest-first`/`newest-last` control display order and `index`; groups emitted in canonical position order. |
| Dedup | A re-used id updates in place (no duplicate, timer reset); `collapseDuplicates` collapses identical content with a `count`. |
| Update | Changes content/type in place, resets the timer by default (Loading→Success gets a fresh duration), keeps remaining with `resetTimer:false`, and is ignored once `exiting`. |
| Promise | Resolve → success (message can be a fn of the value), returns the value (chainable); reject → error **and the rejection still propagates**; never-settles → sticky loading, no leak. |
| dismissAll | Exits all, or all in one group; clears queued without promoting them; no leftover timers. |
| Accessibility | Emits `assertive`/`alert` for error & warning, `polite`/`status` for info & success. |
| Reduced motion | Flag emitted; forces near-zero enter/exit so removal stays prompt without an animation. |
| Tab-blur | Via a minimal `document` stub: `visibilitychange`→hidden pauses running timers (preserving remaining), return resumes; `destroy()` removes the listener. |
| destroy | Clears all timers, drops state, removes listeners, emits nothing afterward; post-destroy commands are inert no-ops. |

**Also confirm nothing else regressed:**
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/media-engine/run-all.mjs` (68),
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/toast-engine.html`. The demo
(`demo/toast-engine.js`) is a reference **consumer**: it renders toast elements from
the engine's emitted state and owns all markup, CSS and animation.

Each check below was confirmed in a real browser session against this build.

1. **Four types render, styled differently.** Info / Success / Warning / Error buttons
   each produce a toast with a distinct icon and accent color, newest on top.
   *Expected:* state carries only `type` (a tag); all appearance is the demo's CSS.
2. **Enter & exit animations run through the handshake.** A toast slides in
   (`entering`→`visible`). On dismiss it is held in `exiting` (still present in state),
   the CSS exit transition plays, and the consumer's `transitionend` then calls
   `remove(id)` — verified: after `dismiss` the toast is `exiting` and present; after
   the `transitionend` signal it leaves state and the DOM node detaches. The engine's
   `exitTimeout` fallback removes it even if the signal never comes.
3. **Hover pauses and preserves remaining time.** Hovering a toast fires
   `pause(id)`; its `remaining` froze at a fixed value across an 800ms wait
   (e.g. **3196ms → 3196ms**), `paused` was true, and the progress bar's CSS
   `animation-play-state` was `paused` in lockstep. Leaving fires `resume(id)`.
4. **Tab-blur pauses.** Overriding `document.hidden` and dispatching
   `visibilitychange` paused every running timer (`paused: true` for all); returning
   resumed them — so a toast does not silently expire on a backgrounded tab.
5. **Multiple positions stack correctly.** Toasts sent to `top-left`,
   `bottom-center`, `bottom-right` render in those corners (top-left at the top-left
   origin; bottom regions anchored to the viewport bottom; center horizontally
   centered). Bottom regions stack from the corner outward (`column-reverse`) — a pure
   consumer layout choice.
6. **Max-visible + overflow.** With `queue`, "Spam 6" shows 3 and a **"+3 more"** pill;
   dismissing a visible toast promotes the oldest-queued in its place. With `evict`,
   adding past the cap keeps the newest 3 and queues nothing.
7. **Promise toast transitions.** "Promise → resolve" shows a sticky **loading**
   toast, then updates the *same* toast to **success** with a fresh (non-sticky)
   duration and a message computed from the resolved value; the returned promise still
   yields the value. "Promise → reject" updates to a sticky **error**.
8. **Reduced motion skips animation but removal stays prompt.** With the flag applied,
   the toast's computed `transition-duration` is `0s`, there is no entering fade, and
   the progress bar is hidden — while the engine's near-zero exit fallback (Gate 1)
   keeps removal timely without depending on an animation callback.
9. **Errors don't auto-vanish unread.** An error toast is sticky by default (no
   progress bar, never auto-dismisses) until dismissed.
10. **No console errors** at any point.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing. These checks confirm the boundary
holds.

1. **No DOM, no CSS in the engine.** `toast-engine.js` contains no `document.createElement`,
   no stylesheet, no markup, and no default toast component. Its only DOM references are
   `document.addEventListener('visibilitychange', …)` and `window.matchMedia(…)`, both
   inside methods behind `typeof` capability checks. Grep confirms it, and the clean
   Node import (Gate 1) proves none of it runs at module scope.
2. **The demo's toast UI is entirely consumer-rendered.** Every element, class, color,
   icon, transition and the "+N more" pill lives in `demo/toast-engine.html` /
   `demo/toast-engine.js`. Delete the demo and the engine is unchanged and still fully
   tested by Gate 1.
3. **Swapping the rendering needs no engine change.** The consumer reads only emitted
   values — `phase`, `index`, `position`, `remaining`, `sticky`, `paused`, `count`,
   `queued`, `role`, `ariaLive`, `reduceMotion`, and the `config` spacing hints. A
   completely different renderer (different markup, different animation library,
   different framework, or none) consumes the same state with zero edits to
   `toast-engine.js`. The engine emits grouping + order + hints; the consumer owns
   positioning and animation. This is the same seam `virtualization-engine`'s layout
   strategies have.
4. **Content is opaque.** The demo renders a plain string and a `{ title, description }`
   object from the *same* engine; the engine never inspects `content`. Any consumer
   data rides along untouched on each toast.

---

## 5. Known scope boundaries (by design)

- No default toast UI, CSS, or component — the engine renders nothing.
- No sound, no system notifications, no persistence across reloads.
- No positioning CSS / pixel math / transforms — the engine emits grouping, order and
  optional index hints; the consumer positions and animates.
- No content interpretation, and no host coupling (stores, routing, framework hooks).
- The browser element-height / animation specifics are the consumer's; the engine only
  emits timing and state.
