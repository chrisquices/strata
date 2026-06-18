# hotkey-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding an option,
touching the parser, the chord/sequence matcher, the scope resolution, the typing-guard, the
conflict rule, or the OS handling. It is the definition of "still working."

It mirrors the other engines' suites: layered gates, run in order. A failure at an earlier gate
makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The whole match
  pipeline is driven through `handleEvent(eventLike)` with **synthetic key-event shapes**, and
  the partial-sequence timeout is driven by an **injectable fake clock**, so there is no real
  waiting and no flakiness. Run on every change; if red, stop and fix before anything else.
- **Gate 2 — Browser verification protocol.** The DOM behaviors `node` can't reach: a real
  `keydown` listener attached to `document` firing handlers, `preventDefault` actually stopping
  the browser Save dialog, the typing-guard against a real focused `<input>`, scopes layering
  under a real modal, the pending-sequence indicator, enable/disable and unbind reflected live.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no UI and no CSS, that the
  demo's palette/modal/cheatsheet are entirely consumer-rendered, and that swapping the
  rendering needs no engine change.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs` from the
repository root, then open `http://localhost:8788/demo/hotkey-engine.html`. ES-module imports
are blocked over `file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably testing an
implementation detail, not a guarantee.

1. **Headless.** The engine creates no DOM and ships no CSS. It owns the *logic* of keyboard
   shortcuts — parsing, the binding store, chord/sequence matching, scopes, the typing-guard,
   conflict resolution, OS-modifier resolution — and fires the matched handler. It exposes the
   registered bindings (`getBindings()`) and the live matching state (`getState()` +
   `subscribe()`/`onChange`/`on()`). There is no command palette, no cheatsheet, no modal — the
   consumer renders those.
2. **Registration + matching is the product.** The consumer registers bindings (`bind(keys,
   handler, opts)`); the engine attaches one `keydown` listener, normalizes each event to a
   canonical combo, and fires the matching binding — resolving chords vs. sequences vs. conflicts,
   honoring active scopes and the typing-guard.
3. **Pure, DOM-optional core.** All the hard logic is reachable without a DOM. `handleEvent(evt)`
   takes an event-LIKE object (`{ key, ctrlKey, metaKey, shiftKey, altKey, repeat, target }`) and
   runs the full pipeline; the live listener just funnels real `KeyboardEvent`s into it.
   Constructing the engine and registering bindings must not throw with no `document` (SSR/Node).
   The only DOM touched at all — attaching the `keydown`/`blur` listeners, reading the event
   target and `navigator` — is inside method bodies behind capability checks, never at module
   scope.
4. **Injectable clock.** The partial-sequence timeout comes from an injected `{ now, setTimeout,
   clearTimeout }` (defaulting to the real one), so the sequence state machine is deterministic
   and unit-testable without real waiting.
5. **Modifier exactness.** `ctrl+k` fires on Ctrl+K but **not** Ctrl+Shift+K — the canonical combo
   carries the exact modifier set; matching is a Map lookup, so there is no loose matching.
6. **Cross-platform `mod`.** One binding (`mod+s`) is Cmd+S on macOS and Ctrl+S on Windows/Linux.
   The OS is detected once (overridable via `os` for tests) and `mod` is resolved at parse time.
7. **The typing-guard.** Bare letter/sequence shortcuts do **not** fire while the user types in an
   `<input>`/`<textarea>`/`contentEditable`; modifier-chords (`Cmd+S`) still do, as does any
   binding flagged `enableInInput`, plus a small allow-list (`Escape` by default).
8. **Dependency-free.** Zero runtime dependencies beyond the in-repo `shared/` helpers. This file
   imports only `Emitter` from `../shared/emitter.js`.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/hotkey-engine/hotkey-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **59**).

The suite (`tests/hotkey-engine/hotkey-engine.test.mjs`, harness in
`tests/hotkey-engine/harness.mjs`) feeds synthetic key-event shapes to `handleEvent()` and drives
the sequence timeout with a fake clock — `advance(ms)` fires due timers in chronological order —
so every timing assertion is exact. Coverage maps directly to the invariants:

| Area | What it pins |
| --- | --- |
| Headless import | The static `import` proves module scope is DOM-free; `createHotkeys()` constructs and binds with no `document` (`attached:false`, no throw); `getState()` is valid synchronously. |
| Import boundary | The engine source imports **only** from `../shared/` (asserted by scanning its `from` specifiers). |
| Parsing | string→canonical for chords (modifier-order independence, `cmd/command/meta` etc. aliases, case-insensitivity) and sequences (space-separated, chords-as-steps); the plus key; **invalid strings throw** (empty, no main key, multiple main keys). |
| `mod` resolution | `mod+s` parses to `meta+s` under forced-mac and `ctrl+s` under forced-win/linux. |
| Shift-symbol | `shift+/` normalizes to the base symbol (bind the produced glyph `?`); `?` is its own no-modifier combo; **letters keep shift** (`shift+a` ≠ `a`); an uppercase letter in a binding is the letter, not shift. |
| eventToCombo | basic chords, named keys, space; a **lone modifier/lock keydown → `null`**; Shift+/ ⇒ `?` (shift absorbed); Shift+A ⇒ `shift+a`. |
| **Chord matching** | the right binding fires; **modifier exactness** (an extra modifier ⇒ no match); nothing fires when unbound; `preventDefault` default-true, suppressible per binding; `stopPropagation` opt-in; **multiple key strings → one handler**. |
| **`mod` cross-platform** | the *same* `mod+s` binding matches `metaKey` on mac and `ctrlKey` on win, and does **not** match the other platform's modifier. |
| **Sequences** | `g g` fires on two `g`s; a partial resets at the timeout (fake clock) and on a non-continuing key; `g i` is distinct from `g g`; chords-as-steps (`ctrl+x ctrl+s`); **standalone-vs-prefix precedence** — fire the longer if it completes in time, else the shorter (timeout) or the standalone-then-the-interrupting-key (non-continuing); a lone modifier between steps doesn't break it; per-binding `sequenceTimeout` override; `getPendingSequence()` + `on('sequence')` track progress and reset. |
| **Scopes** | bindings fire only in active scopes; global is always active; **precedence/shadowing** (contextual beats global; topmost on the stack wins); `push/pop/set/activate/deactivate` + `getActiveScopes()`; a scope change resets an in-progress sequence. |
| **Typing-guard** | a bare key/sequence is suppressed against input/textarea/contentEditable/select; modifier-chords + `enableInInput` still fire; `Escape` is allowed in inputs by default (`allowKeys`); non-text input types (checkbox/button) are not typing; a custom `isTyping` predicate overrides the built-in detection. |
| **Conflict resolution** | two bindings on the same key in the same scope → **last-registered wins**; `getConflicts()` reports the group; the same key in *different* scopes is not a conflict. |
| Repeat guard | a held key (`event.repeat`) does not re-fire unless the binding sets `repeat:true`, and never advances a pending sequence. |
| Lone modifier | pressing only Shift/Ctrl/Alt/Meta matches nothing and disturbs no sequence. |
| Enable/disable | a disabled engine matches nothing and clears any pending sequence; re-enabling resumes with bindings intact. |
| Unbind/re-bind | unbind by handle, by id, and by key string; **the handle emits a change** (state stays in sync); an explicit id re-binds in place (no duplicate); `unbindAll(scope?)`; the sequence prefix index stays consistent after unbinding a sequence. |
| trigger | fires a binding (chord or sequence) by key string, bypassing the typing-guard; respects scope activeness; unbound → false. |
| State | `getBindings()` returns key strings + descriptions (never the handler) and filters by scope; **`onChange` is not called synchronously during construction** (no temporal-dead-zone trap on `const hk = createHotkeys({ onChange })`); the first emit is deferred a microtask; `on('fire')` emits a context per fired binding. |
| Lifecycle | multiple instances don't cross-fire; **`destroy()` mid-sequence clears the timer (no leak)** and is inert afterward; `attach()` adds exactly **one** `keydown` listener (not one per binding) and `detach()` removes it; a **window `blur` resets** a pending sequence; `defaultClock()` exposes `now/setTimeout/clearTimeout`. |

**Also confirm nothing else regressed** (run each; all green in this build):
`toast-engine` (39), `selection-engine` (43), `sortable-engine` (37), `drag-n-drop-engine` (43),
`datetime-engine` (60), `color-engine` (44), `gestures` (21), `transform2d` (20),
`virtualization-engine` (25), `image-cropper-engine` (42), `media-engine` run-all (68).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/hotkey-engine.html`. The demo (`demo/hotkey-engine.js`)
is a reference **consumer**: it registers a variety of bindings and renders the palette, modal,
cheatsheet, pending indicator, flash toast and nav cursor from the engine's state. Each check
below was confirmed in a real browser session against this build by dispatching genuine
`KeyboardEvent`s.

