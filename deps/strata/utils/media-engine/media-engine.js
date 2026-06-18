// media-engine.js
// Headless media engine for image, video, and audio.
// Runtime-consolidated entry file: all media-engine logic lives here; shared
// primitives live in ../shared/*.js.

import { Emitter } from '../shared/emitter.js';
import { clamp } from '../shared/clamp.js';
import { Axis, FitMode } from '../shared/enums.js';
import { createTransform } from '../shared/transform2d.js';
import { createGestureRecognizer, classifyDrag } from '../shared/gestures.js';

// ---- media enums ------------------------------------------------------------
const { MediaType, Lifecycle, LoadState, PlayState, CastState, RepeatMode, GestureKind } = (() => {
// enums.js
// The shared vocabulary of the engine: runtime enums it emits plus JSDoc
// typedefs describing the shapes it accepts and emits.
//
// Two kinds of thing live here:
//   - Frozen constant objects (MediaType, Lifecycle, ...). These are REAL
//     runtime values. Renderers and the shell import them instead of scattering
//     string literals, so a typo is a missing-property error, not a silent
//     mismatch, and the set of legal values is enumerable in one place.
//   - JSDoc @typedefs (Item, CapabilityDescriptor, ...). Erased at runtime;
//     they document the contract for editors and for humans. Other modules
//     reference them with `@typedef {Object} Item`.
//
// No DOM, no dependencies — imports cleanly in Node.

// ============================================================================
// Runtime enums
// ============================================================================

/** Media kinds the engine routes between renderers. */
const MediaType = Object.freeze({
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
});

/**
 * Shell lifecycle. `opening`/`closing` are distinct phases (not booleans) so
 * the consumer can run enter/exit transitions; the engine emits the phase and
 * the consumer animates. See shell.js.
 */
const Lifecycle = Object.freeze({
  CLOSED: 'closed',
  OPENING: 'opening',
  OPEN: 'open',
  CLOSING: 'closing',
});

/** Per-item load state, tracked for the current item and preloaded neighbors. */
const LoadState = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
});

/** Playback state shared by the video and audio renderers. */
const PlayState = Object.freeze({
  PLAYING: 'playing',
  PAUSED: 'paused',
  STOPPED: 'stopped',
  ENDED: 'ended',
});

/**
 * Remote Playback (cast) connection state. Mirrors the spec's
 * `RemotePlayback.state` values, plus `unavailable` for "the API exists but no
 * device is reachable" and `unsupported` for "the API is absent / the source
 * can't be cast". See casting.js.
 */
const CastState = Object.freeze({
  UNSUPPORTED: 'unsupported', // API absent (Firefox/Safari) or source unreachable by a device
  UNAVAILABLE: 'unavailable', // API present, but no device currently reachable
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
});

// FitMode lives in shared/enums.js and is re-exported from this entry file.

/** Repeat modes for the audio queue. */
const RepeatMode = Object.freeze({
  NONE: 'none', // stop at end of queue
  ONE: 'one', // repeat the current track
  ALL: 'all', // loop the whole queue
});

/**
 * The resolved outcome of a gesture, produced by the pure recognizer. The shell
 * and image renderer act on these; they never see raw pointer events.
 */
const GestureKind = Object.freeze({
  NONE: 'none',
  TAP: 'tap',
  DOUBLE_TAP: 'double-tap',
  PAN: 'pan', // one-finger drag while zoomed
  SWIPE: 'swipe', // horizontal navigate (not zoomed)
  DISMISS: 'dismiss', // vertical-down drag to close (not zoomed)
  PINCH: 'pinch', // two-finger zoom (+ simultaneous two-finger pan)
  WHEEL_ZOOM: 'wheel-zoom',
});

// Axis lives in shared/enums.js and is re-exported from this entry file.

// ============================================================================
// Item shapes (the normalized input contract — see §9 of the spec)
// ============================================================================

/**
 * @typedef {Object} Track  A text or audio track for a video.
 * @property {'captions'|'subtitles'|'chapters'|'descriptions'|'metadata'|'audio'} kind
 * @property {string} [label]    human label shown in a menu ("English", "Director commentary")
 * @property {string} [srclang]  BCP-47 language code ("en", "es")
 * @property {string} [src]      URL of the VTT/track resource (text tracks)
 * @property {boolean} [default] preselect this track
 * @property {string} [id]
 */

/**
 * @typedef {Object} Source  One encoding of a media resource, for fallback.
 * @property {string} src
 * @property {string} [type]   MIME type, e.g. "video/mp4" or "audio/mpeg"
 */

/**
 * @typedef {Object} MediaMetadata  Media Session metadata (audio/video).
 * @property {string} [title]
 * @property {string} [artist]
 * @property {string} [album]
 * @property {Array<{src:string,sizes?:string,type?:string}>} [artwork]
 */

/**
 * @typedef {Object} BaseItem
 * @property {'image'|'video'|'audio'} type
 * @property {string} [id]
 * @property {string} [title]
 * @property {string} [caption]            free-form caption/metadata; consumer renders
 * @property {Object} [meta]               arbitrary passthrough the consumer may attach
 */

/**
 * @typedef {BaseItem & {
 *   type: 'image',
 *   src: string,
 *   width?: number,
 *   height?: number,
 *   placeholderSrc?: string,
 *   srcset?: string,
 *   alt?: string,
 * }} ImageItem
 * width/height are strongly recommended: known dimensions let the transform
 * module compute fit and pan-bounds before the pixels load (clean zoom math).
 * Absent, the image renderer measures on load — the less-good path.
 */

/**
 * @typedef {BaseItem & {
 *   type: 'video',
 *   src?: string,
 *   sources?: Source[],
 *   poster?: string,
 *   tracks?: Track[],
 *   width?: number,
 *   height?: number,
 *   mediaMetadata?: MediaMetadata,
 * }} VideoItem
 */

/**
 * @typedef {BaseItem & {
 *   type: 'audio',
 *   src?: string,
 *   sources?: Source[],
 *   peaks?: number[],
 *   duration?: number,
 *   mediaMetadata?: MediaMetadata,
 * }} AudioItem
 * peaks/duration are hints: when peaks are supplied the waveform module skips
 * the fetch+decode entirely.
 */

/** @typedef {ImageItem | VideoItem | AudioItem} Item */

// ============================================================================
// Capability descriptors (§2.3 — descriptors, not booleans)
// ============================================================================
//
// A renderer reports what it can do as a structured descriptor, so the shell
// never has to ask type-specific follow-up questions. A `null` field means the
// renderer has no such facet (an image has no `playback`; an audio clip has no
// `zoom`). Runtime-varying facets (cast device coming online, zoom becoming
// ready once dimensions load) are NOT polled here — the renderer emits a
// 'capabilitychange' event and the shell re-reads. See the renderer interface section.

/**
 * @typedef {Object} ZoomCapability
 * @property {boolean} supported
 * @property {number}  min            minimum scale (e.g. fit, or a fraction)
 * @property {number}  max            maximum scale
 * @property {number}  current        current scale
 * @property {boolean} fitAvailable   whether a "fit" target differs from current
 * @property {boolean} ready          false until intrinsic dimensions are known
 */

/**
 * @typedef {Object} PlaybackCapability
 * Presence of this object signals "I own a timeline — shell, don't fight it."
 * @property {boolean} supported
 * @property {boolean} canSeek
 * @property {boolean} canSetRate
 * @property {boolean} canSetVolume   false where the platform forbids it (iOS)
 * @property {number[]} rates         offered playbackRate options
 * @property {boolean} pip            Picture-in-Picture available
 * @property {boolean} pitchShift     independent pitch shifting available (audio)
 */

/**
 * @typedef {Object} TracksCapability
 * Captions and audio tracks are DIFFERENT menus — a single boolean can't say
 * "has captions but not alternate audio". Hence two arrays.
 * @property {Track[]} captions
 * @property {Track[]} audio
 */

/**
 * @typedef {Object} CapabilityDescriptor
 * @property {'image'|'video'|'audio'} type
 * @property {ZoomCapability|null} zoom
 * @property {PlaybackCapability|null} playback
 * @property {TracksCapability|null} tracks
 * @property {boolean} castable     whether this media *could* cast (source reachable)
 * @property {boolean} fullscreen   whether fullscreen applies to this renderer
 * @property {boolean} download     whether an original source is exposable
 */

// ============================================================================
// Emitted state shapes (documentation for consumers)
// ============================================================================

/**
 * @typedef {Object} TransformState  Emitted by the image renderer / transform module.
 * @property {number} scale
 * @property {number} x              pan offset, px
 * @property {number} y              pan offset, px
 * @property {0|90|180|270} rotation
 * @property {boolean} flippedHorizontally
 * @property {boolean} flippedVertically
 * @property {number[]} matrix       [a,b,c,d,e,f] for CSS matrix(); ready to apply
 * @property {string} fitMode
 */

/**
 * @typedef {Object} PlaybackStatus  Emitted by the video / audio renderers.
 * @property {string} state          one of PlayState
 * @property {number} currentTime    seconds
 * @property {number} duration       seconds (NaN/Infinity for live/unknown)
 * @property {number} buffered       fraction 0..1 buffered ahead of currentTime
 * @property {boolean} seeking
 * @property {number} volume         0..1
 * @property {boolean} muted
 * @property {number} speed          playbackRate
 * @property {boolean} loop
 * @property {boolean} pip
 */

// Intentionally no exported runtime value below this line — the typedefs above
// are erased. This block exists so the file has a single, greppable home for
// "what does the engine emit".

return { MediaType, Lifecycle, LoadState, PlayState, CastState, RepeatMode, GestureKind };
})();

// ---- local helpers ------------------------------------------------------------
const { lerp, approxEqual, noop, raf, caf, frameThrottle, finiteOr } = (() => {
// utils.js
// Tiny zero-dependency helpers shared across the engine.
//
// Nothing here touches the DOM at module scope (or anywhere, except where a
// helper is explicitly documented as DOM-only and confines the access to its
// body). Importing this file in Node must never throw — the pure-logic test
// modules depend on that, and it is the first line of defence for the headless
// boundary.
//
// Exports: { lerp, approxEqual, noop, frameThrottle, raf, caf, finiteOr }
// (clamp and the Emitter class live in shared/*.js.)

/** Linear interpolate from a to b by t in [0, 1] (unclamped). */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** True when |a - b| <= eps. Used by tests and bounds math. */
function approxEqual(a, b, eps = 1e-9) {
  return Math.abs(a - b) <= eps;
}

/** A shared do-nothing function (avoids allocating throwaway closures). */
function noop() {}

/**
 * `value` when it is a finite number, else `fallback`. The guard the clamp idiom
 * needs: `clamp()` (like Math.min/max) passes NaN/±Infinity straight through, so
 * a non-finite value from a consumer or media element would otherwise poison any
 * clamped/persistent state it reaches.
 */
function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

// The Emitter pub/sub class lives in shared/emitter.js.

// ---- DOM-adjacent helpers ---------------------------------------------------
// These reference requestAnimationFrame, which does not exist in Node. They are
// safe to *import* in Node (the reference is inside the function body, resolved
// only when called) but must only be *called* in a browser. The pure modules
// and their Node tests never call them.

/** requestAnimationFrame, or a 0ms timer fallback for non-browser hosts. */
function raf(handler) {
  return typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame(handler)
    : setTimeout(() => handler(performanceNow()), 0);
}

/** cancelAnimationFrame paired with raf(). */
function caf(id) {
  if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(id);
  else clearTimeout(id);
}

/** A monotonic-ish timestamp; only used as the rAF fallback's argument. */
function performanceNow() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : 0;
}

/**
 * Coalesce a burst of calls into one invocation per animation frame — the same
 * trick the virtualization-engine uses inline for scroll. High-frequency renderer state
 * (video timeupdate, pointer-driven pan) is funnelled through this so the
 * consumer's onChange fires at most once per frame.
 *
 * Returns a function with a `.cancel()` method to drop a pending frame (used by
 * renderers in unmount()/deactivate() so a queued callback can't fire after
 * teardown).
 *
 * @param {(...args:any[]) => void} handler
 * @returns {((...args:any[]) => void) & { cancel: () => void }}
 */
function frameThrottle(handler) {
  let scheduled = false;
  let lastArgs = null;
  let id = 0;
  const wrapped = (...args) => {
    lastArgs = args;
    if (scheduled) return;
    scheduled = true;
    id = raf(() => {
      scheduled = false;
      handler(...lastArgs);
    });
  };
  wrapped.cancel = () => {
    if (scheduled) {
      caf(id);
      scheduled = false;
    }
  };
  return wrapped;
}

return { lerp, approxEqual, noop, raf, caf, frameThrottle, finiteOr };
})();

// ---- renderer interface ------------------------------------------------------------
const { RendererEvent, Intent, createRendererRegistry, defineRenderer } = (() => {
// renderer interface
// The single contract the shell uses to drive ANY renderer, plus the type→
// renderer registry that makes "add a media type = write a renderer, never
// touch the shell" true (the analogue of virtualization-engine's layout-strategy seam).
//
// THE CONTRACT (what every renderer exposes to the SHELL — uniform, type-blind):
//   mount(item, element)   bind to the element the shell got from the factory
//   unmount()              detach, drop listeners, free resources. Safe mid-load
//                          and mid-transition.
//   activate()             becomes the current item (start work)
//   deactivate()           becomes a preloaded non-current neighbor: pause/
//                          release work but RETAIN view/playback state
//   handleKey(event)→bool  consume the key in the current state (true) or decline
//                          (false → the shell applies its navigation/close fallback)
//   isZoomed()→bool        informational query (e.g. for affordance styling)
//   getCapabilities()→descriptor   §2.3 descriptor (not booleans)
//   getState()→object      a snapshot the consumer can render at any moment
//   on(type, handler)→off       subscribe to emitted changes (see RendererEvent)
//
// CONTROLS (what a renderer exposes to the CONSUMER) are type-specific —
// play()/seek() on video, zoomIn()/rotate() on image — and are NOT part of the
// shell contract. The consumer reads getCapabilities() to know which exist and
// calls them directly on the active renderer. The shell never calls them.
//
// INPUT SPLIT (so each renderer is usable WITHOUT the shell, §2.3):
//   - Pointer/wheel gestures are ELEMENT-scoped, so each visual renderer owns
//     its own gesture recognizer (the gestures module) attached to its element, applies
//     view gestures (pan/zoom/tap) itself, and emits navigation/dismiss as
//     RendererEvent.INTENT for whoever is embedding it (the shell, or a consumer).
//   - Keyboard is DOCUMENT-scoped with no natural element target while open, so
//     the shell captures it and delegates via handleKey(). A standalone renderer
//     simply isn't sent keys.
//
// Runtime-varying capability (cast device appears, zoom becomes ready once
// dimensions load) is emitted via RendererEvent.CAPABILITY — the shell re-reads
// getCapabilities() on that event rather than polling.
//
// Pure: a Map and some helpers. No DOM. Unit-tested, including the seam.
//
// Exports: { RendererEvent, Intent, createRendererRegistry, defineRenderer }

/** Event names a renderer emits; the shell and consumer subscribe by these. */
const RendererEvent = Object.freeze({
  LOAD: 'load', // { state: LoadState, error?: any, autoplay?: {attempted,blocked,muted} }
  CAPABILITY: 'capability', // capabilities changed → shell re-reads getCapabilities()
  PLAYBACK: 'playback', // PlaybackStatus snapshot (video/audio)
  TRANSFORM: 'transform', // TransformState (image)
  CUES: 'cues', // { cues: Cue[], trackIndex, style, styleOnly? } — active captions changed
  TRACKS: 'tracks', // available caption/audio tracks changed (streaming)
  CAST: 'cast', // { state: CastState, available: boolean }
  WAVEFORM: 'waveform', // { peaks: number[], duration?: number } (audio)
  CONTROLS: 'controls', // { visible: boolean } controls-overlay visibility (video)
  INTENT: 'intent', // renderer asks the shell to act: { type:'navigate'|'close'|'dismiss'|'dragprogress', index?, direction?:'next'|'previous', autoplay?, axis?, dx?, dy?, total?, progress? }
});

/** Renderer→shell intent types carried by RendererEvent.INTENT. */
const Intent = Object.freeze({
  NAVIGATE: 'navigate', // { index } — e.g. audio queue auto-advance at track end
  CLOSE: 'close',
  DISMISS: 'dismiss',
});

/**
 * Type→renderer registry. The shell holds one and only ever calls
 * `create(item, deps)` — it has zero knowledge of concrete renderer types. A new
 * media type is added by `register(type, factory)`; nothing in the shell changes.
 */
function createRendererRegistry() {
  /** @type {Map<string, (item:any, deps:any) => any>} */
  const factories = new Map();

  return {
    /**
     * @param {string} type            MediaType value
     * @param {(item:any, deps:any) => any} factory  returns a renderer (see contract)
     */
    register(type, factory) {
      if (typeof factory !== 'function') {
        throw new Error(`media-engine: renderer factory for "${type}" must be a function`);
      }
      factories.set(type, factory);
      return this;
    },
    has(type) {
      return factories.has(type);
    },
    resolve(type) {
      return factories.get(type) || null;
    },
    /** Instantiate the renderer for an item. Throws if its type is unregistered. */
    create(item, deps) {
      const factory = factories.get(item && item.type);
      if (!factory) {
        throw new Error(`media-engine: no renderer registered for type "${item && item.type}"`);
      }
      return factory(item, deps);
    },
    types() {
      return [...factories.keys()];
    },
  };
}

/**
 * Fill in safe defaults for the optional parts of the contract so a renderer
 * implementation only writes what it actually does. The shell can then call every
 * OPTIONAL contract method on the result without existence checks. `mount` is not
 * defaulted (a no-op mount would silently render nothing) — it and `type` are the
 * two pieces an implementation must supply itself; the shell calls `mount`
 * unconditionally.
 *
 * The spread puts `impl` last so a renderer always overrides the defaults.
 *
 * @param {Object} impl  a partial renderer (must at least provide `type` and `mount`)
 */
function defineRenderer(impl) {
  if (!impl || !impl.type) throw new Error('media-engine: a renderer needs a `type`');
  return {
    isZoomed() {
      return false;
    },
    handleKey() {
      return false; // declines everything → shell fallback handles it
    },
    activate() {},
    deactivate() {},
    unmount() {},
    getState() {
      return {};
    },
    getCapabilities() {
      return {
        type: impl.type,
        zoom: null,
        playback: null,
        tracks: null,
        castable: false,
        fullscreen: false,
        download: false,
      };
    },
    on() {
      return () => {};
    },
    ...impl,
  };
}

return { RendererEvent, Intent, createRendererRegistry, defineRenderer };
})();

