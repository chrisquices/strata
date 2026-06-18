// renderer-interface.test.mjs
// Pure unit tests for the registry/router and the defineRenderer defaults —
// including the SEAM check: a brand-new renderer type drops in via register()
// and resolves with no special-casing (the registry is type-blind).
//   node media-engine/renderer-interface.test.mjs

import { test, assert, isMain, report } from './harness.mjs';
import { createRendererRegistry, defineRenderer, RendererEvent, createAudioRenderer, createVideoRenderer } from './media-engine.js';

// ============================================================================
// Registry
// ============================================================================

test('registry: register / has / resolve / create', () => {
  const reg = createRendererRegistry();
  const factory = (item, deps) => ({ type: item.type, item, deps });
  reg.register('image', factory);
  assert.equal(reg.has('image'), true);
  assert.equal(reg.resolve('image'), factory);
  const r = reg.create({ type: 'image', src: 'x' }, { foo: 1 });
  assert.equal(r.type, 'image');
  assert.deepEqual(r.deps, { foo: 1 });
});

test('registry: create throws for an unregistered type', () => {
  const reg = createRendererRegistry();
  assert.throws(() => reg.create({ type: 'hologram' }, {}), /no renderer registered/);
});

test('registry: register rejects a non-function factory', () => {
  const reg = createRendererRegistry();
  assert.throws(() => reg.register('image', {}), /must be a function/);
});

test('registry: types() lists registered types', () => {
  const reg = createRendererRegistry();
  reg.register('image', () => ({})).register('video', () => ({}));
  assert.deepEqual(reg.types().sort(), ['image', 'video']);
});

// ============================================================================
// SEAM: a new renderer type without touching any "shell" logic
// ============================================================================

test('seam: a novel renderer type registers and resolves like any other', () => {
  const reg = createRendererRegistry();
  // Pretend this is a future "model3d" renderer authored by a consumer.
  const model3d = defineRenderer({
    type: 'model3d',
    mount() {},
    getCapabilities() {
      return { type: 'model3d', zoom: { supported: true, min: 1, max: 8, current: 1, fitAvailable: false, ready: true }, playback: null, tracks: null, castable: false, fullscreen: true, download: true };
    },
    isZoomed() {
      return true;
    },
  });
  reg.register('model3d', () => model3d);

  // The "shell" only ever does this — type-blind:
  const r = reg.create({ type: 'model3d' }, {});
  assert.equal(r.getCapabilities().type, 'model3d');
  assert.equal(r.isZoomed(), true);
  // And the uniform contract is fully present (defaults filled the gaps):
  assert.equal(typeof r.handleKey, 'function');
  assert.equal(r.handleKey({ key: 'x' }), false, 'declines unknown key → shell fallback');
  assert.equal(typeof r.activate, 'function');
  assert.doesNotThrow(() => r.deactivate());
});

// ============================================================================
// defineRenderer defaults
// ============================================================================

test('defineRenderer: fills optional methods, preserves provided ones', () => {
  let mounted = false;
  const r = defineRenderer({ type: 'image', mount: () => (mounted = true) });
  r.mount();
  assert.equal(mounted, true, 'provided method kept');
  assert.equal(r.handleKey({}), false, 'default handleKey declines');
  assert.equal(r.isZoomed(), false, 'default isZoomed false');
  assert.deepEqual(r.getState(), {}, 'default getState empty');
  const caps = r.getCapabilities();
  assert.equal(caps.type, 'image');
  assert.equal(caps.zoom, null);
  assert.equal(typeof r.on, 'function');
});

test('defineRenderer: requires a type', () => {
  assert.throws(() => defineRenderer({}), /needs a `type`/);
});

test('RendererEvent/Intent are frozen vocabularies', () => {
  assert.equal(RendererEvent.PLAYBACK, 'playback');
  assert.equal(Object.isFrozen(RendererEvent), true);
});

// ============================================================================
// canSetVolume: audio mirrors video on the iOS restriction (audit regression)
// ============================================================================

test('canSetVolume: audio and video agree on the iOS volume restriction', () => {
  // iOS makes HTMLMediaElement.volume read-only for <audio> AND <video>. The video
  // renderer reports canSetVolume:!isIOS; the audio renderer used to hard-code
  // canSetVolume:true, so on iOS a consumer would draw a dead audio volume slider.
  // Both now derive from the same isIOS condition, so they must always agree —
  // regardless of which platform the test runs on (isIOS is evaluated at import).
  const a = createAudioRenderer({ type: 'audio', src: 'a.mp3' }, {});
  const v = createVideoRenderer({ type: 'video', src: 'v.mp4' }, {});
  const av = a.getCapabilities().playback.canSetVolume;
  const vv = v.getCapabilities().playback.canSetVolume;
  assert.equal(typeof av, 'boolean', 'audio canSetVolume is a boolean (not hard-coded literal true on iOS)');
  assert.equal(av, vv, 'audio canSetVolume mirrors video — no iOS asymmetry');
});

if (isMain(import.meta.url)) report({ exit: true });
