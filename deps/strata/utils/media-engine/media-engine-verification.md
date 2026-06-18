# media-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — adding a
renderer, a control, changing the gesture rules or the WSOLA core, anything. It is
the definition of "still working."

It mirrors `virtualization-engine`'s suite: layered gates, run in order. A failure at an
earlier gate makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser.
  Run on every change. If red, stop and fix before anything else. This is the net
  that should grow the most as the engine grows.
- **Gate 2 — Browser verification protocol.** The DOM/playback behaviors `node`
  can't reach (open/close/navigate, zoom/pan feel, seek/scrub, caption timing,
  autoplay, PiP, cast, focus trap, reduced-motion). Run after meaningful changes.
- **Gate 3 — Edge-case suite.** The §11 quirks. Run after any change to lifecycle,
  preloading, or a renderer's load/teardown.
- **Gate 4 — Headless-boundary + seam checks.** Confirms the engine ships no CSS
  and works under a foreign styling system, and that a new renderer drops in with
  zero shell edits. Run after any change to how the engine writes to the DOM, or to
  the renderer contract.

**Prerequisites for the browser gates:** serve over HTTP (`npm test` covers Gate 1;
for the demo run `node demo/server.mjs` from the repository root, then open
`http://localhost:8788/demo/media-engine.html`). ES-module imports are blocked over
`file://`. To play the video item, drop any `sample.mp4` into the top-level `demo/`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Headless.** The engine creates no chrome DOM and ships no CSS. It writes only
   geometry/playback to the media elements it is handed (an image's
   `transform`/`width`/`height`/`transform-origin`; the standard
   `HTMLMediaElement` properties) and manages focus/fullscreen on targets it's told
   to. Everything visible — backdrop, buttons, scrubber, captions styling,
   thumbnails, waveform — is consumer chrome painted from emitted state.
2. **Pure cores.** transform math, gesture conflict resolution, VTT parse + cue
   timing, the WSOLA stretch core, waveform peaks, and the queue/A-B logic are
   DOM-free and import cleanly in Node. All DOM access is confined to method bodies
   in the shell, renderers, casting, and the pitch-speed/​waveform graph builders.
3. **Uniform renderer contract.** The shell drives every renderer through
   `mount/unmount/activate/deactivate/handleKey/isZoomed/getCapabilities/getState/on`
   and never branches on media type. Capabilities are descriptors, not booleans;
   runtime-varying capability is emitted, not polled.
4. **State out, paint in.** Every visual thing is emitted state. The engine ships no
   defaults for appearance; the demo is the only place defaults live.
5. **State ownership.** Each renderer owns its view/playback state for the session;
   `deactivate()` retains it (resume where you left off). The shell owns only
   `currentIndex` and lifecycle.
6. **Seam.** Adding a media type is "write a renderer + register it" — never "modify
   the shell." The same property `virtualization-engine`'s layout strategies have.
7. **Swappable WSOLA core.** `wsolaStretch` is replaceable by a Tier-2 phase vocoder
   with the same `(samples, ratio, opts) → samples` signature, touching nothing else.
8. **Independent speed & pitch.** Speed is native (`playbackRate` + `preservesPitch`);
   pitch is the WSOLA worklet at net tempo 1. They compose without interfering.
9. **Graceful degradation.** Missing/slow/failed media, blocked autoplay, absent
   cast/PiP/fullscreen APIs, unparseable VTT — all degrade to emitted state, never
   throw.