1. **Chords fire.** `⌘K` opens the command palette and the live `scopes` strip shows
   `global › palette`; `⌘K` again toggles it closed (back to `global`). State carries the
   binding; the overlay is the demo's.
2. **`preventDefault` stops the browser dialog.** `⌘S` produces a "Saved ✓" flash and the
   dispatched event's `defaultPrevented` is **true** — the browser's Save dialog never opens.
   A binding with `preventDefault:false` (verified in Gate 1) leaves it `false`.
3. **A Shift+symbol chord works.** `?` (Shift+/) toggles the keyboard-help overlay — the engine
   matched the produced glyph, not `shift+/`.
4. **Sequences fire with a live pending indicator.** Pressing `g` lights the **pending** box as
   `g …` (it is held, being the prefix of `g g`/`g i`); a second `g` completes `g g` ("↑ Top"
   flash) and the indicator clears to `·`; `g i` highlights the Inbox panel.
5. **Scopes — a modal pushes a scope.** "Open dialog" → `scopes` shows `global › modal`. Inside,
   `Esc` closes the dialog and **does not** clear the global nav selection — the modal's `Esc`
   *shadows* the global `Esc`. `⌘↵` (a binding that exists **only** in the modal scope) confirms
   ("Settings saved ✓"). With no modal open, the global `Esc` clears the nav selection.