// ---- subtitles ------------------------------------------------------------
const { parseTimestamp, parseVTT, createCueTrack } = (() => {
// subtitles.js
// WebVTT parsing, cue timing, and active-cue tracking. Pure: it takes VTT text
// in and emits cue data out. It never styles anything and never touches the DOM
// — the video renderer fetches the .vtt over the network, hands the text here,
// and drives the consumer's caption rendering off the emitted cues. Caption
// TEXT STYLING (background, size, font) is the consumer's job; this module only
// supplies text, timing, and the cue's own VTT settings (line/position/align).
//
// Why parse here instead of using a native <track>? A `showing` <track> paints
// captions itself — that breaks the headless boundary. A `hidden` <track> would
// avoid painting but hands us TextTrackCue objects with awkward access to raw
// text/settings and CORS friction. Parsing ourselves keeps full control, makes
// the timing logic unit-testable, and matches the spec ("the cue module parses
// VTT and emits current cue(s) and the cue list").
//
// Exports: { parseVTT, parseTimestamp, createCueTrack }

/**
 * @typedef {Object} Cue
 * @property {string} id
 * @property {number} start    seconds
 * @property {number} end      seconds
 * @property {string} text     raw cue payload (may contain VTT tags / newlines)
 * @property {string} plain    text with tags stripped, for simple rendering
 * @property {Object<string,string>} settings  parsed cue settings (line, position, …)
 */

/**
 * Parse a WebVTT timestamp into seconds. Accepts `HH:MM:SS.mmm` and `MM:SS.mmm`
 * (hours optional), tolerating `,` as the decimal separator and 1–3 fraction
 * digits. Returns NaN for an unparseable value.
 * @param {string} s
 * @returns {number}
 */
function parseTimestamp(s) {
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})$/.exec(String(s).trim());
  if (!m) return NaN;
  const hh = m[1] ? parseInt(m[1], 10) : 0;
  const mm = parseInt(m[2], 10);
  const ss = parseInt(m[3], 10);
  const frac = parseInt(m[4].padEnd(3, '0'), 10);
  return hh * 3600 + mm * 60 + ss + frac / 1000;
}

/** Strip VTT inline tags (<b>, <v Speaker>, <c.class>, karaoke timestamps) and basic entities. */
function stripTags(s) {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function parseSettings(str) {
  const out = {};
  if (!str) return out;
  for (const tok of str.split(/\s+/)) {
    const c = tok.indexOf(':');
    if (c > 0) out[tok.slice(0, c)] = tok.slice(c + 1);
  }
  return out;
}

/**
 * Parse a WebVTT document into cues. Lenient: tolerates a missing/decorated
 * `WEBVTT` header, cue id lines or their absence, `\r\n`/`\r` line endings, and
 * skips NOTE/STYLE/REGION blocks. Cues with an unparseable timing line are
 * dropped (not thrown). Cues are returned sorted by start time.
 *
 * @param {string} text
 * @returns {{ cues: Cue[] }}
 */
function parseVTT(text) {
  const cues = [];
  if (!text) return { cues };

  const normalized = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Split into blocks on one-or-more blank lines.
  const blocks = normalized.split(/\n[ \t]*\n+/);

  let autoId = 0;
  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi].trim();
    if (!block) continue;
    // The first block is the header (WEBVTT…) — skip it.
    if (bi === 0 && /^WEBVTT/.test(block)) continue;
    // Skip metadata blocks anywhere.
    if (/^(NOTE|STYLE|REGION)\b/.test(block)) continue;

    const lines = block.split('\n');
    let i = 0;
    let id = '';
    // A leading line without '-->' is the optional cue identifier.
    if (lines[0].indexOf('-->') === -1) {
      id = lines[0].trim();
      i = 1;
    }
    const timing = lines[i];
    if (!timing || timing.indexOf('-->') === -1) continue; // not a cue block
    i++;

    const arrow = timing.indexOf('-->');
    const startStr = timing.slice(0, arrow).trim();
    const rest = timing.slice(arrow + 3).trim().split(/\s+/);
    const endStr = rest.shift();
    const start = parseTimestamp(startStr);
    const end = parseTimestamp(endStr);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;

    const raw = lines.slice(i).join('\n');
    cues.push({
      id: id || String(++autoId),
      start,
      end,
      text: raw,
      plain: stripTags(raw),
      settings: parseSettings(rest.join(' ')),
    });
  }

  cues.sort((a, b) => a.start - b.start || a.end - b.end);
  return { cues };
}

/**
 * Stateful active-cue tracker over a parsed cue list. `update(time)` returns the
 * currently-active cues and a `changed` flag so the renderer emits only when the
 * active SET actually changes (not every timeupdate). Overlapping cues are all
 * returned (multiple speakers, positioned captions). A gap with no cue returns
 * an empty array — the consumer hides the caption layer.
 *
 * Pure and DOM-free; the renderer feeds it `video.currentTime`.
 *
 * @param {Cue[]} cues
 */
function createCueTrack(cues = []) {
  const list = [...cues].sort((a, b) => a.start - b.start || a.end - b.end);
  let lastKey = null;

  function activeAt(time) {
    // Linear scan: subtitle tracks are small (hundreds–low thousands of cues)
    // and overlaps make a single binary-search hit insufficient. If a track ever
    // grows pathologically large, swap in an interval tree behind this method.
    const out = [];
    for (const c of list) {
      if (c.start <= time && time < c.end) out.push(c);
      else if (c.start > time) break; // sorted by start → no later cue can be active
    }
    return out;
  }

  return {
    get count() {
      return list.length;
    },
    getCues() {
      return list;
    },
    activeAt,
    /**
     * @param {number} time seconds
     * @returns {{ cues: Cue[], changed: boolean }}
     */
    update(time) {
      const active = activeAt(time);
      const key = active.map((c) => c.id).join('|');
      const changed = key !== lastKey;
      lastKey = key;
      return { cues: active, changed };
    },
    /** Forget the last-active set (e.g. after a seek or track switch). */
    reset() {
      lastKey = null;
    },
  };
}

return { parseTimestamp, parseVTT, createCueTrack };
})();

// ---- queue ------------------------------------------------------------
const { createQueue } = (() => {
// queue.js
// The audio renderer's pure playback-policy logic: an ordered queue with
// repeat modes and a play-once-and-stop mode, plus A-B segment-repeat. It owns
// no media element and no timers — it only answers "what should happen next?"
// so the renderer can act. Fully deterministic and DOM-free, hence unit-testable.
//
// The two distinct end-of-track behaviors the spec calls out:
//   - play-once-and-stop: halt at the end of the CURRENT track; never advance.
//   - repeat one: restart the current track (a loop), which is NOT the same.
//
// Exports: { createQueue }


/**
 * @param {Object} [options]
 * @param {any[]} [options.items=[]]            opaque queue entries (ids, item objects…)
 * @param {number} [options.index=0]            initial current index
 * @param {string} [options.repeat='none']      RepeatMode.*
 * @param {boolean} [options.playOnce=false]    play-once-and-stop mode
 */
function createQueue(options = {}) {
  // An unknown repeat mode throws (the repo standard for enum inputs — cf. color
  // and datetime) rather than silently falling through to NONE behavior.
  const assertRepeat = (mode) => {
    if (mode !== RepeatMode.NONE && mode !== RepeatMode.ONE && mode !== RepeatMode.ALL) {
      throw new TypeError(`media-engine: unknown repeat mode "${mode}"`);
    }
    return mode;
  };
  let items = Array.isArray(options.items) ? [...options.items] : [];
  let index = items.length ? clamp(options.index || 0, 0, items.length - 1) : -1;
  let repeat = assertRepeat(options.repeat || RepeatMode.NONE);
  let playOnce = !!options.playOnce;

  /** @type {{a:number,b:number}|null} */
  let ab = null;

    const inRange = (candidateIndex) => candidateIndex >= 0 && candidateIndex < items.length;

  return {
    // ---- queue shape ---------------------------------------------------------
    get size() {
      return items.length;
    },
    get index() {
      return index;
    },
    getItems() {
      return items;
    },
    current() {
      return inRange(index) ? items[index] : null;
    },
    hasNext() {
      return repeat === RepeatMode.ALL ? items.length > 0 : index < items.length - 1;
    },
    hasPrev() {
      return repeat === RepeatMode.ALL ? items.length > 0 : index > 0;
    },

    /** Replace the queue; resets A-B and clamps/sets the index. */
    setItems(nextItems, { index: nextIndex = 0 } = {}) {
      items = Array.isArray(nextItems) ? [...nextItems] : [];
      // finiteOr: a non-finite index would survive clamp() (NaN < 0 and NaN > max
      // are both false) and brick the queue — current() would return null forever.
      index = items.length ? clamp(finiteOr(nextIndex, 0), 0, items.length - 1) : -1;
      ab = null;
      return index;
    },

    /** Jump to an explicit index (clamped). Returns the resulting index. */
    jump(targetIndex) {
      if (!items.length) return -1;
      // A non-finite target leaves the current index untouched (see setItems).
      index = clamp(finiteOr(targetIndex, index), 0, items.length - 1);
      return index;
    },

    /**
     * Advance to the next track per repeat mode. Returns {index, wrapped} or
     * null when at the end with no wrap (repeat none). Does NOT consider
     * play-once — that only governs natural end-of-track (see onEnded).
     */
    next() {
      if (!items.length) return null;
      if (index < items.length - 1) {
        index += 1;
        return { index, wrapped: false };
      }
      if (repeat === RepeatMode.ALL) {
        index = 0;
        return { index, wrapped: true };
      }
      return null; // none/one at the last track
    },

    /** Step to the previous track (wraps under repeat all). */
    prev() {
      if (!items.length) return null;
      if (index > 0) {
        index -= 1;
        return { index, wrapped: false };
      }
      if (repeat === RepeatMode.ALL) {
        index = items.length - 1;
        return { index, wrapped: true };
      }
      return null;
    },

    // ---- repeat / play-once --------------------------------------------------
    setRepeat(mode) {
      repeat = assertRepeat(mode);
      return repeat;
    },
    getRepeat() {
      return repeat;
    },
    setPlayOnce(enabled) {
      playOnce = !!enabled;
      return playOnce;
    },
    getPlayOnce() {
      return playOnce;
    },

    /**
     * Decide what to do when the current track ENDS naturally. Mutates the index
     * for an advance. Returns:
     *   { action: 'stop',    index }  — halt here (play-once, or end with no wrap)
     *   { action: 'repeat',  index }  — restart the current track (repeat one)
     *   { action: 'advance', index, wrapped }  — move to another track & play it
     */
    onEnded() {
      if (!items.length) return { action: 'stop', index: -1 };
      if (playOnce) return { action: 'stop', index };
      if (repeat === RepeatMode.ONE) return { action: 'repeat', index };
      if (index < items.length - 1) {
        index += 1;
        return { action: 'advance', index, wrapped: false };
      }
      if (repeat === RepeatMode.ALL) {
        index = 0;
        return { action: 'advance', index, wrapped: true };
      }
      return { action: 'stop', index };
    },

    // ---- A-B repeat ----------------------------------------------------------
    /** Define a loop segment [a, b] (seconds). Orders the endpoints; ignores a degenerate span. */
    setAB(pointA, pointB) {
      // A non-finite endpoint would later flow into element.currentTime via
      // abSeek()/checkAB() and throw on the setter (mirrors seek()'s guard).
      if (!Number.isFinite(pointA) || !Number.isFinite(pointB)) {
        ab = null;
        return ab;
      }
      const lower = Math.min(pointA, pointB);
      const higher = Math.max(pointA, pointB);
      ab = higher > lower ? { a: lower, b: higher } : null;
      return ab;
    },
    clearAB() {
      ab = null;
    },
    getAB() {
      return ab ? { ...ab } : null;
    },

    /**
     * Given the current playback time, return the seek target if the A-B loop
     * should wrap (time has reached/passed b), else null. Only loops at the END
     * of the segment — a user seeking before `a` is left alone.
     * @param {number} time seconds
     * @returns {number|null}
     */
    abSeek(time) {
      if (!ab) return null;
      return time >= ab.b ? ab.a : null;
    },
  };
}

return { createQueue };
})();

// ---- waveform ------------------------------------------------------------
const { extractPeaks, extractMinMax, mixToMono, peaksFromBuffer, decodePeaks } = (() => {
// waveform.js
// Decode audio and reduce it to downsampled amplitude peaks the consumer can
// draw. The PEAK MATH is pure (operates on sample arrays), so it's unit-testable
// in Node. The DECODE step needs a Web Audio context and a fetch, so it is
// isolated in its own async function and confined there — importing this module
// in Node never touches the DOM.
//
// The engine emits peaks; it draws nothing. Note (per spec): decoding fetches
// and decodes the whole buffer — heavier than merely driving <audio>. Prefer
// supplying `peaks` on the item to skip it, and decode large files off the main
// path (decodeAudioData is already async/off-thread).
//
// Exports: { extractPeaks, extractMinMax, mixToMono, peaksFromBuffer, decodePeaks }

/**
 * Reduce a sample array to `buckets` amplitude peaks (max |sample| per bucket).
 * Input samples are expected in [-1, 1] (Web Audio float PCM); output is in
 * [0, 1]. With `normalize`, the loudest peak is scaled to 1.
 *
 * @param {ArrayLike<number>} samples
 * @param {number} buckets               desired number of peaks
 * @param {Object} [options]
 * @param {boolean} [options.normalize=false]
 * @returns {number[]}
 */
function extractPeaks(samples, buckets, { normalize = false } = {}) {
  const sampleCount = samples.length;
  // `!(buckets > 0)` rejects NaN as well as <= 0 (a NaN bucket count would reach
  // `new Array(NaN)` and throw RangeError instead of returning empty like no-input).
  if (!sampleCount || !(buckets > 0)) return [];
  const bucketCount = Math.min(Math.floor(buckets), sampleCount);
  const peaks = new Array(bucketCount);
  const bucketSize = sampleCount / bucketCount;
  let loudest = 0;
  for (let i = 0; i < bucketCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(sampleCount, Math.floor((i + 1) * bucketSize));
    let max = 0;
    for (let j = start; j < end; j++) {
      const amplitude = samples[j] < 0 ? -samples[j] : samples[j];
      if (amplitude > max) max = amplitude;
    }
    peaks[i] = max;
    if (max > loudest) loudest = max;
  }
  if (normalize && loudest > 0) {
    for (let i = 0; i < bucketCount; i++) peaks[i] /= loudest;
  }
  return peaks;
}

/**
 * Like extractPeaks, but returns the signed min and max per bucket — the
 * envelope a symmetric waveform draws (top = max, bottom = min).
 *
 * @param {ArrayLike<number>} samples
 * @param {number} buckets
 * @returns {{ min: number[], max: number[] }}
 */
function extractMinMax(samples, buckets) {
  const sampleCount = samples.length;
  // `!(buckets > 0)` rejects NaN as well as <= 0 (see extractPeaks).
  if (!sampleCount || !(buckets > 0)) return { min: [], max: [] };
  const bucketCount = Math.min(Math.floor(buckets), sampleCount);
  const min = new Array(bucketCount);
  const max = new Array(bucketCount);
  const bucketSize = sampleCount / bucketCount;
  for (let i = 0; i < bucketCount; i++) {
    const start = Math.floor(i * bucketSize);
    const end = Math.min(sampleCount, Math.floor((i + 1) * bucketSize));
    let lowest = Infinity;
    let highest = -Infinity;
    for (let j = start; j < end; j++) {
      const sample = samples[j];
      if (sample < lowest) lowest = sample;
      if (sample > highest) highest = sample;
    }
    min[i] = lowest === Infinity ? 0 : lowest;
    max[i] = highest === -Infinity ? 0 : highest;
  }
  return { min, max };
}

/**
 * Average a set of channel sample arrays into a single mono array. A single
 * channel is returned as-is (no copy needed).
 * @param {ArrayLike<number>[]} channels
 * @returns {ArrayLike<number>}
 */
function mixToMono(channels) {
  const channelCount = channels.length;
  if (channelCount === 0) return new Float32Array(0);
  if (channelCount === 1) return channels[0];
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channelCount; c++) sum += channels[c][i];
    out[i] = sum / channelCount;
  }
  return out;
}

/**
 * Extract peaks from a decoded AudioBuffer (or any object exposing
 * numberOfChannels + getChannelData). Mixes channels to mono first.
 * @param {{numberOfChannels:number, getChannelData:(c:number)=>ArrayLike<number>}} audioBuffer
 * @param {number} buckets
 * @param {Object} [options]
 */
function peaksFromBuffer(audioBuffer, buckets, options) {
  const channels = [];
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) channels.push(audioBuffer.getChannelData(c));
  return extractPeaks(mixToMono(channels), buckets, options);
}

/**
 * DOM/Web-Audio path: fetch (if `url`) and decode audio, then extract peaks.
 * The ONLY function here that needs a browser. Closes any context it created.
 *
 * @param {Object} params
 * @param {ArrayBuffer} [params.arrayBuffer]   pre-fetched bytes (skips fetch)
 * @param {string} [params.url]                URL to fetch when no arrayBuffer
 * @param {number} [params.buckets=1000]
 * @param {AudioContext} [params.audioContext] reuse an existing context
 * @param {boolean} [params.normalize=false]
 * @param {number} [params.maxBytes=64MB]       reject sources larger than this (DoS guard)
 * @returns {Promise<{peaks:number[], duration:number, sampleRate:number}>}
 */
async function decodePeaks({ arrayBuffer, url, buckets = 1000, audioContext, normalize = false, maxBytes = 64 * 1024 * 1024 }) {
  const AudioContextClass = audioContext
    ? null
    : typeof AudioContext !== 'undefined'
      ? AudioContext
      : typeof webkitAudioContext !== 'undefined'
        ? webkitAudioContext // eslint-disable-line no-undef
        : null;
  if (!audioContext && !AudioContextClass) throw new Error('Web Audio API unavailable');
  const context = audioContext || new AudioContextClass();
  const ownsContext = !audioContext; // only close a context WE created

  try {
    let bytes = arrayBuffer;
    if (!bytes && url) {
      const response = await fetch(url);
      // Bail BEFORE downloading the body when the server declares an oversized
      // source — auto-decode runs on untrusted, neighbor-preloaded item URLs.
      const declared = Number(response.headers.get('content-length'));
      if (Number.isFinite(declared) && declared > maxBytes) {
        throw new Error('decodePeaks: source exceeds maxBytes');
      }
      bytes = await response.arrayBuffer();
    }
    if (!bytes) throw new Error('decodePeaks: need arrayBuffer or url');
    // Fallback cap for a missing/lying Content-Length, and for the arrayBuffer path.
    if (bytes.byteLength > maxBytes) throw new Error('decodePeaks: source exceeds maxBytes');

    // decodeAudioData detaches the buffer it's given — copy so the caller's bytes survive.
    const audioBuffer = await context.decodeAudioData(bytes.slice(0));
    const peaks = peaksFromBuffer(audioBuffer, buckets, { normalize });
    return { peaks, duration: audioBuffer.duration, sampleRate: audioBuffer.sampleRate };
  } finally {
    // Close on EVERY exit, including a failed fetch/decode — otherwise a
    // self-created context leaks and browsers cap concurrent AudioContexts (~6).
    if (ownsContext && context.close) context.close();
  }
}

return { extractPeaks, extractMinMax, mixToMono, peaksFromBuffer, decodePeaks };
})();