10. **Dependency-free.** Zero runtime dependencies. Casting is the native Remote
    Playback API.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/media-engine/run-all.mjs`.
**Pass:** exit code 0, all media-engine tests pass (currently **68**).

Run a single media-engine test directly, e.g. `node tests/media-engine/queue.test.mjs`.
The core modules are verified with `node tests/transform2d/transform2d.test.mjs`
and `node tests/gestures/gestures.test.mjs`.

This gate also doubles as the **headless-core design check**: the tests import the
root `media-engine.js` module in Node. If it touched the DOM at module scope, the
import would throw. The pitch AudioWorklet source is embedded and only materialized
inside `createPitchSpeed()`.

**What it covers (per file):**

- **tests/transform2d/transform2d.test.mjs (20).** Fit math (contain/cover/no-upscale) and the emitted
  matrix; zoom-to-point keeps the pointed location fixed; pan scales with zoom; bounds
  clamping is zoom- and rotation-aware; rotation matrix + wrap; flip; double-tap target
  toggling; `isZoomed`; capability descriptor; reset; no-dimension/zero guards.
- **tests/gestures/gestures.test.mjs (21).** `classifyDrag` angle bands; tap vs double-tap (timing +
  distance); axis-lock; zoomed→pan vs not-zoomed→nav/dismiss; flick velocity commit;
  drag suppresses tap; two-finger pinch + two-finger pan; second finger aborts nav and
  begins pinch; one-finger-lift-mid-pinch → pan (no tap); wheel zoom + clamp; reset.
- **subtitles.test.mjs (12).** Timestamp forms; cue ids/multi-line/NOTE skip; `\r\n`;
  malformed-cue drop; sort; half-open active interval; overlapping cues; gaps; the
  `changed` flag; reset.
- **queue.test.mjs (13).** next/prev clamp vs wrap; `onEnded` advance/stop/repeat;
  play-once-and-stop overriding repeat; jump clamp; setItems; A-B ordering/degenerate/
  loop-at-b/clear.
- **waveform.test.mjs (7).** Max-|sample| peaks; bucket clamp; empty; normalize;
  signed min/max envelope; mono mixdown; peaks from a fake AudioBuffer.
- **pitch-speed.test.mjs (13).** semitone↔ratio; Hann COLA; resampler length +
  interpolation; WSOLA stretch preserves pitch while changing length; pitch-shift
  preserves length while changing pitch (~2× / ~0.5×); ratio-1 passthrough; the
  streaming engine streams ~1:1 and shifts pitch ~2×; reset.
- **casting.test.mjs (3).** `isCastableSource` scheme rules (http(s)/relative castable;
  blob/data/file/mediastream not; empty not).
- **renderer-interface.test.mjs (8).** Registry register/resolve/create/has/types;
  unknown-type throw; **the seam** (a novel renderer type registers and resolves with no
  shell change); `defineRenderer` defaults.
- **shell.test.mjs (12).** Against a minimal DOM stub + a fake renderer: open
  OPENING→OPEN; preload window ±N mounts neighbors and activates only the current;
  navigation shifts the window (unmount the one that left, mount the new, deactivate old
  / activate new); **handleKey delegation + fallback**; Escape close (and
  `closeOnEscape:false`); INTENT navigate/dismiss routing; autoplay-on-arrival; wrap vs
  clamp; single-item no-op; preload radius; teardown removes slots + key listener; the
  generation guard (close during opening can't resurrect OPEN).

**Golden vs invariant.** Most assertions are invariants (a fixed point stays fixed; a
length ratio; a frozen enum). A few WSOLA/length checks use **tolerances** because
WSOLA can't place a frame past the input edge and the Hann window is stored as Float32
(~6e-8 COLA error) — those are documented inline; widen them only with a reason.

---

## 3. Gate 2 — Browser verification protocol

Serve and open `demo/media-engine.html`. The reference demo is the consumer; everything below is checked
through it (or the preview console). Pass criteria are **invariants**; specific pixel
numbers vary by window size.

### T1 — Open / close / lifecycle
Click a tile. **Pass:** backdrop fades in; the current media shows; counter reads
"N of M"; `Esc` (or ✕, or backdrop click) closes; on close the stage is emptied
(`document.getElementById('stage').children.length === 0`) and focus returns to the
launcher tile. Phases fire `opening → open` then `closing → closed`.

### T2 — Navigation & preloading
Arrow keys / nav arrows / thumbnail clicks. **Pass:** navigation is instant (neighbors
were preloaded); the counter and title update; at the ends it **wraps** (demo sets
`wrap:true`); a previously-zoomed image or half-played audio **resumes its state** when
navigated back to (state retained across deactivate). Spam next/prev: no console errors,
no leaked elements (stage child count stays ≈ preload window size).

### T3 — Image zoom / pan feel
Scroll-to-zoom (anchored at the cursor), pinch on touch, double-click/tap toggles
fit ⇄ 100% **at the pointed location**, drag to pan when zoomed (stops at the image
edge — no rubber-band), `+`/`-` keys, rotate/flip/fit/reset tools.
**Pass:** the point under the cursor stays put while zooming; pan never reveals empty
space; after rotation the pan bounds and fit recompute (the rotated image still fits);
the zoom % label tracks `transform.scale`.

### T4 — Not-zoomed gestures (the §7 rules, live)
Not zoomed: horizontal drag navigates, downward drag dismisses (closes), once an axis
is chosen it locks. Zoomed: drag always pans (no navigate/dismiss). Two fingers pinch
+ pan; lifting one finger continues as a one-finger pan with no tap.
**Pass:** matches the rules; a fast horizontal flick navigates even on a short drag.

### T5 — Video playback (Plyr-shaped)
Drop a `sample.mp4` in the top-level `demo/`. **Pass:** play/pause (button, big overlay, `Space`/`k`,
tap toggles controls); scrubber tracks `currentTime` with a buffered fill; `←/→` seek,
`↑/↓` volume, `0–9` percent-seek, `m` mute, `l` loop, `,`/`.` frame-step while paused;
speed menu changes `playbackRate`; PiP toggles; on a 404 source the **error state**
shows (verified in the demo without a file).

### T6 — Captions (cue module, not native track)
With a video + VTT track. **Pass:** captions appear/disappear on cue boundaries (the cue
module's timing); the text is whatever the consumer renders, styled by emitted prefs
(change `setCaptionStyle({...})` → the overlay restyles, engine unchanged); a gap shows
no caption; switching tracks / turning off works; **no native caption painting** (the
`<track>` is not `showing`).

### T7 — Autoplay policy
Set `options.video.autoplay = true`. **Pass:** an unmuted autoplay that the browser
blocks falls back to muted autoplay; `getState().renderer.autoplay` reports
`{attempted, muted, blocked}` honestly — it never silently fails.

### T8 — Audio: waveform, speed, pitch, A-B, queue
Open the synth-tone item. **Pass:** the waveform draws from peaks (or a decode) and its
progress colors as it plays; the scrubber/time track playback; speed menu changes tempo
with **no pitch change** (native `preservesPitch`); the pitch menu shifts pitch with
**no tempo change** (WSOLA worklet — listen for artifacts at larger shifts, expected for
Tier 1); A-B sets a segment and loops within it; with a multi-audio gallery, end-of-track
auto-advances per repeat/play-once.

### T9 — Casting (Chromium; needs a device)
On Chrome with a cast-capable device reachable: **Pass:** the cast button appears only
when a device is available; `prompt()` opens the native picker; connect/disconnect update
state; on disconnect, local playback resumes at the retained position. On Firefox/Safari
or with a `blob:`/`data:` source, the button stays hidden (`unsupported`) — no error.

### T10 — Focus trap, scroll lock, ARIA
**Pass:** while open, `Tab`/`Shift+Tab` cycle within the viewer (focus never escapes to
the page); the background doesn't scroll; on close focus returns to the invoker;
`getState().aria` provides role/label/counter for the consumer to apply.

### T11 — Fullscreen & theater
`f` / the fullscreen button. **Pass:** the container goes fullscreen and `fullscreen`
state emits; where the API is absent, `fullscreenFallback` is true and the consumer can
render a full-window layout. Theater toggles `theater` + `dimLevel`.

### T12 — Reduced motion
With OS "reduce motion" on (or force `reducedMotion`): **Pass:** `getState().reducedMotion`
is true and the engine uses 0ms transition timing (open/close are instant); the demo
drops its CSS transitions.

---

## 4. Gate 3 — Edge cases & quirks (§11)

Reproduce each; expected behavior is graceful (no throw/NaN, no leak).

| # | Case | Expected |
|---|------|----------|
| 1 | Single-item gallery | one slot; nav arrows hidden; next/prev no-op (Gate 1 covers) |
| 2 | Mixed types in one gallery | routed per item; a playing video/audio **pauses on navigate-away** |
| 3 | Open at arbitrary index (incl. last) | first-class; preload window clamps at the ends |
| 4 | Very large / slow / failed image | loading state; navigation not blocked; error lets you skip past |
| 5 | Rapid navigation (spam) | preloads/teardowns don't leak or race; `unmount` safe mid-load |
| 6 | Unmount mid-transition (close while opening) | no resurrection of OPEN (Gate 1 generation-guard test); clean teardown |
| 7 | Autoplay blocked | detected; muted fallback; reported, not silent (T7) |
| 8 | Cast disconnect mid-playback / source change while casting | resume locally at retained position; re-evaluate availability |
| 9 | Subtitle gaps / overlaps / dynamic track changes | empty when gapped; all overlaps active; `emitTracks` on change |
| 10 | iOS `<video>` takeover / device volume | `canSetVolume:false` flag so the consumer hides a dead control |
| 11 | Pitch/speed rapid changes mid-playback | worklet ratio updates without crashing; ~tens-of-ms latency tolerated |
| 12 | Zoom edge cases | pan-bounds after rotation; zoom-to-point at min/max; double-tap vs drag (Gate 1) |
| 13 | Focus restore + scroll restore on close | invoker refocused; body overflow restored |
| 14 | Reduced-motion | all transitions degrade to instant (T12) |

---

## 5. Gate 4 — Headless boundary + seam

### 5a. Headless boundary (ships no CSS; works under foreign styling)
Load the demo, then in the console confirm the engine wrote **only** geometry/playback:

```js
// the current image element: only transform/size are inline-set by the engine
const img = document.querySelector('#stage .mv-image');
getComputedStyle(img).transform;            // a real matrix(...) — engine-applied
// the engine set NO classes, NO color/background/border on it; the consumer did.
```

Change or remove the demo page's inline styles: **Pass:** the engine behaves identically -
zoom/pan/seek/nav still work, no errors. Any breakage must be **consumer-side** (a class
fighting the inline geometry - fix the HTML/CSS). If the *engine* misbehaves under
different styling, that's an engine leak and the most important possible finding (it
defeats the headless purpose) - fix it in the engine.

### 5b. Build a renderer without touching the shell (the seam)
The analogue of virtualization-engine's layout-seam test. In the console or a scratch module:

```js
import { createViewer, defineRenderer, MediaType } from '../media-engine.js';
import { createRendererRegistry, createImageRenderer } from '../media-engine.js';