6. **The typing-guard.** Focusing the text input and pressing `j`/`k` does **not** move the nav
   cursor (the bare shortcuts are suppressed — you can type "jkjk gg ?" freely), and a bare `g g`
   never starts a pending sequence there — while `⌘S` **still** fires ("Saved ✓") because it
   carries a modifier. Blurring the input restores `j`/`k`.
7. **Enable/disable.** "Disable engine" flips `enabled` to `disabled`; `⌘S`/`⌘K` then do nothing
   (no flash, `defaultPrevented:false`, palette stays shut). Re-enabling resumes immediately.
8. **Unbind / re-bind reflected live.** "Unbind ⌘K" drops the binding — the `bindingCount` and
   the cheatsheet both fall (12 → 11) and `⌘K` no longer opens the palette. "Re-bind ⌘K" restores
   it (11 → 12).
9. **Cheatsheet from `getBindings()`.** The whole table at the bottom (and the `?` overlay) is
   built from `getBindings()` grouped by scope (Global / palette / modal / help), with
   platform-aware key labels (`⌘S`, `g g`, `⌘↵`). It re-renders on every `change`.
10. **No console errors** at any point (only the demo's one ready log).

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it renders nothing. These checks confirm the boundary holds.

1. **No DOM, no CSS in the engine.** `hotkey-engine.js` contains no `document.createElement`, no
   stylesheet, no markup, no palette/modal/cheatsheet component. Its only DOM references are
   `target.addEventListener('keydown', …)`, `window.addEventListener('blur', …)`, the event
   *target* read for the typing-guard, and `navigator` for OS detection — all inside methods
   behind `typeof` capability checks. The clean Node import (Gate 1) proves none of it runs at
   module scope.
2. **The demo's UI is entirely consumer-rendered.** Every element, class, color, the command
   palette, the modal, the cheatsheet table, the pending `g…` indicator, the flash toast, the nav
   cursor — all live in `demo/hotkey-engine.html` / `demo/hotkey-engine.js`. Delete the demo and
   the engine is unchanged and still fully tested by Gate 1.
3. **Swapping the rendering needs no engine change.** The consumer reads only emitted values —
   `getBindings()` (keys, description, scope, sequence/length flags), `getState()` (`enabled`,
   `platform`, `mod`, `scopes`, `pending`, `bindingCount`), `getPendingSequence()`, and the
   `change`/`sequence`/`fire` events — and calls `bind`/`unbind`/scope/enable. A completely
   different renderer (different markup, different framework, or none) consumes the same surface
   with zero edits to `hotkey-engine.js`. The engine fires handlers and exposes state; the
   consumer owns all rendering.
4. **Framework-agnostic.** The model is `bind(keys, handler, opts)` + scope calls + one listener
   that matches and fires. No framework imports, no JSX, no lifecycle. It works in React (bind in
   an effect, unbind on cleanup via the returned handle), Vue, Svelte, or vanilla identically.

---

## 5. Known scope boundaries (by design)

- **No UI** — no command palette, no cheatsheet component, no modal. The engine fires handlers and
  exposes `getBindings()` for a consumer to render its own. (A command palette is a separate thing
  built *on top* of this engine, not this engine.)
- **No mouse/pointer/gesture input** — keyboard only. (Pointer is `shared/gestures` and the other
  engines.)
- **No global/OS-level hotkeys** — this is in-page (web) keyboard handling, not system hotkeys
  (not possible from a web page anyway).
- **No key remapping / macros / recording** — register-and-fire bindings; not a macro recorder.
- **`event.key`-based matching (a documented tradeoff).** Letter/symbol bindings follow the
  *produced character*, so they are layout-aware: on a non-US layout, a binding for `?` follows
  wherever that glyph is produced. Positional (`event.code`) binding is intentionally **not**
  exposed in this build; `event.key` is the right default for the letter/symbol shortcuts this
  engine targets.
- **Conflict policy is last-registered-wins** within a scope (deterministic override), surfaced
  via `getConflicts()`. It does not fire all colliding handlers.
- **No host coupling** — stores, services, routing, design tokens, framework hooks. The engine
  takes bindings + key events and fires handlers / exposes binding state.