// ---- pitch and speed ------------------------------------------------------------
const { semitonesToRatio, hann, wsolaStretch, resampleLinear, pitchShift, createStretchEngine, createPitchSpeed } = (() => {
// pitch-speed.js
// Independent speed and pitch control for the audio renderer.
//
// HOW SPEED AND PITCH ARE SPLIT (important):
//   - SPEED (tempo) is NATIVE: the renderer sets mediaElement.playbackRate with
//     preservesPitch = true. No DSP, best quality. createPitchSpeed.setSpeed()
//     just drives that.
//   - PITCH SHIFT is DSP: routed through an AudioWorklet running a WSOLA
//     time-stretch at NET TEMPO 1 (stretch by r, then resample by 1/r → same
//     length, pitch ×r). Because the worklet's net tempo is 1, it is rate-matched
//     to the element's output and streams cleanly. Speed (native) and pitch
//     (worklet) are orthogonal, so they're genuinely independent.
//
// THE SWAPPABLE CORE (the seam the spec insists on):
//   `wsolaStretch` is Tier 1. A Tier 2 phase vocoder can replace ONLY this
//   function — same signature (samples, ratio, options) → samples — without
//   touching `createStretchEngine` (the streaming plumbing),
//   the embedded worklet shell, the audio renderer, or the public API. The boundary is marked >>> CORE <<<.
//
// Pure parts (no DOM): wsolaStretch, resampleLinear, pitchShift, hann,
// semitonesToRatio, createStretchEngine — all unit-testable in Node. The graph
// builder createPitchSpeed touches AudioContext only inside its body.
//
// Exports: { semitonesToRatio, hann, wsolaStretch, resampleLinear, pitchShift,
//            createStretchEngine, createPitchSpeed }

/** Equal-tempered ratio for a pitch shift of `s` semitones. */
function semitonesToRatio(semitones) {
  return Math.pow(2, semitones / 12);
}

/** Periodic Hann window of length N. At 50% hop it satisfies COLA (sums to 1). */
function hann(N) {
  const window = new Float32Array(N);
  for (let i = 0; i < N; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
  return window;
}

// >>> CORE (Tier 1: WSOLA) — replace this whole function for Tier 2 ============

// Upper bound on the offline stretch factor — the same ceiling the streaming
// engine clamps the live ratio to ([0.25, 4]). wsolaStretch caps its output
// length at MAX_STRETCH× the input so a large finite ratio cannot drive an
// unbounded Float32Array allocation (the public DoS recorded in AUDIT.md).
const MAX_STRETCH = 4;

/**
 * Time-stretch `input` by `ratio` (output length ≈ ratio × input length) while
 * preserving pitch, using WSOLA: overlap-add of Hann-windowed frames, where each
 * analysis frame's exact position is nudged within ±searchWindow to best match
 * the previous frame's natural continuation (waveform similarity) — which is what
 * keeps the phase coherent and avoids buzzy artifacts.
 *
 * Offline / whole-buffer form. The streaming engine below uses the same idea
 * incrementally; this one is the reference the tests pin.
 *
 * @param {ArrayLike<number>} input
 * @param {number} ratio                   >1 slows/lengthens, <1 speeds/shortens
 * @param {Object} [options]
 * @param {number} [options.frameSize=1024]
 * @param {number} [options.searchWindow]     default frameSize/4
 * @returns {Float32Array}
 */
function wsolaStretch(input, ratio, options = {}) {
  // Finite-guard the SIZE options the same way `ratio` is guarded below: the
  // `|| default` idiom rejects NaN (falsy) but NOT +Infinity (truthy), which
  // would reach `new Float32Array(Infinity)` (hann(N)/`out`) and throw
  // RangeError on allocation. Fall back to the default for any non-finite/<=0.
  const N = Number.isFinite(options.frameSize) && options.frameSize > 0 ? Math.floor(options.frameSize) : 1024;
  const Hs = N >> 1; // 50% synthesis hop (COLA with Hann)
  const L = N - Hs; // overlap length used for the similarity search
  const search = Number.isFinite(options.searchWindow) && options.searchWindow >= 0 ? Math.floor(options.searchWindow) : N >> 2;
  // A non-finite ratio is treated like an invalid (<= 0) one — return the input
  // unchanged. Otherwise NaN would silently yield an empty array (Math.ceil(len*NaN)
  // → new Float32Array(NaN)) and Infinity would throw RangeError on allocation.
  if (!Number.isFinite(ratio) || ratio <= 0 || input.length < N) return Float32Array.from(input);

  // Output/input length = Hs / analysisHop; we want it to equal `ratio`, so:
  const analysisHop = Hs / ratio;

  const win = hann(N);
  // Cap the allocation (and, via the outPos guard in the loop, the iteration
  // count) at MAX_STRETCH× the input. A large finite ratio — wsolaStretch(buf,
  // 1e7) or pitchShift(buf, 1e7), both public — would otherwise size a
  // Float32Array of tens of millions of floats (RangeError / memory DoS). This
  // mirrors the [0.25, 4] ratio bound the streaming engine already enforces in
  // setPitchRatio; here we bound the *output length* so the pure offline export
  // cannot be driven into an unbounded allocation by a hostile/oversized ratio.
  const outputLength = Math.min(Math.ceil(input.length * ratio) + N, input.length * MAX_STRETCH + N);
  const out = new Float32Array(outputLength);
  // Last synthesis-frame start that still fits in `out` (the OLA writes N samples
  // from outPos). Stops the loop when the capped buffer is full.
  const maxOutPos = outputLength - N;

  let analysisPos = 0; // float; nominal start of the next analysis frame
  let templatePos = 0; // start of the "natural continuation" template
  let outPos = 0;
  let first = true;

  while (analysisPos + N + search < input.length && outPos <= maxOutPos) {
    const nominal = Math.round(analysisPos);
    let start = nominal;
    if (!first) {
      // Search ±`search` for the frame whose overlap region best correlates with
      // the template (previous frame continued by Hs). Maximize raw cross-corr.
      let best = -Infinity;
      for (let d = -search; d <= search; d++) {
        const s = nominal + d;
        if (s < 0 || s + L >= input.length) continue;
        let acc = 0;
        for (let i = 0; i < L; i++) acc += input[s + i] * input[templatePos + i];
        if (acc > best) {
          best = acc;
          start = s;
        }
      }
    }
    first = false;

    for (let i = 0; i < N; i++) out[outPos + i] += input[start + i] * win[i];

    templatePos = start + Hs; // where this frame "naturally continues"
    outPos += Hs;
    analysisPos += analysisHop;
  }

  return out.subarray(0, Math.max(0, outPos + (N - Hs)));
}

// >>> END CORE =================================================================

/**
 * Linear-interpolating resampler. Output length ≈ ratio × input length; ratio<1
 * shortens (and, played at the same rate, raises pitch). Pure.
 * @param {ArrayLike<number>} input
 * @param {number} ratio
 * @returns {Float32Array}
 */
function resampleLinear(input, ratio) {
  // Non-finite/non-positive ratio: passthrough copy (mirrors wsolaStretch). NaN
  // would otherwise yield an empty array silently and Infinity a RangeError; this
  // also shields pitchShift, which resamples by 1/ratio.
  if (!Number.isFinite(ratio) || ratio <= 0) return Float32Array.from(input);
  // Cap the output length at MAX_STRETCH× the input, mirroring wsolaStretch. A
  // large finite ratio — resampleLinear(buf, 1e7), or pitchShift(buf, 1e-7) which
  // resamples by 1/1e-7 = 1e7 — would otherwise size a Float32Array of tens of
  // billions of floats (RangeError / memory DoS). The finite check above is not
  // enough on its own; the bound is what shields the allocation.
  const outputLength = Math.max(0, Math.min(Math.round(input.length * ratio), input.length * MAX_STRETCH));
  const out = new Float32Array(outputLength);
  const step = 1 / ratio;
  let position = 0;
  for (let i = 0; i < outputLength; i++) {
    const index = Math.floor(position);
    const fraction = position - index;
    const sampleA = index < input.length ? input[index] : 0;
    const sampleB = index + 1 < input.length ? input[index + 1] : sampleA;
    out[i] = sampleA + (sampleB - sampleA) * fraction;
    position += step;
  }
  return out;
}

/**
 * Constant-tempo pitch shift by `ratio` (2 = up an octave): stretch by ratio,
 * then resample by 1/ratio → same length, pitch ×ratio. Composes the swappable
 * core with the resampler. Pure / offline.
 * @param {ArrayLike<number>} input
 * @param {number} ratio
 * @param {Object} [options]  forwarded to wsolaStretch
 * @returns {Float32Array}
 */
function pitchShift(input, ratio, options) {
  if (ratio === 1) return Float32Array.from(input);
  return resampleLinear(wsolaStretch(input, ratio, options), 1 / ratio);
}

// ---- streaming engine (plumbing around the core) ----------------------------

/** Minimal fixed-capacity ring buffer of Float32 — no per-step allocation. */
class Ring {
  constructor(capacity) {
    this.buffer = new Float32Array(capacity);
    this.capacity = capacity;
    this.readIndex = 0;
    this.count = 0;
  }
  get available() {
    return this.count;
  }
  /** Append `len` samples; overruns drop the oldest (shouldn't happen if pulled). */
  write(samples, length = samples.length) {
    for (let i = 0; i < length; i++) {
      const writeIndex = (this.readIndex + this.count) % this.capacity;
      this.buffer[writeIndex] = samples[i];
      if (this.count < this.capacity) this.count++;
      else this.readIndex = (this.readIndex + 1) % this.capacity;
    }
  }
  /** Peek the i-th unread sample (0 = oldest), without consuming. */
  at(i) {
    return this.buffer[(this.readIndex + i) % this.capacity];
  }
  /** Drop the oldest `n` samples. */
  discard(count) {
    const dropCount = Math.min(count, this.count);
    this.readIndex = (this.readIndex + dropCount) % this.capacity;
    this.count -= dropCount;
  }
  reset() {
    this.readIndex = 0;
    this.count = 0;
  }
}

/**
 * Real-time pitch shifter: push input samples, pull pitch-shifted output at a
 * 1:1 average rate. Continuous WSOLA (no block boundaries) feeding a continuous
 * resampler — both incremental forms of the pure functions above. At ratio 1 it
 * is a transparent passthrough (no DSP, no added artifacts).
 *
 * @param {Object} [options]
 * @param {number} [options.frameSize=1024]
 * @param {number} [options.searchWindow]
 * @param {number} [options.capacity=16384]
 */
function createStretchEngine(options = {}) {
  // Finite-guard the SIZE options the same way `ratio` is guarded in
  // setPitchRatio: the `|| default` idiom rejects NaN (falsy) but NOT +Infinity
  // (truthy), which would reach `new Float32Array(Infinity)` (hann(N), accum, or
  // `new Ring(capacity)`) and throw RangeError. Fall back to the default for any
  // non-finite/<=0 size.
  const N = Number.isFinite(options.frameSize) && options.frameSize > 0 ? Math.floor(options.frameSize) : 1024;
  const Hs = N >> 1;
  const L = N - Hs;
  const search = Number.isFinite(options.searchWindow) && options.searchWindow >= 0 ? Math.floor(options.searchWindow) : N >> 2;
  const capacity = Number.isFinite(options.capacity) && options.capacity > 0 ? Math.floor(options.capacity) : 16384;
  const win = hann(N);

  const inRing = new Ring(capacity); // raw input
  const midRing = new Ring(capacity); // time-stretched (pitch preserved, tempo ×ratio)
  let ratio = 1; // pitch ratio
  const accum = new Float32Array(N); // synthesis OLA accumulator
  let analysisRel = 0; // float, index from inRing read pointer of next frame
  let templateRel = 0;
  let firstFrame = true;
  let resamplePos = 0; // fractional read position into midRing (relative)

  const KEEP_BEHIND = N + 2 * search; // input lookback the template/search needs

  // One WSOLA synthesis step → appends Hs stretched samples to midRing.
  function stretchStep() {
    const nominal = Math.round(analysisRel);
    let start = nominal;
    if (!firstFrame) {
      let best = -Infinity;
      for (let d = -search; d <= search; d++) {
        const s = nominal + d;
        if (s < 0 || s + L >= inRing.available) continue;
        let acc = 0;
        for (let i = 0; i < L; i++) acc += inRing.at(s + i) * inRing.at(templateRel + i);
        if (acc > best) {
          best = acc;
          start = s;
        }
      }
    }
    firstFrame = false;

    // OLA into accum, then flush the first Hs (now complete) to midRing.
    for (let i = 0; i < N; i++) accum[i] += inRing.at(start + i) * win[i];
    midRing.write(accum, Hs);
    accum.copyWithin(0, Hs); // shift remaining N-Hs to front
    accum.fill(0, N - Hs); // zero the freed tail

    templateRel = start + Hs;
    analysisRel += Hs / ratio;

    // Reclaim consumed input, keeping enough lookback for search/template.
    if (analysisRel > KEEP_BEHIND) {
      const drop = Math.floor(analysisRel - KEEP_BEHIND);
      inRing.discard(drop);
      analysisRel -= drop;
      templateRel -= drop;
    }
  }

  // Resample midRing by 1/ratio into `out` until `n` produced or starved.
  function resampleInto(out, n) {
    let produced = 0;
    while (produced < n) {
      const index = Math.floor(resamplePos);
      if (index + 1 >= midRing.available) break; // need one sample of lookahead
      const fraction = resamplePos - index;
      const sampleA = midRing.at(index);
      const sampleB = midRing.at(index + 1);
      out[produced++] = sampleA + (sampleB - sampleA) * fraction;
      resamplePos += ratio;
      const drop = Math.floor(resamplePos);
      if (drop > 0) {
        midRing.discard(drop);
        resamplePos -= drop;
      }
    }
    return produced;
  }

  return {
    /** Set the pitch ratio (1 = passthrough). */
    setPitchRatio(newRatio) {
      // clamp() would let NaN through (NaN < 0.25 and NaN > 4 are both false),
      // permanently poisoning the resampler — keep the prior ratio instead.
      ratio = clamp(finiteOr(newRatio, ratio), 0.25, 4);
    },
    getPitchRatio() {
      return ratio;
    },

    /** Push input samples (a render quantum from the source). */
    push(samples, length) {
      // Default to the array length; reject a non-finite explicit count so it
      // cannot drive Ring.write's loop unboundedly (overruns are dropped, so the
      // loop would never terminate). Also cap to samples.length: you can never
      // append more samples than exist, and reading past the array end yields
      // `undefined`, which a Float32Array stores as NaN — permanently poisoning
      // the ring (and a huge finite count would still drive the write loop a
      // huge-but-finite number of times, which the finite-guard cannot catch).
      if (length === undefined || length > samples.length) length = samples.length;
      else if (!Number.isFinite(length) || length < 0) length = 0;
      inRing.write(samples, length);
    },

    /**
     * Fill `out[0..n)` with pitch-shifted output, zero-padding if starved.
     * @returns {number} samples actually produced (< n means starved)
     */
    pull(out, requestedCount) {
      // A non-finite (notably +Infinity) count would drive the zero-pad loops
      // below unboundedly: out-of-bounds typed-array writes are silently
      // discarded, so `i` never reaches the bound and the thread hangs. Clamp to
      // the destination length, which is the most the loops can usefully fill.
      if (!Number.isFinite(requestedCount) || requestedCount < 0) requestedCount = 0;
      if (requestedCount > out.length) requestedCount = out.length;
      if (ratio === 1) {
        // Transparent passthrough.
        let i = 0;
        while (i < requestedCount && inRing.available > 0) {
          out[i++] = inRing.at(0);
          inRing.discard(1);
        }
        const real = i; // real samples produced (before zero-pad) — report this
        while (i < requestedCount) out[i++] = 0;
        return real;
      }
      // Run stretch steps until enough stretched samples exist to resample requestedCount out.
      // Need ~ requestedCount*ratio mid samples; keep stepping while input allows.
      let guard = 0;
      while (
        midRing.available < Math.ceil(requestedCount * ratio) + 2 &&
        inRing.available > analysisRel + N + search &&
        guard++ < 1024
      ) {
        stretchStep();
      }
      const got = resampleInto(out, requestedCount);
      for (let i = got; i < requestedCount; i++) out[i] = 0; // zero-pad the starved tail
      return got;
    },

    /** Approximate added latency in samples (the WSOLA frame). */
    latencySamples() {
      return N;
    },

    available() {
      return midRing.available;
    },

    reset() {
      inRing.reset();
      midRing.reset();
      accum.fill(0);
      analysisRel = 0;
      templateRel = 0;
      resamplePos = 0;
      firstFrame = true;
    },
  };
}

const PITCH_WORKLET_SOURCE = [clamp.toString(), "// pitch-speed.js\n// Independent speed and pitch control for the audio renderer.\n//\n// HOW SPEED AND PITCH ARE SPLIT (important):\n//   - SPEED (tempo) is NATIVE: the renderer sets mediaElement.playbackRate with\n//     preservesPitch = true. No DSP, best quality. createPitchSpeed.setSpeed()\n//     just drives that.\n//   - PITCH SHIFT is DSP: routed through an AudioWorklet running a WSOLA\n//     time-stretch at NET TEMPO 1 (stretch by r, then resample by 1/r → same\n//     length, pitch ×r). Because the worklet's net tempo is 1, it is rate-matched\n//     to the element's output and streams cleanly. Speed (native) and pitch\n//     (worklet) are orthogonal, so they're genuinely independent.\n//\n// THE SWAPPABLE CORE (the seam the spec insists on):\n//   `wsolaStretch` is Tier 1. A Tier 2 phase vocoder can replace ONLY this\n//   function — same signature (samples, ratio, opts) → samples — without\n//   touching `createStretchEngine` (the streaming plumbing), `the embedded worklet shell`,\n//   the audio renderer, or the public API. The boundary is marked >>> CORE <<<.\n//\n// Pure parts (no DOM): wsolaStretch, resampleLinear, pitchShift, hann,\n// semitonesToRatio, createStretchEngine — all unit-testable in Node. The graph\n// builder createPitchSpeed touches AudioContext only inside its body.\n//\n// Exports: { semitonesToRatio, hann, wsolaStretch, resampleLinear, pitchShift,\n//            createStretchEngine, createPitchSpeed }\n\n/** Equal-tempered ratio for a pitch shift of `s` semitones. */\nfunction semitonesToRatio(s) {\n  return Math.pow(2, s / 12);\n}\n\n/** Periodic Hann window of length N. At 50% hop it satisfies COLA (sums to 1). */\nfunction hann(N) {\n  const w = new Float32Array(N);\n  for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);\n  return w;\n}\n\n// >>> CORE (Tier 1: WSOLA) — replace this whole function for Tier 2 ============\n\n/**\n * Time-stretch `input` by `ratio` (output length ≈ ratio × input length) while\n * preserving pitch, using WSOLA: overlap-add of Hann-windowed frames, where each\n * analysis frame's exact position is nudged within ±searchWindow to best match\n * the previous frame's natural continuation (waveform similarity) — which is what\n * keeps the phase coherent and avoids buzzy artifacts.\n *\n * Offline / whole-buffer form. The streaming engine below uses the same idea\n * incrementally; this one is the reference the tests pin.\n *\n * @param {ArrayLike<number>} input\n * @param {number} ratio                   >1 slows/lengthens, <1 speeds/shortens\n * @param {Object} [opts]\n * @param {number} [opts.frameSize=1024]\n * @param {number} [opts.searchWindow]     default frameSize/4\n * @returns {Float32Array}\n */\nfunction wsolaStretch(input, ratio, opts = {}) {\n  const N = opts.frameSize || 1024;\n  const Hs = N >> 1; // 50% synthesis hop (COLA with Hann)\n  const L = N - Hs; // overlap length used for the similarity search\n  const search = opts.searchWindow != null ? opts.searchWindow : N >> 2;\n  if (ratio <= 0 || input.length < N) return Float32Array.from(input);\n\n  const Ha = ratio; // fractional analysis hop; output/input = Hs/Ha = Hs/ratio... see note\n  // Note: output/input length = Hs / analysisHop. We want = ratio, so\n  // analysisHop = Hs / ratio. (Ha above is a placeholder; real hop below.)\n  const analysisHop = Hs / ratio;\n  void Ha;\n\n  const win = hann(N);\n  const outLen = Math.ceil(input.length * ratio) + N;\n  const out = new Float32Array(outLen);\n\n  let analysisPos = 0; // float; nominal start of the next analysis frame\n  let templatePos = 0; // start of the \"natural continuation\" template\n  let outPos = 0;\n  let first = true;\n\n  while (analysisPos + N + search < input.length) {\n    const nominal = Math.round(analysisPos);\n    let start = nominal;\n    if (!first) {\n      // Search ±`search` for the frame whose overlap region best correlates with\n      // the template (previous frame continued by Hs). Maximize raw cross-corr.\n      let best = -Infinity;\n      for (let d = -search; d <= search; d++) {\n        const s = nominal + d;\n        if (s < 0 || s + L >= input.length) continue;\n        let acc = 0;\n        for (let i = 0; i < L; i++) acc += input[s + i] * input[templatePos + i];\n        if (acc > best) {\n          best = acc;\n          start = s;\n        }\n      }\n    }\n    first = false;\n\n    for (let i = 0; i < N; i++) out[outPos + i] += input[start + i] * win[i];\n\n    templatePos = start + Hs; // where this frame \"naturally continues\"\n    outPos += Hs;\n    analysisPos += analysisHop;\n  }\n\n  return out.subarray(0, Math.max(0, outPos + (N - Hs)));\n}\n\n// >>> END CORE =================================================================\n\n/**\n * Linear-interpolating resampler. Output length ≈ ratio × input length; ratio<1\n * shortens (and, played at the same rate, raises pitch). Pure.\n * @param {ArrayLike<number>} input\n * @param {number} ratio\n * @returns {Float32Array}\n */\nfunction resampleLinear(input, ratio) {\n  const outLen = Math.max(0, Math.round(input.length * ratio));\n  const out = new Float32Array(outLen);\n  const step = 1 / ratio;\n  let pos = 0;\n  for (let i = 0; i < outLen; i++) {\n    const idx = Math.floor(pos);\n    const frac = pos - idx;\n    const a = idx < input.length ? input[idx] : 0;\n    const b = idx + 1 < input.length ? input[idx + 1] : a;\n    out[i] = a + (b - a) * frac;\n    pos += step;\n  }\n  return out;\n}\n\n/**\n * Constant-tempo pitch shift by `ratio` (2 = up an octave): stretch by ratio,\n * then resample by 1/ratio → same length, pitch ×ratio. Composes the swappable\n * core with the resampler. Pure / offline.\n * @param {ArrayLike<number>} input\n * @param {number} ratio\n * @param {Object} [opts]  forwarded to wsolaStretch\n * @returns {Float32Array}\n */\nfunction pitchShift(input, ratio, opts) {\n  if (ratio === 1) return Float32Array.from(input);\n  return resampleLinear(wsolaStretch(input, ratio, opts), 1 / ratio);\n}\n\n// ---- streaming engine (plumbing around the core) ----------------------------\n\n/** Minimal fixed-capacity ring buffer of Float32 — no per-step allocation. */\nclass Ring {\n  constructor(cap) {\n    this.buf = new Float32Array(cap);\n    this.cap = cap;\n    this.r = 0;\n    this.count = 0;\n  }\n  get available() {\n    return this.count;\n  }\n  /** Append `len` samples; overruns drop the oldest (shouldn't happen if pulled). */\n  write(arr, len = arr.length) {\n    for (let i = 0; i < len; i++) {\n      const w = (this.r + this.count) % this.cap;\n      this.buf[w] = arr[i];\n      if (this.count < this.cap) this.count++;\n      else this.r = (this.r + 1) % this.cap;\n    }\n  }\n  /** Peek the i-th unread sample (0 = oldest), without consuming. */\n  at(i) {\n    return this.buf[(this.r + i) % this.cap];\n  }\n  /** Drop the oldest `n` samples. */\n  discard(n) {\n    const m = Math.min(n, this.count);\n    this.r = (this.r + m) % this.cap;\n    this.count -= m;\n  }\n  reset() {\n    this.r = 0;\n    this.count = 0;\n  }\n}\n\n/**\n * Real-time pitch shifter: push input samples, pull pitch-shifted output at a\n * 1:1 average rate. Continuous WSOLA (no block boundaries) feeding a continuous\n * resampler — both incremental forms of the pure functions above. At ratio 1 it\n * is a transparent passthrough (no DSP, no added artifacts).\n *\n * @param {Object} [opts]\n * @param {number} [opts.frameSize=1024]\n * @param {number} [opts.searchWindow]\n * @param {number} [opts.capacity=16384]\n */\nfunction createStretchEngine(opts = {}) {\n  const N = opts.frameSize || 1024;\n  const Hs = N >> 1;\n  const L = N - Hs;\n  const search = opts.searchWindow != null ? opts.searchWindow : N >> 2;\n  const cap = opts.capacity || 16384;\n  const win = hann(N);\n\n  const inRing = new Ring(cap); // raw input\n  const midRing = new Ring(cap); // time-stretched (pitch preserved, tempo ×ratio)\n  let ratio = 1; // pitch ratio\n  const accum = new Float32Array(N); // synthesis OLA accumulator\n  let analysisRel = 0; // float, index from inRing read pointer of next frame\n  let templateRel = 0;\n  let firstFrame = true;\n  let resamplePos = 0; // fractional read position into midRing (relative)\n\n  const KEEP_BEHIND = N + 2 * search; // input lookback the template/search needs\n\n  // One WSOLA synthesis step → appends Hs stretched samples to midRing.\n  function stretchStep() {\n    const nominal = Math.round(analysisRel);\n    let start = nominal;\n    if (!firstFrame) {\n      let best = -Infinity;\n      for (let d = -search; d <= search; d++) {\n        const s = nominal + d;\n        if (s < 0 || s + L >= inRing.available) continue;\n        let acc = 0;\n        for (let i = 0; i < L; i++) acc += inRing.at(s + i) * inRing.at(templateRel + i);\n        if (acc > best) {\n          best = acc;\n          start = s;\n        }\n      }\n    }\n    firstFrame = false;\n\n    // OLA into accum, then flush the first Hs (now complete) to midRing.\n    for (let i = 0; i < N; i++) accum[i] += inRing.at(start + i) * win[i];\n    midRing.write(accum, Hs);\n    accum.copyWithin(0, Hs); // shift remaining N-Hs to front\n    accum.fill(0, N - Hs); // zero the freed tail\n\n    templateRel = start + Hs;\n    analysisRel += Hs / ratio;\n\n    // Reclaim consumed input, keeping enough lookback for search/template.\n    if (analysisRel > KEEP_BEHIND) {\n      const drop = Math.floor(analysisRel - KEEP_BEHIND);\n      inRing.discard(drop);\n      analysisRel -= drop;\n      templateRel -= drop;\n    }\n  }\n\n  // Resample midRing by 1/ratio into `out` until `n` produced or starved.\n  function resampleInto(out, n) {\n    let produced = 0;\n    while (produced < n) {\n      const idx = Math.floor(resamplePos);\n      if (idx + 1 >= midRing.available) break; // need one sample of lookahead\n      const frac = resamplePos - idx;\n      const a = midRing.at(idx);\n      const b = midRing.at(idx + 1);\n      out[produced++] = a + (b - a) * frac;\n      resamplePos += ratio;\n      const drop = Math.floor(resamplePos);\n      if (drop > 0) {\n        midRing.discard(drop);\n        resamplePos -= drop;\n      }\n    }\n    return produced;\n  }\n\n  return {\n    /** Set the pitch ratio (1 = passthrough). */\n    setPitchRatio(r) {\n      ratio = Number.isFinite(r) ? clamp(r, 0.25, 4) : ratio;\n    },\n    getPitchRatio() {\n      return ratio;\n    },\n\n    /** Push input samples (a render quantum from the source). */\n    push(arr, len) {\n      inRing.write(arr, len);\n    },\n\n    /**\n     * Fill `out[0..n)` with pitch-shifted output, zero-padding if starved.\n     * @returns {number} samples actually produced (< n means starved)\n     */\n    pull(out, n) {\n      if (ratio === 1) {\n        // Transparent passthrough.\n        let i = 0;\n        while (i < n && inRing.available > 0) {\n          out[i++] = inRing.at(0);\n          inRing.discard(1);\n        }\n        const real = i; // real samples produced (before zero-pad) — report this\n        while (i < n) out[i++] = 0;\n        return real;\n      }\n      // Run stretch steps until enough stretched samples exist to resample n out.\n      // Need ~ n*ratio mid samples; keep stepping while input allows.\n      let guard = 0;\n      while (\n        midRing.available < Math.ceil(n * ratio) + 2 &&\n        inRing.available > analysisRel + N + search &&\n        guard++ < 1024\n      ) {\n        stretchStep();\n      }\n      const got = resampleInto(out, n);\n      for (let i = got; i < n; i++) out[i] = 0; // zero-pad the starved tail\n      return got;\n    },\n\n    /** Approximate added latency in samples (the WSOLA frame). */\n    latencySamples() {\n      return N;\n    },\n\n    available() {\n      return midRing.available;\n    },\n\n    reset() {\n      inRing.reset();\n      midRing.reset();\n      accum.fill(0);\n      analysisRel = 0;\n      templateRel = 0;\n      resamplePos = 0;\n      firstFrame = true;\n    },\n  };\n}\n\n// embedded pitch worklet\n// The AudioWorkletProcessor that runs the WSOLA pitch shifter on the audio\n// thread. Worklets load from source passed to audioWorklet.addModule(), so this block is\n// serialized into a Blob URL by createPitchSpeed().\n//\n// All the DSP lives in createStretchEngine (pitch-speed.js), which is pure and\n// unit-tested in Node. This file is just the audio-thread shell: per-channel\n// engines, push input quanta, pull pitch-shifted output, take the ratio over the\n// message port.\n//\n// The processor is registered only when AudioWorkletProcessor exists, so this\n// module still imports cleanly in Node (where it harmlessly does nothing) —\n// preserving the \"every file imports in Node\" invariant. It's the one module\n// whose real behavior is verified in the browser, not by the Node suite.\n\nif (typeof AudioWorkletProcessor !== 'undefined') {\n  class PitchProcessor extends AudioWorkletProcessor {\n    constructor(options) {\n      super();\n      /** @type {ReturnType<typeof createStretchEngine>[]} per-channel engines */\n      this._engines = [];\n      this._ratio = 1;\n      this.port.onmessage = (e) => {\n        const d = e.data;\n        if (d && d.type === 'ratio') {\n          this._ratio = d.value;\n          for (const eng of this._engines) eng.setPitchRatio(d.value);\n        }\n      };\n    }\n\n    _engine(c) {\n      if (!this._engines[c]) {\n        const eng = createStretchEngine({ frameSize: 1024 });\n        eng.setPitchRatio(this._ratio);\n        this._engines[c] = eng;\n      }\n      return this._engines[c];\n    }\n\n    process(inputs, outputs) {\n      const input = inputs[0]; // array of channel Float32Arrays (or [])\n      const output = outputs[0];\n      if (!output || output.length === 0) return true;\n\n      for (let c = 0; c < output.length; c++) {\n        const outCh = output[c];\n        const eng = this._engine(c);\n        // Feed this channel (fall back to channel 0, then silence) and pull.\n        const inCh = input && (input[c] || input[0]);\n        if (inCh) eng.push(inCh);\n        eng.pull(outCh, outCh.length);\n      }\n      return true; // keep the node alive across the media's life\n    }\n  }\n\n  registerProcessor('pitch-processor', PitchProcessor);\n}"].join('\n\n');
let defaultPitchWorkletUrl = '';
function getDefaultPitchWorkletUrl() {
  if (!defaultPitchWorkletUrl) {
    defaultPitchWorkletUrl = URL.createObjectURL(new Blob([PITCH_WORKLET_SOURCE], { type: 'text/javascript' }));
  }
  return defaultPitchWorkletUrl;
}

// ---- AudioContext graph (DOM-only; confined to this function) ---------------

/**
 * Wire pitch + speed control around a media element. Speed is native; pitch
 * routes the element's audio through an embedded WSOLA AudioWorklet.
 *
 * @param {Object} opts
 * @param {HTMLMediaElement} opts.mediaElement
 * @param {AudioContext} [opts.audioContext]
 * @param {string} [opts.workletUrl]   override the embedded worklet URL
 * @param {AudioNode} [opts.destination]
 * @returns {Promise<{setSpeed,setPitch,getSpeed,getPitch,setBypass,destroy}>}
 */
async function createPitchSpeed({ mediaElement, audioContext, workletUrl, destination } = {}) {
  const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
  const dest = destination || ctx.destination;
  const url = workletUrl || getDefaultPitchWorkletUrl();

  let speed = 1;
  let semitones = 0;
  let source = null;
  let node = null;
  let connectedDirect = false;
  let bypassed = false; // latest setBypass() intent; honored by ensureWorklet()
  let destroyed = false; // set once in destroy(); a destroyed graph never builds nodes

  // Native speed: always applied to the element, worklet or not.
  function applySpeed() {
    mediaElement.playbackRate = speed;
    // preservesPitch keeps tempo change pitch-neutral (the simple, native path).
    mediaElement.preservesPitch = true;
    if ('mozPreservesPitch' in mediaElement) mediaElement.mozPreservesPitch = true;
    if ('webkitPreservesPitch' in mediaElement) mediaElement.webkitPreservesPitch = true;
  }

  function ensureSource() {
    if (!source) source = ctx.createMediaElementSource(mediaElement);
  }

  // Build the worklet graph lazily on first non-zero pitch.
  async function ensureWorklet() {
    if (node) return;
    await ctx.audioWorklet.addModule(url);
    // destroy() can land during the addModule() await (the renderer's unmount()
    // calls our destroy(), closing ctx). Building/connecting a node on a closed
    // AudioContext throws InvalidStateError — bail before touching the graph.
    if (destroyed) return;
    ensureSource();
    node = new AudioWorkletNode(ctx, 'pitch-processor', { numberOfInputs: 1, numberOfOutputs: 1 });
    // If a setBypass(true) landed during the addModule() await, honor it: keep
    // the direct source->dest route and leave the node detached. Forcing audio
    // through the node here would silently undo the latest bypass intent.
    if (bypassed) {
      if (!connectedDirect) {
        source.connect(dest);
        connectedDirect = true;
      }
      return;
    }
    if (connectedDirect) {
      try {
        source.disconnect(dest);
      } catch {}
      connectedDirect = false;
    }
    source.connect(node);
    node.connect(dest);
  }

  function postRatio() {
    if (node) node.port.postMessage({ type: 'ratio', value: semitonesToRatio(semitones) });
  }

  return {
    setSpeed(rate) {
      // Number.isFinite rejects NaN AND +Infinity (which `rate > 0` alone lets
      // through, then throws when assigned to playbackRate).
      speed = Number.isFinite(rate) && rate > 0 ? rate : 1;
      applySpeed();
      return speed;
    },
    getSpeed() {
      return speed;
    },
    async setPitch(st) {
      // Reject non-finite semitones up front: posting semitonesToRatio(NaN) = NaN
      // would poison the worklet's ratio permanently. Keep the prior pitch.
      if (!Number.isFinite(st)) return semitones;
      semitones = st;
      if (st === 0) {
        // Stay native; if a worklet exists, make it transparent.
        postRatio();
        return semitones;
      }
      await ensureWorklet();
      postRatio();
      return semitones;
    },
    getPitch() {
      return semitones;
    },
    /** Route the element straight to output with no processing (e.g. while casting). */
    setBypass(on) {
      bypassed = !!on;
      if (on) {
        ensureSource();
        if (node) {
          try {
            source.disconnect(node);
          } catch {}
        }
        if (!connectedDirect) {
          source.connect(dest);
          connectedDirect = true;
        }
      } else if (connectedDirect && node) {
        // Bypass off with a worklet present: re-route through the pitch node.
        try {
          source.disconnect(dest);
        } catch {}
        connectedDirect = false;
        source.connect(node);
      } else if (node) {
        // No-op: the node already carries the audio (source->node->dest).
      } else if (source) {
        // Bypass off with no worklet yet. If we already captured the element's
        // audio into the graph (a prior setBypass/setPitch), it must still reach
        // output, so fall back to a direct passthrough. Crucially we do NOT call
        // ensureSource() here: capturing a fresh element only to wire it nowhere
        // would silence playback (the element no longer plays on its own).
        if (!connectedDirect) {
          source.connect(dest);
          connectedDirect = true;
        }
      }
    },
    destroy() {
      destroyed = true; // checked by ensureWorklet() so a late addModule() resolve is inert
      try {
        node && node.disconnect();
      } catch {}
      try {
        source && source.disconnect();
      } catch {}
      if (!audioContext && ctx.close) ctx.close();
    },
  };
}

return { semitonesToRatio, hann, wsolaStretch, resampleLinear, pitchShift, createStretchEngine, createPitchSpeed };
})();

// ---- casting ------------------------------------------------------------
const { isCastableSource, createCasting } = (() => {
// casting.js
// Remote Playback (cast to a TV) via the NATIVE Remote Playback API on the media
// element — no SDK, no dependency. The casting device fetches and plays the
// element's OWN source; controlling the element (play/pause/seek/volume) is
// reflected to the device by the browser, so this module only manages the
// session lifecycle and emits availability + connection state for the consumer's
// cast button.
//
// Reality the API imposes (not the engine's fault — surfaced honestly):
//   - Works in Chromium browsers; Firefox lacks the API and Safari routes via
//     its own AirPlay path → we report `unsupported` gracefully.
//   - The TV fetches the URL itself, so blob:/data:/file: (and unreachable or
//     auth-gated URLs) can't cast → `isCastableSource` filters the scheme-level
//     cases; the rest fail at connect time and we report it.
//
// `isCastableSource` is pure and unit-tested. Everything else touches
// element.remote inside method bodies only — imports cleanly in Node.
//
// Exports: { isCastableSource, createCasting }

/**
 * Whether a source URL is even a candidate for casting. The DEVICE fetches it,
 * so page-local schemes can never reach it. http(s) (and protocol-relative or
 * path-relative URLs, which resolve to http(s) in a browser) are treated as
 * castable; if such a URL is actually unreachable/auth-gated, connect fails and
 * the session reports disconnected — which the consumer can surface.
 * @param {string} src
 * @returns {boolean}
 */
function isCastableSource(src) {
  if (!src) return false;
  return !/^(blob:|data:|file:|mediastream:)/i.test(String(src));
}

/**
 * @param {Object} opts
 * @param {HTMLMediaElement} opts.element
 * @param {() => string} [opts.getSource]   current source URL, for reachability
 * @param {(state: string, info: {available: boolean}) => void} [opts.onChange]
 */
function createCasting({ element, getSource, onChange } = {}) {
  const remote = element && element.remote;
  const hasApi = !!(remote && typeof remote.watchAvailability === 'function');

  let available = false;
  let state = hasApi ? CastState.UNAVAILABLE : CastState.UNSUPPORTED;
  let watchId = null;
  let started = false;
  let destroyed = false; // set once in destroy(); never cleared (no resurrection)

  const sourceCastable = () => (getSource ? isCastableSource(getSource()) : true);
  const emit = () => onChange && onChange(state, { available });

  function setState(next) {
    if (next === state) return;
    state = next;
    emit();
  }

  // Map the element's RemotePlayback.state to our enum, factoring availability
  // and source reachability into the disconnected case.
  function syncFromRemote() {
    if (!hasApi) return setState(CastState.UNSUPPORTED);
    const s = remote.state; // 'connecting' | 'connected' | 'disconnected'
    if (s === 'connecting') return setState(CastState.CONNECTING);
    if (s === 'connected') return setState(CastState.CONNECTED);
    // disconnected: UNSUPPORTED if the source can't be cast at all, else
    // UNAVAILABLE. Whether to SHOW a cast button is gated separately by
    // isAvailable() (a device is actually reachable && the source is castable).
    setState(sourceCastable() ? CastState.UNAVAILABLE : CastState.UNSUPPORTED);
  }

  const onConnecting = () => setState(CastState.CONNECTING);
  const onConnect = () => setState(CastState.CONNECTED);
  const onDisconnect = () => {
    // The element resumes LOCAL playback automatically at its retained position
    // (the renderer owns that position). We just report the transition.
    setState(CastState.DISCONNECTED);
    // Settle back to availability after the transition is observed.
    syncFromRemote();
  };

  return {
    /** Begin watching for devices and tracking connection state. Idempotent. */
    start() {
      if (started || destroyed) return; // a destroyed instance stays inert
      started = true;
      if (!hasApi) {
        setState(CastState.UNSUPPORTED);
        return;
      }
      remote.addEventListener('connecting', onConnecting);
      remote.addEventListener('connect', onConnect);
      remote.addEventListener('disconnect', onDisconnect);
      // watchAvailability fires whenever a reachable device appears/disappears.
      remote
        .watchAvailability((isAvailable) => {
          if (destroyed) return; // a late callback must not touch a torn-down instance
          available = isAvailable;
          if (remote.state === 'disconnected') {
            // 'castable source, no device' is UNAVAILABLE (a reachable device may
            // still appear), matching syncFromRemote and the CastState enum doc —
            // not UNSUPPORTED. Visibility is gated separately by isAvailable().
            setState(sourceCastable() ? CastState.UNAVAILABLE : CastState.UNSUPPORTED);
          }
          emit(); // `available` changed even if `state` did not
        })
        .then((id) => {
          // watchAvailability resolves asynchronously; if destroy() already ran,
          // cancel this orphaned watch instead of leaking it (destroy() saw watchId null).
          if (destroyed) {
            if (remote.cancelWatchAvailability) remote.cancelWatchAvailability(id).catch(() => {});
            return;
          }
          watchId = id;
        })
        .catch(() => {
          // Some engines reject (feature disabled / not allowed) — degrade.
          if (!destroyed) setState(CastState.UNSUPPORTED);
        });
    },

    /** Open the native device picker. No-op when unsupported or no device. */
    async prompt() {
      if (!hasApi || !sourceCastable()) return;
      try {
        await remote.prompt();
      } catch (e) {
        // AbortError = the user dismissed the picker; NotFoundError = no device.
        // Neither is an engine error; leave state as-is.
      }
    },

    /** Re-evaluate after the media source changes (e.g. navigating items). */
    updateSource() {
      syncFromRemote();
    },

    getState() {
      return state;
    },
    isAvailable() {
      return available && sourceCastable();
    },
    isConnected() {
      return state === CastState.CONNECTED;
    },

    destroy() {
      destroyed = true; // checked by start() and the watchAvailability callbacks
      if (hasApi) {
        remote.removeEventListener('connecting', onConnecting);
        remote.removeEventListener('connect', onConnect);
        remote.removeEventListener('disconnect', onDisconnect);
        if (watchId != null && remote.cancelWatchAvailability) {
          remote.cancelWatchAvailability(watchId).catch(() => {});
        }
      }
      watchId = null; // a second destroy() must not re-cancel a stale id
      available = false;
      started = false;
    },
  };
}

return { isCastableSource, createCasting };
})();

// ---- image renderer ------------------------------------------------------------
const { createImageRenderer } = (() => {
// renderer-image.js
// The image renderer. Drives the consumer's <img> through the transform module
// (zoom/pan/rotate/flip math) and owns a gesture recognizer attached to the
// element. It writes ONLY geometry to the handed element (transform / width /
// height / transform-origin — exactly the family virtualization-engine is allowed to
// write) and emits everything else as state. No chrome, no CSS.
//
// ELEMENT CONTRACT (what the consumer's factory should produce):
//   an <img> the consumer positions at the viewport's top-left
//   (position:absolute; inset:0 auto auto 0). The renderer sets its
//   width/height to the natural pixel size, transform-origin to 0 0, and the
//   transform matrix — so the consumer must NOT size it or fight those three
//   properties (the Gate-4 headless rule, same as virtualization-engine).
//
// View state (zoom/pan/rotation/flip) is RETAINED across deactivate() — a
// preloaded neighbor keeps whatever the user left it at; only unmount() drops it.
//
// No DOM at module scope: ResizeObserver / element access live inside methods.





const ZOOM_KEY_STEP = 1.4; // +/- keyboard zoom factor
const PAN_KEY_STEP = 60; // px per arrow press while zoomed

/**
 * @param {ImageItem} item
 * @param {Object} [deps]
 * @param {HTMLElement} [deps.viewport]  the stage the image is transformed within
 * @param {Object} [deps.options]        { fitMode, maxScale, doubleTapScale }
 */
function createImageRenderer(item, deps = {}) {
  const emitter = new Emitter();
  const options = (deps.options && deps.options.image) || deps.options || {};
  const transform = createTransform({
    fitMode: options.fitMode || FitMode.FIT,
    maxScale: options.maxScale,
    doubleTapScale: options.doubleTapScale,
  });
  const recognizer = createGestureRecognizer({ isZoomed: () => transform.isZoomed() });

  let element = null;
  let viewport = null;
  let ro = null;
  let detachGestures = null;
  let load = LoadState.IDLE;
  let viewportRect = { left: 0, top: 0, width: 0, height: 0 };

  // If dimensions are known up front, prime the transform now so fit/bounds are
  // correct before a single pixel loads (the clean-math path the spec wants).
  if (item.width && item.height) transform.setNaturalSize(item.width, item.height);

  const emit = (type, payload) => emitter.emit(type, payload);
  const local = (x, y) => ({ x: x - viewportRect.left, y: y - viewportRect.top });

  function measureViewport() {
    if (!viewport) return;
    const r = viewport.getBoundingClientRect();
    viewportRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    transform.setViewport(r.width, r.height);
  }

  // Write the matrix to the element (geometry only) and emit the state.
  function paint() {
    const s = transform.getState();
    if (element) {
      element.style.transformOrigin = '0 0';
      element.style.transform = `matrix(${s.matrix.join(',')})`;
    }
    emit(RendererEvent.TRANSFORM, s);
  }

  // Run a transform mutation, repaint, and re-announce zoom capability (its
  // `current`/`fitAvailable` changed).
  function apply(fn) {
    fn();
    paint();
    emit(RendererEvent.CAPABILITY);
  }

  function onLoaded() {
    if (!element) return;
    const w = element.naturalWidth || item.width || 0;
    const h = element.naturalHeight || item.height || 0;
    if (w && h) {
      transform.setNaturalSize(w, h);
      element.style.width = `${w}px`;
      element.style.height = `${h}px`;
    }
    load = LoadState.LOADED;
    emit(RendererEvent.LOAD, { state: load });
    emit(RendererEvent.CAPABILITY); // zoom is now `ready`
    paint();
  }

  function onError(e) {
    load = LoadState.ERROR;
    emit(RendererEvent.LOAD, { state: load, error: e });
  }

  // ---- gesture → transform / intent wiring ---------------------------------
  function wireGestures() {
    recognizer.on('pan', ({ deltaX, deltaY }) => apply(() => transform.panBy(deltaX, deltaY)));
    recognizer.on('pinch', ({ scaleDelta, deltaX, deltaY, centerX, centerY }) =>
      apply(() => {
        const p = local(centerX, centerY);
        transform.zoomBy(scaleDelta, p.x, p.y);
        transform.panBy(deltaX, deltaY);
      }),
    );
    recognizer.on('wheelzoom', ({ factor, x, y }) =>
      apply(() => {
        const p = local(x, y);
        transform.zoomBy(factor, p.x, p.y);
      }),
    );
    recognizer.on('doubletap', ({ x, y }) =>
      apply(() => {
        const p = local(x, y);
        transform.zoomTo(transform.doubleTapTarget(), p.x, p.y);
      }),
    );
    // tap on an image is a no-op (per spec: image tap does nothing).

    // Not-zoomed drags resolve to navigate / dismiss — forwarded as INTENT so the
    // shell (or any embedder) decides. Progress is emitted for optional drag-follow.
    recognizer.on('navigatemove', ({ deltaX, total }) =>
      emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'horizontal', dx: deltaX, total }),
    );
    recognizer.on('navigateend', ({ willNavigate, direction }) => {
      if (willNavigate) emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, direction });
      else emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'horizontal', dx: 0, total: 0 });
    });
    recognizer.on('dismissmove', ({ deltaY, total, progress }) =>
      emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'vertical', dy: deltaY, total, progress }),
    );
    recognizer.on('dismissend', ({ willDismiss }) => {
      if (willDismiss) emit(RendererEvent.INTENT, { type: Intent.DISMISS });
      else emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'vertical', dy: 0, total: 0, progress: 0 });
    });
  }

  const renderer = defineRenderer({
    type: MediaType.IMAGE,

    mount(_item, el) {
      element = el;
      viewport = deps.viewport || el.parentElement || el;
      element.style.transformOrigin = '0 0';
      // Subscribe the recognizer→transform/intent handlers ONCE here. activate()/
      // deactivate() only attach/detach DOM input — re-running this per activation
      // would stack duplicate handlers (the recognizer's Emitter never dedupes),
      // so after N preload/reactivate cycles one gesture would apply N times.
      wireGestures();
      measureViewport();

      ro = new ResizeObserver(() => {
        measureViewport();
        paint();
      });
      ro.observe(viewport);

      load = LoadState.LOADING;
      emit(RendererEvent.LOAD, { state: load });
      // The factory has set src; observe its load. If already complete, fire now.
      if (element.complete && element.naturalWidth) onLoaded();
      else {
        element.addEventListener('load', onLoaded);
        element.addEventListener('error', onError);
      }
      paint();
    },

    activate() {
      if (!detachGestures && element) {
        detachGestures = recognizer.attach(element);
      }
      measureViewport();
      paint();
    },

    deactivate() {
      // Stop receiving pointer input while a non-current neighbor, but KEEP the
      // transform state (resume exactly where the user left it).
      if (detachGestures) {
        detachGestures();
        detachGestures = null;
      }
      recognizer.reset();
    },

    unmount() {
      if (detachGestures) detachGestures();
      detachGestures = null;
      if (ro) ro.disconnect();
      ro = null;
      if (element) {
        element.removeEventListener('load', onLoaded);
        element.removeEventListener('error', onError);
      }
      recognizer.reset();
      emitter.clear();
      element = null;
      viewport = null;
    },

    handleKey(e) {
      switch (e.key) {
        case '+':
        case '=':
          apply(() => transform.zoomBy(ZOOM_KEY_STEP));
          return true;
        case '-':
        case '_':
          apply(() => transform.zoomBy(1 / ZOOM_KEY_STEP));
          return true;
        case 'ArrowLeft':
        case 'ArrowRight':
        case 'ArrowUp':
        case 'ArrowDown': {
          if (!transform.isZoomed()) return false; // not zoomed → shell navigates
          const dx = e.key === 'ArrowLeft' ? PAN_KEY_STEP : e.key === 'ArrowRight' ? -PAN_KEY_STEP : 0;
          const dy = e.key === 'ArrowUp' ? PAN_KEY_STEP : e.key === 'ArrowDown' ? -PAN_KEY_STEP : 0;
          apply(() => transform.panBy(dx, dy));
          return true;
        }
        default:
          return false;
      }
    },

    isZoomed() {
      return transform.isZoomed();
    },

    getCapabilities() {
      return {
        type: MediaType.IMAGE,
        zoom: transform.getZoomCapability(),
        playback: null,
        tracks: null,
        castable: false,
        fullscreen: true,
        download: true,
      };
    },

    getState() {
      return { load, transform: transform.getState(), source: item.src };
    },

    on: (type, fn) => emitter.on(type, fn),

    // ---- consumer-facing controls (not part of the shell contract) ----------
    zoomIn(factor = ZOOM_KEY_STEP) {
      apply(() => transform.zoomBy(factor));
    },
    zoomOut(factor = ZOOM_KEY_STEP) {
      apply(() => transform.zoomBy(1 / factor));
    },
    zoomTo(scale, ox, oy) {
      apply(() => transform.zoomTo(scale, ox, oy));
    },
    panBy(dx, dy) {
      apply(() => transform.panBy(dx, dy));
    },
    rotateLeft() {
      apply(() => transform.rotateLeft());
    },
    rotateRight() {
      apply(() => transform.rotateRight());
    },
    flipHorizontal() {
      apply(() => transform.flipHorizontal());
    },
    flipVertical() {
      apply(() => transform.flipVertical());
    },
    setFitMode(mode) {
      apply(() => transform.setFitMode(mode));
    },
    reset() {
      apply(() => transform.reset());
    },
    resetZoom() {
      apply(() => transform.resetZoom());
    },
    getTransform() {
      return transform.getState();
    },
    getSource() {
      return item.src;
    },
  });

  return renderer;
}