const reg = createRendererRegistry()
  .register(MediaType.IMAGE, createImageRenderer)
  .register('model3d', (item, deps) => defineRenderer({
    type: 'model3d',
    mount(it, el) { /* drive a <canvas>/<model-viewer> */ },
    getCapabilities: () => ({ type: 'model3d', zoom: {supported:true,min:1,max:8,current:1,fitAvailable:false,ready:true}, playback:null, tracks:null, castable:false, fullscreen:true, download:true }),
  }));
const viewer = createViewer({ items: [{type:'model3d', src:'x.glb'}], createElement, registry: reg, container, stage });
```

**Pass:** the new type opens, navigates, takes keys, and emits state through the **same**
shell with **zero shell edits**. `node test/renderer-interface.test.mjs` pins this at the
registry level ("seam: a novel renderer type registers and resolves like any other"). If
you ever find you must edit `shell.js` to add a type, stop — the seam leaked; fix it there.

---

## 6. Known characteristics & gotchas

Read this before debugging — most "bugs" are one of these.

- **The embedded pitch worklet doesn't run in Node.** It needs `AudioWorkletGlobalScope`,
  so it is generated only inside `createPitchSpeed()`. Its real logic lives in
  `createStretchEngine`, which **is** Node-tested.
- **WSOLA Tier 1 is "good enough," not transparent.** Clean on speech and moderate shifts;
  audible artifacts on complex material at large shifts — by design. The core is marked
  `>>> CORE <<<` for a Tier-2 swap. There is ~one frame (≈23ms) of added latency on the
  pitch path; irrelevant for playback (no live monitoring).
- **Pitch shift adds latency, so it's audio-only.** Video uses native speed only; never
  route video pitch through the worklet (A/V sync).
- **Events emitted during `mount()` are not forwarded.** The shell forwards a renderer's
  events only once it becomes current (at `activate()`), so derived state delivered solely
  by event (waveform peaks, track lists, the initial transform/playback) is **re-announced
  in `activate()`**. If you add a new event-only piece of state, re-announce it there too.
- **`<video>`/`<audio>` with `<source>` children don't fire `error` on the element.** The
  failure fires on the `<source>` and doesn't bubble — so the renderers listen for `error`
  in the **capture** phase. Without that, a 404 source hangs on a spinner forever.
- **Casting needs a device-reachable URL.** `blob:`/`data:`/`file:` can't cast (the TV
  fetches the URL itself); `isCastableSource` filters the scheme cases, the rest fail at
  connect time and report disconnected.
- **`data:`/`blob:` URLs are fetchable for waveform decode.** Don't reuse the cast
  reachability check to gate decoding (an earlier bug) — `decodePeaks` fetches them fine.
- **Coordinate conversion uses a cached viewport rect.** The image renderer assumes the
  viewer is a fixed overlay (the rect doesn't move on page scroll). True for a typical
  lightbox; if you embed the stage in a scrolling page, refresh the rect on scroll.
- **`file://` breaks ES-module imports.** Always serve over HTTP.