return { createImageRenderer };
})();

// ---- video renderer ------------------------------------------------------------
const { createVideoRenderer } = (() => {
// renderer-video.js
// The video renderer. Drives the consumer's <video> via the HTMLMediaElement
// API with a Plyr-shaped surface, exposed headlessly: it emits playback state,
// caption cues, track lists, autoplay outcome, PiP and cast state — and renders
// nothing. Captions are parsed by the cue module (not a showing <track>, which
// would paint), so caption TEXT STYLING is an emitted preference the consumer
// applies; the engine never styles it.
//
// View state (currentTime, volume, speed, track selection) is RETAINED across
// deactivate() — navigate away from a half-watched video and back resumes where
// it was. A deactivated (preloaded) video is paused and does not play until
// activate().
//
// No DOM at module scope.







const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const isIOS =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.platform || '') ||
    (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1));

/**
 * @param {VideoItem} item
 * @param {Object} [deps]
 * @param {Object} [deps.options]  { rates, seekStep, volumeStep, fps, autoplay, captionStyle }
 */
function createVideoRenderer(item, deps = {}) {
  const emitter = new Emitter();
  const options = (deps.options && deps.options.video) || deps.options || {};
  const rates = options.rates || DEFAULT_RATES;
  const seekStep = options.seekStep || 10;
  const volumeStep = options.volumeStep || 0.1;
  const fps = options.fps || 25;
  const recognizer = createGestureRecognizer({ isZoomed: () => false });

  let element = null;
  let active = false;
  let load = LoadState.IDLE;
  let detachGestures = null;
  let casting = null;
  let controlsVisible = true;
  let pip = false;
  let autoplay = { attempted: false, blocked: false, muted: false };

  /** @type {{def:any,index:number,label:string,srclang:string,cueTrack:any,loaded:boolean}[]} */
  let captions = [];
  let currentCaptions = -1; // -1 = off
  let captionStyle = { background: 'rgba(0,0,0,0.75)', color: '#fff', fontSize: '1em', opacity: 1, ...(options.captionStyle || {}) };
  const fetchAborts = new Set(); // every in-flight caption fetch (concurrent loads), so unmount aborts all

  const currentSrc = () => item.src || (item.sources && item.sources[0] && item.sources[0].src) || '';
  const emit = (type, payload) => emitter.emit(type, payload);

  function bufferedAhead(v) {
    try {
      const b = v.buffered;
      if (!b || !b.length || !isFinite(v.duration) || v.duration <= 0) return 0;
      for (let i = 0; i < b.length; i++) {
        if (v.currentTime >= b.start(i) && v.currentTime <= b.end(i)) return Math.min(1, b.end(i) / v.duration);
      }
      return Math.min(1, b.end(b.length - 1) / v.duration);
    } catch {
      return 0;
    }
  }

  function playbackStatus() {
    const v = element;
    if (!v) return null;
    const state = v.ended ? PlayState.ENDED : v.paused ? PlayState.PAUSED : PlayState.PLAYING;
    return {
      state,
      currentTime: v.currentTime,
      duration: v.duration,
      buffered: bufferedAhead(v),
      seeking: v.seeking,
      volume: v.volume,
      muted: v.muted,
      speed: v.playbackRate,
      loop: v.loop,
      pip,
    };
  }

  const emitPlayback = () => emit(RendererEvent.PLAYBACK, playbackStatus());
  const emitPlaybackThrottled = frameThrottle(emitPlayback);

  // ---- captions ------------------------------------------------------------
  function captionList() {
    return captions.map((c) => ({ index: c.index, label: c.label, srclang: c.srclang, kind: c.def.kind || 'captions' }));
  }
  function emitTracks() {
    emit(RendererEvent.TRACKS, { captions: captionList(), audio: [], current: currentCaptions });
  }
  async function ensureCaptionLoaded(i) {
    const c = captions[i];
    if (!c || c.loaded) return;
    c.loaded = true;
    if (c.def.src) {
      const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
      if (ac) fetchAborts.add(ac);
      try {
        const text = await fetch(c.def.src, ac ? { signal: ac.signal } : undefined).then((r) => r.text());
        c.cueTrack = createCueTrack(parseVTT(text).cues);
      } catch {
        c.cueTrack = createCueTrack([]); // failed/aborted → empty, never throws
      } finally {
        if (ac) fetchAborts.delete(ac);
      }
    } else {
      c.cueTrack = createCueTrack([]);
    }
  }
  function setupCaptions() {
    const defs = (item.tracks || []).filter((t) => !t.kind || t.kind === 'captions' || t.kind === 'subtitles');
    captions = defs.map((def, index) => ({
      def,
      index,
      label: def.label || def.srclang || `Track ${index + 1}`,
      srclang: def.srclang || '',
      cueTrack: null,
      loaded: false,
    }));
    const def = captions.findIndex((c) => c.def.default);
    currentCaptions = def >= 0 ? def : -1;
    emitTracks();
    if (currentCaptions >= 0) ensureCaptionLoaded(currentCaptions).then(emitTracks);
  }
  function updateCues() {
    if (currentCaptions < 0 || !element) return;
    const c = captions[currentCaptions];
    if (!c || !c.cueTrack) return;
    const { cues, changed } = c.cueTrack.update(element.currentTime);
    if (changed) emit(RendererEvent.CUES, { cues, trackIndex: currentCaptions, style: captionStyle });
  }

  // ---- media event handlers ------------------------------------------------
  const onTimeUpdate = () => {
    emitPlaybackThrottled();
    updateCues();
  };
  const onPlay = () => emitPlayback();
  const onPause = () => emitPlayback();
  const onEnded = () => emitPlayback();
  const onSeeking = () => emitPlayback();
  const onSeeked = () => {
    if (currentCaptions >= 0 && captions[currentCaptions]?.cueTrack) captions[currentCaptions].cueTrack.reset();
    emitPlayback();
    updateCues();
  };
  const onVolume = () => emitPlayback();
  const onRate = () => emitPlayback();
  const onDuration = () => emitPlayback();
  const onProgress = () => emitPlayback();
  const onLoadedMeta = () => {
    load = LoadState.LOADED;
    emit(RendererEvent.LOAD, { state: load });
    emit(RendererEvent.CAPABILITY);
    emitPlayback();
  };
  const onWaiting = () => {
    load = LoadState.LOADING;
    emit(RendererEvent.LOAD, { state: load });
  };
  const onCanPlay = () => {
    if (load !== LoadState.LOADED) {
      load = LoadState.LOADED;
      emit(RendererEvent.LOAD, { state: load });
    }
    emitPlayback(); // mirror the audio renderer: refresh the playback snapshot on buffer recovery
  };
  const onError = (e) => {
    load = LoadState.ERROR;
    emit(RendererEvent.LOAD, { state: load, error: element && element.error ? element.error : e });
  };
  const onEnterPip = () => {
    pip = true;
    emitPlayback();
  };
  const onLeavePip = () => {
    pip = false;
    emitPlayback();
  };

  const MEDIA_EVENTS = [
    ['timeupdate', onTimeUpdate],
    ['play', onPlay],
    ['playing', onPlay],
    ['pause', onPause],
    ['ended', onEnded],
    ['seeking', onSeeking],
    ['seeked', onSeeked],
    ['volumechange', onVolume],
    ['ratechange', onRate],
    ['durationchange', onDuration],
    ['progress', onProgress],
    ['loadedmetadata', onLoadedMeta],
    ['waiting', onWaiting],
    ['canplay', onCanPlay],
    ['enterpictureinpicture', onEnterPip],
    ['leavepictureinpicture', onLeavePip],
  ];

  // ---- gestures ------------------------------------------------------------
  function wireGestures() {
    recognizer.on('tap', () => {
      controlsVisible = !controlsVisible;
      emit(RendererEvent.CONTROLS, { visible: controlsVisible });
    });
    // doubletap on video: deliberately a no-op (avoids fighting the tap toggle).
    recognizer.on('navigatemove', ({ deltaX, total }) =>
      emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'horizontal', dx: deltaX, total }),
    );
    recognizer.on('navigateend', ({ willNavigate, direction }) => {
      if (willNavigate) emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, direction });
      else emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'horizontal', dx: 0, total: 0 });
    });
    recognizer.on('dismissmove', ({ deltaY, total, progress }) =>
      emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'vertical', dy: deltaY, total, progress }),
    );
    recognizer.on('dismissend', ({ willDismiss }) => {
      if (willDismiss) emit(RendererEvent.INTENT, { type: Intent.DISMISS });
      else emit(RendererEvent.INTENT, { type: 'dragprogress', axis: 'vertical', dy: 0, total: 0, progress: 0 });
    });
    // pan/pinch/wheelzoom are ignored — video isn't zoomable.
  }

  // ---- autoplay (honest policy handling) -----------------------------------
  async function tryAutoplay() {
    if (!element) return;
    autoplay = { attempted: true, blocked: false, muted: false };
    try {
      await element.play();
    } catch {
      // A deactivate()/unmount() can land during the await; bail before touching
      // `element` (which unmount sets to null) or restarting a non-current slot.
      if (!active || !element) return;
      // Blocked with sound → the documented muted-autoplay fallback.
      element.muted = true;
      autoplay.muted = true;
      try {
        await element.play();
      } catch {
        autoplay.blocked = true;
      }
    }
    if (!element) return; // unmounted during an await
    if (!active) {
      // Deactivated mid-attempt: a preloaded video must not play (its play()
      // promise may have resolved after deactivate()'s pause). Pause and stop.
      if (!element.paused) element.pause();
      return;
    }
    emit(RendererEvent.LOAD, { state: load, autoplay });
    emitPlayback();
  }

  const renderer = defineRenderer({
    type: MediaType.VIDEO,

    mount(_item, el) {
      element = el;
      element.playsInline = true;
      element.setAttribute('playsinline', '');
      if (typeof element.preservesPitch === 'boolean') element.preservesPitch = true;
      load = LoadState.LOADING;
      emit(RendererEvent.LOAD, { state: load });

      for (const [type, fn] of MEDIA_EVENTS) element.addEventListener(type, fn);
      // Capture-phase error: a <video> with <source> children does NOT fire its
      // own 'error' when all sources fail — the error fires on the <source> and
      // doesn't bubble. A capturing listener on the element catches both the
      // element's own error (src=) and descendant <source> failures.
      element.addEventListener('error', onError, true);

      // Wire the recognizer handlers ONCE (activate()/deactivate() only attach/
      // detach DOM input). Re-wiring per activation would stack duplicate handlers.
      wireGestures();
      setupCaptions();
      casting = createCasting({
        element,
        getSource: currentSrc,
        onChange: (state, info) => emit(RendererEvent.CAST, { state, available: info.available }),
      });

      if (element.readyState >= 1) onLoadedMeta();
      emitPlayback();
    },

    activate() {
      active = true;
      if (!detachGestures && element) {
        detachGestures = recognizer.attach(element);
      }
      if (casting) casting.start();
      if (options.autoplay) tryAutoplay();
      // Re-announce now that the shell forwards our events (mount's emits predated it).
      emitTracks();
      emitPlayback();
    },

    deactivate() {
      active = false;
      // A playing video MUST pause on navigate-away (spec edge case). Position,
      // volume, speed, track all retained for resume.
      if (element && !element.paused) element.pause();
      emitPlaybackThrottled.cancel(); // drop a frame queued by the last timeupdate
      if (detachGestures) {
        detachGestures();
        detachGestures = null;
      }
      recognizer.reset();
    },

    unmount() {
      if (element) {
        try {
          element.pause();
        } catch {}
        for (const [type, fn] of MEDIA_EVENTS) element.removeEventListener(type, fn);
        element.removeEventListener('error', onError, true);
      }
      emitPlaybackThrottled.cancel(); // a queued RAF must not fire after teardown
      if (detachGestures) detachGestures();
      detachGestures = null;
      if (casting) casting.destroy();
      casting = null;
      for (const ac of fetchAborts) ac.abort(); // abort EVERY in-flight caption fetch
      fetchAborts.clear();
      recognizer.reset();
      emitter.clear();
      element = null;
    },

    handleKey(e) {
      const v = element;
      if (!v) return false;
      switch (e.key) {
        case ' ':
        case 'k':
          this.toggle();
          return true;
        case 'ArrowLeft':
          this.seekBy(-seekStep);
          return true;
        case 'ArrowRight':
          this.seekBy(seekStep);
          return true;
        case 'ArrowUp':
          this.volumeBy(volumeStep);
          return true;
        case 'ArrowDown':
          this.volumeBy(-volumeStep);
          return true;
        case 'm':
          this.toggleMute();
          return true;
        case 'c':
          this.cycleCaptions();
          return true;
        case 'l':
          this.toggleLoop();
          return true;
        case ',':
          this.frameStep(-1);
          return true;
        case '.':
          this.frameStep(1);
          return true;
        default:
          if (/^[0-9]$/.test(e.key)) {
            this.seekToPercent(Number(e.key) * 10);
            return true;
          }
          return false;
      }
    },

    isZoomed() {
      return false;
    },

    getCapabilities() {
      return {
        type: MediaType.VIDEO,
        zoom: null,
        playback: {
          supported: true,
          canSeek: true,
          canSetRate: true,
          canSetVolume: !isIOS, // iOS ignores programmatic volume (device-wide control)
          rates,
          pip: typeof document !== 'undefined' && !!document.pictureInPictureEnabled,
          pitchShift: false,
        },
        tracks: { captions: captionList(), audio: [] },
        castable: isCastableSource(currentSrc()),
        fullscreen: true,
        download: true,
      };
    },

    getState() {
      return {
        load,
        playback: playbackStatus(),
        tracks: { captions: captionList(), audio: [] },
        currentCaptions,
        captionStyle,
        controlsVisible,
        autoplay,
        pip,
        cast: casting ? casting.getState() : null,
        poster: item.poster || null,
        source: currentSrc(),
      };
    },

    on: (type, fn) => emitter.on(type, fn),

    // ---- consumer controls ---------------------------------------------------
    play() {
      return element && element.play();
    },
    pause() {
      if (element) element.pause();
    },
    toggle() {
      if (!element) return;
      if (element.paused || element.ended) element.play();
      else element.pause();
    },
    stop() {
      if (!element) return;
      element.pause();
      element.currentTime = 0;
    },
    restart() {
      if (!element) return;
      element.currentTime = 0;
      element.play();
    },
    seek(time) {
      // A non-finite target would throw on the currentTime setter; ignore it
      // (covers seekBy/seekToPercent/frameStep, which all route through here).
      if (!element || !Number.isFinite(time)) return;
      element.currentTime = Math.max(0, isFinite(element.duration) ? Math.min(time, element.duration) : time);
    },
    seekBy(delta) {
      if (element) this.seek(element.currentTime + delta);
    },
    seekToPercent(pct) {
      if (element && isFinite(element.duration)) this.seek((pct / 100) * element.duration);
    },
    frameStep(dir) {
      // Only meaningful while paused; advance by one frame (best-effort, fps-based).
      if (element && element.paused) this.seek(element.currentTime + (dir / fps));
    },
    setVolume(v) {
      // Math.min/max pass NaN through; element.volume = NaN throws, so guard it.
      if (element && Number.isFinite(v)) element.volume = Math.max(0, Math.min(1, v));
    },
    getVolume() {
      return element ? element.volume : 0;
    },
    volumeBy(delta) {
      if (element) this.setVolume(element.volume + delta);
    },
    mute() {
      if (element) element.muted = true;
    },
    unmute() {
      if (element) element.muted = false;
    },
    toggleMute() {
      if (element) element.muted = !element.muted;
    },
    setSpeed(rate) {
      // playbackRate rejects non-finite/<=0 with a throw; match the audio renderer.
      if (element && Number.isFinite(rate) && rate > 0) element.playbackRate = rate;
    },
    setLoop(on) {
      if (element) element.loop = !!on;
      emitPlayback();
    },
    toggleLoop() {
      if (element) this.setLoop(!element.loop);
    },
    /** Switch captions by index, or pass -1 / null to turn them off. */
    setCaptions(index) {
      // An out-of-range positive index would be reported back as a phantom track;
      // treat it as "off", same as a negative/null index. The `!(index >= 0)` form
      // rejects NaN/-Infinity as well as negatives — a bare `index < 0` is false for
      // NaN, so a non-finite consumer value (setCaptions(NaN)) would otherwise poison
      // currentCaptions permanently (cycleCaptions() then re-derives NaN forever).
      currentCaptions = index == null || !(index >= 0) || index >= captions.length ? -1 : index;
      if (currentCaptions >= 0) {
        ensureCaptionLoaded(currentCaptions).then(() => {
          if (captions[currentCaptions]?.cueTrack) captions[currentCaptions].cueTrack.reset();
          updateCues();
          emitTracks();
        });
      } else {
        emit(RendererEvent.CUES, { cues: [], trackIndex: -1, style: captionStyle });
      }
      emitTracks();
    },
    cycleCaptions() {
      const next = currentCaptions + 1 >= captions.length ? -1 : currentCaptions + 1;
      this.setCaptions(next);
    },
    setCaptionByLang(lang) {
      const i = captions.findIndex((c) => c.srclang === lang);
      this.setCaptions(i);
    },
    /** Caption text styling is emitted preference state — the consumer applies it. */
    setCaptionStyle(style) {
      captionStyle = { ...captionStyle, ...style };
      emit(RendererEvent.CUES, { cues: [], trackIndex: currentCaptions, style: captionStyle, styleOnly: true });
      return captionStyle;
    },
    getCaptionStyle() {
      return captionStyle;
    },
    async togglePictureInPicture() {
      if (!element || !document.pictureInPictureEnabled) return;
      try {
        if (document.pictureInPictureElement === element) await document.exitPictureInPicture();
        else await element.requestPictureInPicture();
      } catch {
        /* user gesture required / not allowed — leave state */
      }
    },
    requestCast() {
      if (casting) casting.prompt();
    },
    getSource() {
      return currentSrc();
    },
    getPoster() {
      return item.poster || null;
    },
  });

  return renderer;
}