**Out of scope (by design):** editing/cropping/annotation; YouTube/Vimeo/embeds; comments/
social/EXIF UI; gapless/crossfade audio; hover-seek video thumbnails (hook spec'd only);
tiled/deep-zoom gigapixel images.

---

## 7. Extending the suite when you add features

- **Adding a renderer:** do NOT modify `shell.js`. Implement the contract via
  `defineRenderer`, register it, wire it into the demo with no special-casing. Add Gate 1
  tests in invariant style. Re-run Gate 4b.
- **Changing the gesture rules:** update `classifyDrag`/the recognizer and its Gate 1
  tests first (they're pure), then re-verify T3/T4 live.
- **Changing transform math:** golden matrix values in `tests/transform2d/transform2d.test.mjs` will change by
  design — update them; don't touch the invariants (fixed-point-under-zoom, bounds).
- **Swapping the WSOLA core (Tier 2):** keep the `(samples, ratio, opts) → samples`
  signature; re-run `pitch-speed.test.mjs` (the pitch/length invariants must still hold)
  and T8 by ear.
- **Adding an event-only piece of state:** re-announce it in the renderer's `activate()`
  (see §6) or the consumer won't get it on first show.
- **After any change, minimum re-run:** Gate 1 (always) + the Gate 2/3 units touching what
  you changed. After a significant change, run everything.

---

## 8. Quick regression checklist

- [ ] `npm test` → all package-local tests pass, exit 0 (currently 68)
- [ ] every module imports in Node with no DOM error (run-all covers it)
- [ ] demo loads over HTTP, no console errors, launcher + all three media types render
- [ ] open/close: backdrop fades, stage empties on close, focus restored
- [ ] navigate: instant (preloaded), wraps, state retained across deactivate, no leaks
- [ ] image: scroll/pinch zoom anchored, pan bounded, double-tap, rotate/flip/fit
- [ ] video: play/seek/volume/speed/captions/PiP; 404 source → error state, not a spinner
- [ ] audio: waveform draws + progresses, speed≠pitch, pitch≠speed, A-B loops
- [ ] focus trap holds; scroll locked; reduced-motion → instant transitions
- [ ] Gate 4: foreign stylesheet → identical behavior; new renderer → zero shell edits