return { createVideoRenderer };
})();

// ---- audio renderer ------------------------------------------------------------
const { createAudioRenderer } = (() => {
// renderer-audio.js
// The audio renderer. Drives the consumer's <audio>, sharing the playback-state
// shape with video, and adds the audio-specific machinery: an ordered queue
// (queue.js) with repeat / play-once-and-stop / A-B repeat, native speed +
// independent WSOLA pitch (pitch-speed.js), decoded waveform peaks
// (waveform.js), casting, and Media Session OS controls. It renders nothing —
// the consumer draws the waveform/scrubber and calls these controls.
//
// No gesture recognizer here: <audio> has no visual surface. The consumer's
// chrome (waveform, scrubber) handles pointer input and calls seek()/etc.
//
// Queue model: the shell passes the gallery's audio items (with their gallery
// indices) as deps.playlist; advancing/auto-advance emits INTENT navigate so the
// shell moves to that item (continuous playback). Single-item use needs no
// playlist. Repeat-one / play-once / A-B act on the current element without
// navigating. No DOM at module scope.







const DEFAULT_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

// iOS makes HTMLMediaElement.volume read-only (device-wide control), for <audio>
// as well as <video>. Mirror the video renderer's canSetVolume guard so a consumer
// on iOS isn't told it can set volume and draw a dead slider. Scoped per-IIFE.
const isIOS =
  typeof navigator !== 'undefined' &&
  (/iP(hone|ad|od)/.test(navigator.platform || '') ||
    (/Mac/.test(navigator.platform || '') && navigator.maxTouchPoints > 1));

/**
 * @param {AudioItem} item
 * @param {Object} [deps]
 * @param {Object} [deps.options]              { rates, seekStep, volumeStep, waveform, peakBuckets, waveformMaxBytes, workletUrl, repeat, playOnce, autoplay }
 * @param {{item:any,index:number}[]} [deps.playlist]   gallery audio items + indices
 * @param {number} [deps.playlistIndex]        this item's position in the playlist
 * @param {number} [deps.index]                this item's gallery index (single-item fallback)
 */
function createAudioRenderer(item, deps = {}) {
  const emitter = new Emitter();
  const options = (deps.options && deps.options.audio) || deps.options || {};
  const rates = options.rates || DEFAULT_RATES;
  const seekStep = options.seekStep || 10;
  const volumeStep = options.volumeStep || 0.1;

  const playlist = deps.playlist && deps.playlist.length ? deps.playlist : [{ item, index: deps.index || 0 }];
  // This renderer always renders exactly `item` (gallery index `selfIndex`); the
  // shell creates a *different* renderer for any other index. A queue advance that
  // resolves back to selfIndex is therefore a self-navigate the shell would dedupe.
  const selfIndex =
    deps.index != null
      ? deps.index
      : (playlist[deps.playlistIndex != null ? deps.playlistIndex : 0] || {}).index;
  const queue = createQueue({
    items: playlist,
    index: deps.playlistIndex != null ? deps.playlistIndex : 0,
    repeat: options.repeat || RepeatMode.NONE,
    playOnce: !!options.playOnce,
  });

  let element = null;
  let load = LoadState.IDLE;
  let casting = null;
  let pitchSpeed = null; // lazily-created AudioContext graph (only when pitch != 0)
  let semitones = 0;
  let speed = 1;
  let waveformReady = false;
  let lastWaveform = null; // retained so activate() can re-announce it (peaks travel by event only)

  const currentSrc = () => item.src || (item.sources && item.sources[0] && item.sources[0].src) || '';
  const emit = (type, payload) => emitter.emit(type, payload);

  function bufferedAhead(a) {
    try {
      const b = a.buffered;
      if (!b || !b.length || !isFinite(a.duration) || a.duration <= 0) return 0;
      for (let i = 0; i < b.length; i++) {
        if (a.currentTime >= b.start(i) && a.currentTime <= b.end(i)) return Math.min(1, b.end(i) / a.duration);
      }
      return Math.min(1, b.end(b.length - 1) / a.duration);
    } catch {
      return 0;
    }
  }

  function playbackStatus() {
    const a = element;
    if (!a) return null;
    const state = a.ended ? PlayState.ENDED : a.paused ? PlayState.PAUSED : PlayState.PLAYING;
    return {
      state,
      currentTime: a.currentTime,
      duration: a.duration,
      buffered: bufferedAhead(a),
      seeking: a.seeking,
      volume: a.volume,
      muted: a.muted,
      speed: a.playbackRate,
      loop: a.loop,
      pip: false,
    };
  }
  const emitPlayback = () => emit(RendererEvent.PLAYBACK, playbackStatus());
  const emitPlaybackThrottled = frameThrottle(emitPlayback);

  function queueState() {
    return {
      items: playlist.map((p, i) => ({ index: p.index, title: (p.item && p.item.title) || '', position: i })),
      current: queue.index,
      repeat: queue.getRepeat(),
      playOnce: queue.getPlayOnce(),
      ab: queue.getAB(),
    };
  }
  const emitQueue = () => emit(RendererEvent.TRACKS, queueState());

  // A queue move can resolve back to THIS renderer's own gallery index (a wrap on
  // a single-entry repeat-all queue). Emitting NAVIGATE there is a no-op: the shell
  // dedupes (goTo: `if (i === this.currentIndex) return`), so the track would stop
  // instead of looping. Restart the element locally in that case.
  function navigateOrRestart(galleryIndex) {
    if (galleryIndex === selfIndex && element) {
      element.currentTime = 0;
      element.play().catch(() => {});
      return;
    }
    emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, index: galleryIndex, autoplay: true });
  }

  // ---- end-of-track decision (repeat / play-once / advance) ----------------
  function handleEnded() {
    const d = queue.onEnded();
    if (d.action === 'repeat') {
      element.currentTime = 0;
      element.play().catch(() => {});
    } else if (d.action === 'advance') {
      const target = playlist[d.index];
      if (target) navigateOrRestart(target.index);
      else emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, index: undefined, autoplay: true });
    }
    emitPlayback();
    emitQueue();
  }

  // ---- A-B repeat (loop a [a,b] segment) -----------------------------------
  function checkAB() {
    if (!element) return;
    const target = queue.abSeek(element.currentTime);
    if (target != null) element.currentTime = target;
  }

  // ---- media events --------------------------------------------------------
  const onTimeUpdate = () => {
    checkAB();
    emitPlaybackThrottled();
  };
  const onEndedEv = () => handleEnded();
  const simple = () => emitPlayback();
  const onLoadedMeta = () => {
    load = LoadState.LOADED;
    emit(RendererEvent.LOAD, { state: load });
    emit(RendererEvent.CAPABILITY);
    emitPlayback();
  };
  const onWaiting = () => {
    load = LoadState.LOADING;
    emit(RendererEvent.LOAD, { state: load });
  };
  // Recover load state after a rebuffer: onWaiting drops `load` to LOADING when
  // the element stalls; without this, a `canplay` on resume would leave `load`
  // stuck at LOADING forever (perpetual buffering spinner). Mirrors the video
  // renderer's onCanPlay. Keep `simple`'s emitPlayback for the wired event.
  const onCanPlay = () => {
    if (load !== LoadState.LOADED) {
      load = LoadState.LOADED;
      emit(RendererEvent.LOAD, { state: load });
    }
    emitPlayback();
  };
  const onError = (e) => {
    load = LoadState.ERROR;
    emit(RendererEvent.LOAD, { state: load, error: element && element.error ? element.error : e });
  };
  const MEDIA_EVENTS = [
    ['timeupdate', onTimeUpdate],
    ['ended', onEndedEv],
    ['play', simple],
    ['playing', simple],
    ['pause', simple],
    ['seeking', simple],
    ['seeked', simple],
    ['volumechange', simple],
    ['ratechange', simple],
    ['durationchange', simple],
    ['progress', simple],
    ['loadedmetadata', onLoadedMeta],
    ['waiting', onWaiting],
    ['canplay', onCanPlay],
  ];

  // ---- waveform (decode off the main path; or use supplied peaks) ----------
  async function loadWaveform() {
    if (item.peaks && item.peaks.length) {
      waveformReady = true;
      lastWaveform = { peaks: item.peaks, duration: item.duration };
      emit(RendererEvent.WAVEFORM, lastWaveform);
      return;
    }
    if (options.waveform === false) return;
    const src = currentSrc();
    if (!src) return; // nothing to decode (fetch handles http/blob/data alike — this is NOT the cast check)
    try {
      const { peaks, duration } = await decodePeaks({
        url: src,
        buckets: options.peakBuckets || 1000,
        normalize: true,
        // Finite-guard the cap: a non-finite/non-positive consumer value (NaN, the
        // Infinity a `JSON.parse('1e999')` config yields, 0, negatives) must fall
        // back to decodePeaks' default — forwarding it raw would make BOTH DoS
        // guards there no-op (NaN/Infinity comparisons are always false), silently
        // disabling the size cap on attacker-controlled item URLs. undefined →
        // decodePeaks' default cap.
        maxBytes:
          Number.isFinite(options.waveformMaxBytes) && options.waveformMaxBytes > 0
            ? options.waveformMaxBytes
            : undefined,
      });
      // decodePeaks fetches + decodes the whole (consumer-controlled) source, which
      // can outlive an unmount(). Re-check teardown before writing freed state, the
      // way tryAutoplay()/setPitch() do post-await — otherwise a late decode mutates
      // a torn-down renderer (waveformReady/lastWaveform) and emits into a cleared
      // emitter. element is the renderer's liveness flag (unmount() nulls it).
      if (!element) return; // unmounted during the decode await
      waveformReady = true;
      lastWaveform = { peaks, duration };
      emit(RendererEvent.WAVEFORM, lastWaveform);
    } catch {
      /* decode unavailable / CORS / format — consumer simply gets no waveform */
    }
  }

  // ---- Media Session (OS-level controls) -----------------------------------
  // Called from activate(), after `renderer` is assigned — referencing it via
  // closure (not `this`) so the handlers bind to the real control methods.
  function setupMediaSession() {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return;
    const md = item.mediaMetadata;
    try {
      if ((md || item.title) && typeof MediaMetadata !== 'undefined') {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: (md && md.title) || item.title || '',
          artist: (md && md.artist) || '',
          album: (md && md.album) || '',
          artwork: (md && md.artwork) || [],
        });
      }
      const set = (action, fn) => {
        try {
          navigator.mediaSession.setActionHandler(action, fn);
        } catch {}
      };
      set('play', () => renderer.play());
      set('pause', () => renderer.pause());
      set('previoustrack', () => renderer.prev());
      set('nexttrack', () => renderer.next());
      set('seekto', (d) => d && d.seekTime != null && renderer.seek(d.seekTime));
    } catch {
      /* Media Session partially supported — ignore */
    }
  }

  // Release the global mediaSession singleton this renderer claimed in activate().
  // Without this, the handler closures (capturing element/queue/pitchSpeed) keep a
  // destroyed renderer alive and an OS media key would drive a torn-down instance.
  function clearMediaSession() {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) return;
    for (const action of ['play', 'pause', 'previoustrack', 'nexttrack', 'seekto']) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {}
    }
    try {
      navigator.mediaSession.metadata = null;
    } catch {}
  }

  const renderer = defineRenderer({
    type: MediaType.AUDIO,

    mount(_item, el) {
      element = el;
      if (typeof element.preservesPitch === 'boolean') element.preservesPitch = true;
      load = LoadState.LOADING;
      emit(RendererEvent.LOAD, { state: load });
      for (const [type, fn] of MEDIA_EVENTS) element.addEventListener(type, fn);
      // Capture-phase error catches <source>-child load failures (which don't
      // fire/bubble on the element itself) as well as the element's own error.
      element.addEventListener('error', onError, true);
      casting = createCasting({
        element,
        getSource: currentSrc,
        onChange: (state, info) => emit(RendererEvent.CAST, { state, available: info.available }),
      });
      if (element.readyState >= 1) onLoadedMeta();
      emitQueue();
      loadWaveform();
      emitPlayback();
    },

    activate() {
      if (casting) casting.start();
      setupMediaSession();
      if (options.autoplay) element.play().catch(() => {});
      // Re-announce derived state now that the shell is forwarding our events
      // (peaks/queue only travel by event; mount's emits predated forwarding).
      if (lastWaveform) emit(RendererEvent.WAVEFORM, lastWaveform);
      emitPlayback();
      emitQueue();
    },

    deactivate() {
      if (element && !element.paused) element.pause(); // pause on navigate-away; retain position
      emitPlaybackThrottled.cancel(); // drop a frame queued by the last timeupdate
      clearMediaSession(); // relinquish the OS controls; the next active renderer re-claims them
    },

    unmount() {
      if (element) {
        try {
          element.pause();
        } catch {}
        for (const [type, fn] of MEDIA_EVENTS) element.removeEventListener(type, fn);
        element.removeEventListener('error', onError, true);
      }
      emitPlaybackThrottled.cancel(); // a queued RAF must not fire after teardown
      clearMediaSession();
      if (casting) casting.destroy();
      casting = null;
      if (pitchSpeed) pitchSpeed.destroy();
      pitchSpeed = null;
      emitter.clear();
      element = null;
    },

    handleKey(e) {
      if (!element) return false;
      switch (e.key) {
        case ' ':
        case 'k':
          this.toggle();
          return true;
        case 'ArrowLeft':
          this.seekBy(-seekStep);
          return true;
        case 'ArrowRight':
          this.seekBy(seekStep);
          return true;
        case 'ArrowUp':
          this.volumeBy(volumeStep);
          return true;
        case 'ArrowDown':
          this.volumeBy(-volumeStep);
          return true;
        case 'm':
          this.toggleMute();
          return true;
        case 'l':
          this.toggleLoop();
          return true;
        default:
          if (/^[0-9]$/.test(e.key)) {
            this.seekToPercent(Number(e.key) * 10);
            return true;
          }
          return false;
      }
    },

    getCapabilities() {
      return {
        type: MediaType.AUDIO,
        zoom: null,
        playback: {
          supported: true,
          canSeek: true,
          canSetRate: true,
          canSetVolume: !isIOS, // iOS ignores programmatic volume (device-wide control)
          rates,
          pip: false,
          pitchShift: true, // WSOLA worklet
        },
        tracks: null,
        castable: isCastableSource(currentSrc()),
        fullscreen: false,
        download: true,
      };
    },

    getState() {
      return {
        load,
        playback: playbackStatus(),
        queue: queueState(),
        waveformReady,
        pitch: semitones,
        speed,
        cast: casting ? casting.getState() : null,
        source: currentSrc(),
        metadata: item.mediaMetadata || null,
      };
    },

    on: (type, fn) => emitter.on(type, fn),

    // ---- consumer controls ---------------------------------------------------
    play() {
      return element && element.play();
    },
    pause() {
      if (element) element.pause();
    },
    toggle() {
      if (!element) return;
      if (element.paused || element.ended) element.play();
      else element.pause();
    },
    stop() {
      if (!element) return;
      element.pause();
      element.currentTime = 0;
    },
    restart() {
      if (!element) return;
      element.currentTime = 0;
      element.play();
    },
    seek(time) {
      // A non-finite target would throw on the currentTime setter; ignore it
      // (covers seekBy/seekToPercent, which all route through here).
      if (!element || !Number.isFinite(time)) return;
      element.currentTime = Math.max(0, isFinite(element.duration) ? Math.min(time, element.duration) : time);
    },
    seekBy(delta) {
      if (element) this.seek(element.currentTime + delta);
    },
    seekToPercent(pct) {
      if (element && isFinite(element.duration)) this.seek((pct / 100) * element.duration);
    },
    setVolume(v) {
      // Math.min/max pass NaN through; element.volume = NaN throws, so guard it.
      if (element && Number.isFinite(v)) element.volume = Math.max(0, Math.min(1, v));
    },
    getVolume() {
      return element ? element.volume : 0;
    },
    volumeBy(d) {
      if (element) this.setVolume(element.volume + d);
    },
    mute() {
      if (element) element.muted = true;
    },
    unmute() {
      if (element) element.muted = false;
    },
    toggleMute() {
      if (element) element.muted = !element.muted;
    },
    setLoop(on) {
      if (element) element.loop = !!on;
      emitPlayback();
    },
    toggleLoop() {
      if (element) this.setLoop(!element.loop);
    },

    // Speed without pitch change — the native path (preservesPitch).
    setSpeed(rate) {
      // Number.isFinite also rejects +Infinity, which `rate > 0` alone admits and
      // which then throws when assigned to playbackRate (leaving speed poisoned).
      speed = Number.isFinite(rate) && rate > 0 ? rate : 1;
      if (element) {
        element.playbackRate = speed;
        if (typeof element.preservesPitch === 'boolean') element.preservesPitch = true;
      }
      if (pitchSpeed) pitchSpeed.setSpeed(speed);
      emitPlayback();
    },

    // Pitch without speed change — engages the WSOLA worklet lazily.
    async setPitch(st) {
      // Reject non-finite (NaN would be posted to the worklet as a NaN ratio and
      // poison it permanently), and clamp to the worklet's effective range — the
      // ratio is clamped to [0.25, 4] ≈ ±24 semitones — so getPitch() reports what
      // is actually audible rather than an unbounded value.
      if (!Number.isFinite(st)) return semitones;
      semitones = clamp(st, -24, 24);
      if (!pitchSpeed && semitones !== 0) {
        try {
          const created = await createPitchSpeed({ mediaElement: element, workletUrl: options.workletUrl });
          // createPitchSpeed awaits audioWorklet.addModule(); during that await
          // either unmount() can land (it runs `if (pitchSpeed) pitchSpeed.destroy()`
          // while pitchSpeed is still null, a no-op) OR a concurrent setPitch() can
          // have already built and adopted its own graph (both calls passed the
          // `!pitchSpeed` guard while pitchSpeed was still null). In either case the
          // freshly built graph must be destroyed before we drop it — otherwise its
          // owned AudioContext is never closed and leaks (browsers cap concurrent
          // AudioContexts ~6). Mirrors tryAutoplay()'s post-await element re-check.
          if (!element || pitchSpeed) {
            created.destroy();
            return semitones;
          }
          pitchSpeed = created;
          pitchSpeed.setSpeed(speed);
        } catch {
          semitones = 0; // worklet/AudioContext unavailable — degrade to no pitch shift
          return 0;
        }
      }
      if (pitchSpeed) {
        // setPitch() awaits ensureWorklet()'s addModule() for non-zero pitch.
        // unmount() can land during that await, destroying `pitchSpeed` (closing
        // its AudioContext) and nulling it here. Capture the local ref and
        // re-check teardown after the await — the same post-await re-check the
        // first await above does — so a late rejection can't go unhandled.
        const graph = pitchSpeed;
        try {
          await graph.setPitch(semitones);
        } catch {
          // ensureWorklet() guards against building on a closed context, but a
          // late addModule() rejection (teardown mid-load) must not surface as
          // an unhandled rejection — setPitch() is called fire-and-forget.
          return semitones;
        }
        if (!element) return semitones; // unmounted during the await
      }
      emit(RendererEvent.CAPABILITY);
      return semitones;
    },
    getPitch() {
      return semitones;
    },

    // Queue / playlist
    next() {
      const r = queue.next();
      if (r) navigateOrRestart(queue.current().index);
      emitQueue();
    },
    prev() {
      const r = queue.prev();
      if (r) navigateOrRestart(queue.current().index);
      emitQueue();
    },
    jumpTo(position) {
      if (!Number.isFinite(position)) return; // don't navigate on a junk position
      queue.jump(position);
      const c = queue.current();
      if (!c) return;
      emit(RendererEvent.INTENT, { type: Intent.NAVIGATE, index: c.index, autoplay: true });
      emitQueue();
    },
    setRepeat(mode) {
      queue.setRepeat(mode);
      emitQueue();
    },
    setPlayOnce(on) {
      queue.setPlayOnce(on);
      emitQueue();
    },
    setAB(a, b) {
      queue.setAB(a, b);
      emitQueue();
    },
    clearAB() {
      queue.clearAB();
      emitQueue();
    },

    requestCast() {
      if (casting) casting.prompt();
    },
    getWaveformReady() {
      return waveformReady;
    },
    getSource() {
      return currentSrc();
    },
  });

  return renderer;
}

return { createAudioRenderer };
})();

// ---- shell ------------------------------------------------------------
const { MediaViewer } = (() => {
// shell.js
// The media-agnostic orchestrator. It owns the lifecycle, the current index,
// navigation, neighbor preloading (via the element factory), renderer routing
// (through the registry — zero type knowledge), keyboard capture + handleKey
// delegation + fallback, the focus trap, scroll lock, fullscreen/theater state,
// session-pref persistence, reduced-motion, and transition phase/direction.
//
// It NEVER does type-specific work: every per-type decision is delegated to the
// active renderer through the uniform contract. Adding a media type is "register
// a renderer" — nothing here changes.
//
// HEADLESS NOTE: the only DOM it manages is the media elements the factory
// hands it (appended to / removed from the consumer's `stage`, with a default
// inline `display` toggle so exactly the current one shows) and the focus/
// fullscreen targets it's explicitly told to manage. All appearance, all chrome,
// all transition visuals are the consumer's, driven off emitted state.



// Active-renderer events forwarded through the shell so a consumer subscribes in
// ONE place and keeps working across navigation (the shell re-points the
// forwarding when the current renderer changes).
const FORWARDED = [
  RendererEvent.LOAD,
  RendererEvent.CAPABILITY,
  RendererEvent.PLAYBACK,
  RendererEvent.TRANSFORM,
  RendererEvent.CUES,
  RendererEvent.TRACKS,
  RendererEvent.CAST,
  RendererEvent.WAVEFORM,
  RendererEvent.CONTROLS,
];

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"]),video[controls],audio[controls]';

class MediaViewer {
  /**
   * @param {Object} options
   * @param {Item[]} options.items
   * @param {(item:any) => HTMLElement} options.createElement   the element factory (§2.2)
   * @param {typeof createRendererRegistry} options.registry
   * @param {HTMLElement} [options.container]   the viewer root (focus trap + fullscreen target)
   * @param {HTMLElement} [options.stage]       where media elements are appended (default: container)
   * @param {boolean} [options.wrap=false]      wrap vs clamp at the ends
   * @param {number} [options.preload=1]        neighbor preload radius (±N)
   * @param {boolean} [options.closeOnEscape=true]
   * @param {number} [options.transitionMs=0]   match your CSS transition; engine waits this long before open/closed
   * @param {Object} [options.options]          per-renderer options ({image,video,audio})
   * @param {{enabled?:boolean,key?:string,storage?:Storage}} [options.prefs]
   * @param {() => void} [options.onChange]     fired on any state change (like virtualization-engine)
   */
  constructor(options = {}) {
    this.items = options.items || [];
    this.createElement = options.createElement;
    this.registry = options.registry;
    this.container = options.container || null;
    this.stage = options.stage || options.container || null;
    this.wrap = !!options.wrap;
    // Clamp to a non-negative integer no larger than the gallery: Infinity would
    // make the ±N window loop never terminate (tab hang), a huge value would
    // allocate unbounded slots, and NaN/negative would drop even the current slot.
    this.preload = Number.isFinite(options.preload)
      ? Math.max(0, Math.min(Math.floor(options.preload), this.items.length))
      : 1;
    this.closeOnEscape = options.closeOnEscape !== false;
    this.options = options.options || {};
    this.onChange = options.onChange;
    this.prefs = {
      enabled: false,
      key: 'media-engine:prefs',
      storage: typeof localStorage !== 'undefined' ? localStorage : null,
      ...(options.prefs || {}),
    };

    if (!this.createElement) throw new Error('media-engine: options.createElement (the element factory) is required');
    if (!this.registry) throw new Error('media-engine: options.registry is required');

    this.emitter = new Emitter();
    this.lifecycle = Lifecycle.CLOSED;
    this.currentIndex = -1;
    this.direction = 0; // -1 prev, +1 next, 0 none
    // Once destroy() runs the instance is inert: the public entry points early-
    // return so open()/goTo()/etc. cannot resurrect a torn-down viewer (re-add the
    // document keydown listener, re-lock scroll, re-mount renderers). Mirrors the
    // `destroyed` flag createCasting()/createPitchSpeed() use and the sibling engines.
    this._destroyed = false;

    /** @type {Map<number, {index:number,item:any,element:HTMLElement,renderer:any,offs:Function[]}>} */
    this.slots = new Map();
    this.active = null; // current slot

    this.fullscreen = false;
    this.theater = false;
    this.dimLevel = 0;

    this._invoker = null;
    this._prevOverflow = '';
    this._scrollLocked = false;
    this._timer = 0;
    this._fwdOffs = [];
    this._savedPrefs = this._loadPrefs();

    // Precompute the audio playlist (audio items + their gallery indices) so an
    // audio renderer's queue can advance across the gallery.
    this._audioPlaylist = this.items
      .map((item, index) => ({ item, index }))
      .filter((s) => s.item && s.item.type === MediaType.AUDIO);

    // reduced-motion: emitted flag; the engine also forces transition timing to 0.
    this._mq = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
    this.reducedMotion = !!(this._mq && this._mq.matches);
    this._onMq = () => {
      this.reducedMotion = !!(this._mq && this._mq.matches);
      this._notify();
    };
    if (this._mq && this._mq.addEventListener) this._mq.addEventListener('change', this._onMq);

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onFsChange = this._onFsChange.bind(this);
    if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', this._onFsChange);

    this.transitionMs = options.transitionMs || 0;
  }

  // ---- public: lifecycle ----------------------------------------------------

  /**
   * Open the viewer at an index (a first-class path, not "open then jump").
   * @param {number} index
   * @param {{fromRect?:DOMRect, autoplay?:boolean}} [o]
   */
  open(index = 0, o = {}) {
    if (this._destroyed) return; // inert after destroy() — must not re-add listeners / re-mount / re-lock scroll
    if (this.lifecycle === Lifecycle.OPEN || this.lifecycle === Lifecycle.OPENING) {
      this.goTo(index, o);
      return;
    }
    this._clearTimer();
    // finiteOr: a non-finite index would survive clamp() and poison currentIndex,
    // opening a blank viewer (the window loop builds no slots for a NaN index).
    this.currentIndex = clamp(finiteOr(index, 0), 0, Math.max(0, this.items.length - 1));
    this.direction = 0;
    this.lifecycle = Lifecycle.OPENING;
    this._lockScroll();
    this._captureFocus();
    if (typeof document !== 'undefined') document.addEventListener('keydown', this._onKeyDown, true);
    this._reconcile();
    if (o.autoplay) this._playActive();
    this.emitter.emit('phase', { phase: Lifecycle.OPENING, index: this.currentIndex, fromRect: o.fromRect || null });
    this.emitter.emit('indexchange', { index: this.currentIndex, item: this.currentItem() });
    this._notify();
    // After the consumer's enter transition (or immediately when reduced/0), settle to OPEN.
    this._schedule(() => {
      this.lifecycle = Lifecycle.OPEN;
      this.emitter.emit('phase', { phase: Lifecycle.OPEN, index: this.currentIndex });
      this._notify();
    });
  }

  /** Close the viewer, running the exit transition (engine waits transitionMs). */
  close() {
    if (this.lifecycle === Lifecycle.CLOSED || this.lifecycle === Lifecycle.CLOSING) return;
    this._clearTimer();
    this.lifecycle = Lifecycle.CLOSING;
    this.emitter.emit('phase', { phase: Lifecycle.CLOSING, index: this.currentIndex });
    this._notify();
    this._schedule(() => this._teardown());
  }

  // ---- public: navigation ---------------------------------------------------

  /** @param {{autoplay?:boolean}} [o] */
  next(o) {
    const t = this._step(1);
    // Pass the intended direction so a wrap (last → 0) still reports +1, not the
    // index-derived -1 that goTo would otherwise infer at the wrap boundary.
    if (t != null) this.goTo(t, { ...o, direction: 1 });
  }
  /** @param {{autoplay?:boolean}} [o] */
  prev(o) {
    const t = this._step(-1);
    if (t != null) this.goTo(t, { ...o, direction: -1 });
  }

  /**
   * Navigate to an index (clamped/wrapped). No-op if it's already current.
   * @param {number} index
   * @param {{autoplay?:boolean, direction?:number}} [o]
   */
  goTo(index, o = {}) {
    if (this._destroyed) return; // inert after destroy() — must not re-reconcile / re-mount slots
    // A non-finite index would wrap/clamp to NaN, slip past the dedupe guard
    // (NaN === anything is false), set a garbage direction, and blank the stage.
    if (!this.items.length || !Number.isFinite(index)) return;
    let i = index;
    if (this.wrap) i = ((i % this.items.length) + this.items.length) % this.items.length;
    else i = clamp(i, 0, this.items.length - 1);
    if (i === this.currentIndex) return;
    // Prefer an explicit caller-supplied direction (next()/prev() know their
    // intent): an index comparison inverts at the wrap edge — a forward wrap
    // (last → 0) compares as -1, a backward wrap (0 → last) as +1.
    this.direction = o.direction === 1 || o.direction === -1 ? o.direction : i > this.currentIndex ? 1 : -1;
    this.currentIndex = i;
    this._reconcile();
    if (o.autoplay) this._playActive();
    this.emitter.emit('transition', { direction: this.direction, index: i });
    this.emitter.emit('indexchange', { index: i, item: this.currentItem() });
    this._notify();
  }

  // ---- public: state & controls passthrough ---------------------------------

  /** The active renderer (the consumer calls its type-specific controls). */
  getRenderer() {
    return this.active ? this.active.renderer : null;
  }
  currentItem() {
    return this.items[this.currentIndex] || null;
  }
  getItems() {
    return this.items;
  }
  hasNext() {
    return this.wrap ? this.items.length > 1 : this.currentIndex < this.items.length - 1;
  }
  hasPrev() {
    return this.wrap ? this.items.length > 1 : this.currentIndex > 0;
  }

  /** Subscribe to shell events AND forwarded active-renderer events. Returns off. */
  on(type, fn) {
    return this.emitter.on(type, fn);
  }

  /** Full snapshot for the consumer to render any chrome from. */
  getState() {
    const item = this.currentItem();
    const r = this.getRenderer();
    return {
      lifecycle: this.lifecycle,
      currentIndex: this.currentIndex,
      count: this.items.length,
      item,
      hasNext: this.hasNext(),
      hasPrev: this.hasPrev(),
      direction: this.direction,
      fullscreen: this.fullscreen,
      fullscreenAvailable: this._fullscreenAvailable(),
      fullscreenFallback: !this._fullscreenAvailable(),
      theater: this.theater,
      dimLevel: this.dimLevel,
      reducedMotion: this.reducedMotion,
      aria: this._aria(item),
      capabilities: r ? r.getCapabilities() : null,
      renderer: r ? r.getState() : null,
    };
  }

  // ---- fullscreen / theater -------------------------------------------------

  _fullscreenAvailable() {
    return typeof document !== 'undefined' && !!document.fullscreenEnabled;
  }
  toggleFullscreen() {
    if (this._destroyed) return;
    if (this.fullscreen) this.exitFullscreen();
    else this.requestFullscreen();
  }
  requestFullscreen() {
    if (this._destroyed) return; // inert after destroy()
    const el = this.container;
    if (!el) return;
    if (!this._fullscreenAvailable()) {
      // No API → emit fallback intent; the consumer renders a full-window layout.
      this.fullscreen = true; // logical fullscreen via fallback
      this.emitter.emit('fullscreen', { active: true, fallback: true });
      this._notify();
      return;
    }
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
  }
  exitFullscreen() {
    if (!this._fullscreenAvailable()) {
      this.fullscreen = false;
      this.emitter.emit('fullscreen', { active: false, fallback: true });
      this._notify();
      return;
    }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  _onFsChange() {
    this.fullscreen = !!(typeof document !== 'undefined' && document.fullscreenElement);
    this.emitter.emit('fullscreen', { active: this.fullscreen, fallback: false });
    this._notify();
  }

  /** Theater / lights-out: the engine emits intent + level; the consumer dims the page. */
  setTheater(on, dimLevel = on ? 0.85 : 0) {
    if (this._destroyed) return; // inert after destroy()
    this.theater = !!on;
    // Finite-guard + range-clamp: a non-finite dimLevel (NaN/Infinity from a
    // slider div-by-zero or a JSON.parse('1e999') config) would be stored
    // permanently and emitted, silently disabling the consumer's CSS dim and
    // surviving subsequent toggleTheater() flips. Fall back to the default.
    this.dimLevel = clamp(finiteOr(dimLevel, on ? 0.85 : 0), 0, 1);
    this.emitter.emit('theater', { theater: this.theater, dimLevel: this.dimLevel });
    this._notify();
  }
  toggleTheater() {
    this.setTheater(!this.theater);
  }

  // ---- teardown -------------------------------------------------------------

  destroy() {
    this._destroyed = true;
    this._clearTimer();
    if (typeof document !== 'undefined') {
      document.removeEventListener('keydown', this._onKeyDown, true);
      document.removeEventListener('fullscreenchange', this._onFsChange);
    }
    if (this._mq && this._mq.removeEventListener) this._mq.removeEventListener('change', this._onMq);
    for (const i of [...this.slots.keys()]) this._destroySlot(i);
    this._unlockScroll();
    // Mirror _teardown(): a real Fullscreen session and the invoker focus are
    // shell-managed state that must be released even on the destroy() path.
    if (this.fullscreen && this._fullscreenAvailable() && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.fullscreen = false;
    this._restoreFocus();
    this.emitter.clear();
    this.active = null;
    this.lifecycle = Lifecycle.CLOSED;
  }

  // ---- internals: window / slots -------------------------------------------

  _step(dir) {
    if (!this.items.length) return null;
    let i = this.currentIndex + dir;
    if (i < 0) return this.wrap ? this.items.length - 1 : null;
    if (i >= this.items.length) return this.wrap ? 0 : null;
    return i;
  }

  _windowIndices() {
    const out = new Set();
    const n = this.items.length;
    for (let d = -this.preload; d <= this.preload; d++) {
      let i = this.currentIndex + d;
      if (this.wrap) i = ((i % n) + n) % n;
      if (i >= 0 && i < n) out.add(i);
    }
    return out;
  }

  _reconcile() {
    const want = this._windowIndices();
    for (const i of [...this.slots.keys()]) if (!want.has(i)) this._destroySlot(i);
    for (const i of want) if (!this.slots.has(i)) this._createSlot(i);

    for (const [i, slot] of this.slots) {
      const isCurrent = i === this.currentIndex;
      // Default visibility: show only the current element. Consumers wanting a
      // slide/cross-fade read the slots + transition event and override.
      if (slot.element) slot.element.style.display = isCurrent ? '' : 'none';
      if (isCurrent) this._setActive(slot);
      else if (slot.active) {
        slot.renderer.deactivate();
        slot.active = false;
      }
    }
  }

  _createSlot(i) {
    const item = this.items[i];
    const element = this.createElement(item);
    if (this.stage && element && element.parentNode !== this.stage) this.stage.appendChild(element);

    const deps = { viewport: this.stage, options: this.options, index: i };
    if (item.type === MediaType.AUDIO) {
      deps.playlist = this._audioPlaylist;
      deps.playlistIndex = this._audioPlaylist.findIndex((s) => s.index === i);
    }
    const renderer = this.registry.create(item, deps);

    const slot = { index: i, item, element, renderer, active: false, offs: [] };
    // Intent routing (navigate / dismiss / drag progress). Only the current
    // item's intents act; neighbors are deactivated and won't emit anyway.
    slot.offs.push(
      renderer.on(RendererEvent.INTENT, (intent) => {
        if (slot !== this.active) return;
        this._handleIntent(intent);
      }),
    );
    renderer.mount(item, element);
    this.slots.set(i, slot);
    return slot;
  }

  _destroySlot(i) {
    const slot = this.slots.get(i);
    if (!slot) return;
    if (slot === this.active) {
      this._unforward();
      this.active = null;
    }
    for (const off of slot.offs) off();
    try {
      slot.renderer.unmount();
    } catch {}
    if (slot.element && slot.element.parentNode) slot.element.parentNode.removeChild(slot.element);
    this.slots.delete(i);
  }

  _setActive(slot) {
    if (this.active === slot) return;
    if (this.active) {
      this._unforward();
      this.active.renderer.deactivate();
      this.active.active = false;
    }
    this.active = slot;
    this._applyPrefs(slot.renderer);
    // Forward BEFORE activate so the renderer's activate-time (re-)emissions —
    // waveform peaks, track lists, the current transform/playback — actually
    // reach the consumer. Events emitted earlier (during mount, before this slot
    // was current) are intentionally not forwarded; activate() re-announces them.
    this._forward(slot);
    slot.renderer.activate();
    slot.active = true;
    this.emitter.emit('rendererchange', { index: slot.index, renderer: slot.renderer });
  }

  _forward(slot) {
    for (const type of FORWARDED) {
      this._fwdOffs.push(
        slot.renderer.on(type, (payload) => {
          this.emitter.emit(type, payload);
          if (type === RendererEvent.PLAYBACK || type === RendererEvent.TRACKS || type === RendererEvent.CAPABILITY) {
            this._maybeSavePrefs();
          }
          this._notify();
        }),
      );
    }
  }
  _unforward() {
    for (const off of this._fwdOffs) off();
    this._fwdOffs = [];
  }

  _handleIntent(intent) {
    switch (intent.type) {
      case Intent.NAVIGATE:
        if (intent.index != null) this.goTo(intent.index, { autoplay: intent.autoplay });
        else if (intent.direction === 'next') this.next({ autoplay: intent.autoplay });
        else if (intent.direction === 'previous') this.prev({ autoplay: intent.autoplay });
        break;
      case Intent.DISMISS:
      case Intent.CLOSE:
        this.close();
        break;
      default:
        // dragprogress and any other progress hints → pass through for visuals.
        this.emitter.emit('dragprogress', intent);
        break;
    }
  }

  _playActive() {
    const r = this.getRenderer();
    if (r && typeof r.play === 'function') {
      try {
        const p = r.play();
        if (p && p.catch) p.catch(() => {});
      } catch {}
    }
  }

  // ---- internals: keyboard / focus -----------------------------------------

  _onKeyDown(e) {
    if (this._destroyed) return; // inert after destroy() (listener is removed too, but belt-and-braces)
    if (this.lifecycle !== Lifecycle.OPEN && this.lifecycle !== Lifecycle.OPENING) return;
    if (e.key === 'Tab') {
      this._trapFocus(e);
      return;
    }
    // Delegate to the renderer first (§2.3): it consumes keys meaningful in its
    // current state; on decline the shell applies its own fallback.
    const r = this.getRenderer();
    if (r && r.handleKey(e)) {
      e.preventDefault();
      this._notify();
      return;
    }
    switch (e.key) {
      case 'Escape':
        if (this.closeOnEscape) {
          e.preventDefault();
          this.close();
        }
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullscreen();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.prev();
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.next();
        break;
      case 'Home':
        e.preventDefault();
        this.goTo(0);
        break;
      case 'End':
        e.preventDefault();
        this.goTo(this.items.length - 1);
        break;
      default:
        break;
    }
  }

  _trapFocus(e) {
    const root = this.container;
    if (!root) return;
    const nodes = [...root.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length,
    );
    if (nodes.length === 0) {
      e.preventDefault(); // nothing focusable → keep focus on the container
      root.focus();
      return;
    }
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
    if (e.shiftKey && activeEl === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && activeEl === last) {
      e.preventDefault();
      first.focus();
    } else if (!root.contains(activeEl)) {
      e.preventDefault();
      first.focus();
    }
  }

  _captureFocus() {
    if (typeof document === 'undefined') return;
    // Don't overwrite a still-set invoker: a reopen during the CLOSING phase
    // (before the deferred _teardown()/_restoreFocus() runs) would otherwise
    // capture whatever is focused mid-close and lose the original trigger.
    if (this._invoker == null) this._invoker = document.activeElement;
    const root = this.container;
    if (root) {
      if (!root.hasAttribute('tabindex')) root.setAttribute('tabindex', '-1');
      root.focus();
    }
  }
  _restoreFocus() {
    if (this._invoker && this._invoker.focus) this._invoker.focus();
    this._invoker = null;
  }

  _lockScroll() {
    if (typeof document === 'undefined') return;
    // Idempotent: a reopen during the CLOSING phase (before the deferred
    // _teardown()/_unlockScroll() runs) must not re-capture _prevOverflow, which
    // is already 'hidden' from the first lock — that would lose the page's
    // original overflow and leave it permanently unscrollable after close.
    if (this._scrollLocked) return;
    this._prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this._scrollLocked = true;
  }
  _unlockScroll() {
    if (typeof document === 'undefined') return;
    // Symmetric with _lockScroll's guard: if no lock was ever taken (e.g.
    // destroy() on a never-opened viewer), restoring would clobber whatever
    // inline body.overflow the host page legitimately set. Unlock is a no-op
    // unless a lock is actually held.
    if (!this._scrollLocked) return;
    document.body.style.overflow = this._prevOverflow || '';
    this._scrollLocked = false;
  }

  // ---- internals: transitions / teardown -----------------------------------

  _effectiveMs() {
    return this.reducedMotion ? 0 : this.transitionMs;
  }
  // Schedule a deferred settle (OPENING→OPEN, CLOSING→teardown). A generation
  // counter invalidates any pending settle when open/close interrupts it, so a
  // close() during an opening transition can't later resurrect the OPEN phase.
  _schedule(fn) {
    const ms = this._effectiveMs();
    const gen = (this._gen = (this._gen || 0) + 1);
    const run = () => {
      if (gen === this._gen) fn();
    };
    if (ms <= 0) Promise.resolve().then(run); // microtask: phase is observable first
    else this._timer = setTimeout(run, ms);
  }
  _clearTimer() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = 0;
    }
    this._gen = (this._gen || 0) + 1; // invalidate any in-flight settle
  }

  _teardown() {
    for (const i of [...this.slots.keys()]) this._destroySlot(i);
    if (typeof document !== 'undefined') document.removeEventListener('keydown', this._onKeyDown, true);
    this._unlockScroll();
    this._restoreFocus();
    this.active = null;
    this.currentIndex = -1;
    this.lifecycle = Lifecycle.CLOSED;
    if (this.fullscreen && this._fullscreenAvailable() && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    this.fullscreen = false;
    this.emitter.emit('phase', { phase: Lifecycle.CLOSED });
    this._notify();
  }

  // ---- internals: ARIA / prefs / notify ------------------------------------

  _aria(item) {
    const n = this.items.length;
    return {
      role: 'dialog',
      modal: true,
      label: (item && (item.title || item.caption)) || 'Media viewer',
      itemLabel: item ? item.title || item.caption || '' : '',
      counter: n ? `${this.currentIndex + 1} of ${n}` : '',
      position: this.currentIndex + 1,
      setSize: n,
    };
  }

  _loadPrefs() {
    if (!this.prefs.enabled || !this.prefs.storage) return {};
    try {
      return JSON.parse(this.prefs.storage.getItem(this.prefs.key) || '{}') || {};
    } catch {
      return {};
    }
  }
  _applyPrefs(r) {
    if (!this.prefs.enabled) return;
    const p = this._savedPrefs || {};
    // Prefs come from localStorage (untrusted): JSON yields Infinity for 1e999 and
    // arbitrary types like "loud". Validate each here so a corrupt entry can't reach
    // a setter (and then get re-persisted) — type-check, don't merely null-check.
    try {
      if (Number.isFinite(p.volume) && r.setVolume) r.setVolume(p.volume);
      if (typeof p.muted === 'boolean' && (p.muted ? r.mute : r.unmute)) (p.muted ? r.mute : r.unmute).call(r);
      if (Number.isFinite(p.speed) && r.setSpeed) r.setSpeed(p.speed);
      if (Number.isInteger(p.captions) && r.setCaptions) r.setCaptions(p.captions);
      if (Number.isFinite(p.pitch) && r.setPitch) r.setPitch(p.pitch);
    } catch {}
  }
  _maybeSavePrefs() {
    if (!this.prefs.enabled || !this.prefs.storage) return;
    const r = this.getRenderer();
    if (!r) return;
    const st = r.getState ? r.getState() : {};
    const pb = st.playback || {};
    const next = {
      ...this._savedPrefs,
      ...(pb.volume != null ? { volume: pb.volume } : {}),
      ...(pb.muted != null ? { muted: pb.muted } : {}),
      ...(pb.speed != null ? { speed: pb.speed } : {}),
      ...(st.currentCaptions != null ? { captions: st.currentCaptions } : {}),
      ...(st.pitch != null ? { pitch: st.pitch } : {}),
    };
    this._savedPrefs = next;
    try {
      this.prefs.storage.setItem(this.prefs.key, JSON.stringify(next));
    } catch {}
  }

  _notify() {
    this.emitter.emit('change', this.getState());
    if (this.onChange) this.onChange();
  }
}

return { MediaViewer };
})();

// ---- public API ------------------------------------------------------------
function defaultRegistry() {
  return createRendererRegistry()
    .register(MediaType.IMAGE, createImageRenderer)
    .register(MediaType.VIDEO, createVideoRenderer)
    .register(MediaType.AUDIO, createAudioRenderer);
}

function createViewer(options = {}) {
  return new MediaViewer({ ...options, registry: options.registry || defaultRegistry() });
}

export {
  createViewer,
  defaultRegistry,
  MediaViewer,
  createRendererRegistry,
  defineRenderer,
  RendererEvent,
  Intent,
  createImageRenderer,
  createVideoRenderer,
  createAudioRenderer,
  createTransform,
  createGestureRecognizer,
  classifyDrag,
  parseVTT,
  parseTimestamp,
  createCueTrack,
  createQueue,
  extractPeaks,
  extractMinMax,
  mixToMono,
  peaksFromBuffer,
  decodePeaks,
  semitonesToRatio,
  hann,
  wsolaStretch,
  resampleLinear,
  pitchShift,
  createStretchEngine,
  createPitchSpeed,
  createCasting,
  isCastableSource,
  lerp,
  frameThrottle,
  MediaType,
  Lifecycle,
  LoadState,
  PlayState,
  CastState,
  RepeatMode,
  GestureKind,
  Emitter,
  clamp,
  FitMode,
  Axis,
};
