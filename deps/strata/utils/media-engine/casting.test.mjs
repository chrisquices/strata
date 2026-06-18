// casting.test.mjs
// Pure unit tests for the one determinable part of casting: whether a source URL
// could reach a casting device at all. The session lifecycle needs a real
// RemotePlayback object and is covered by the browser protocol.
//   node media-engine/casting.test.mjs

import { test, testAsync, assert, isMain, report } from './harness.mjs';
import { isCastableSource, createCasting, CastState } from './media-engine.js';

// A minimal RemotePlayback mock. The lifecycle was previously left to the browser,
// but the audit found real teardown/availability bugs, so these pin the fixes.
function mockRemote({ deferWatch = false } = {}) {
  const handlers = {};
  let availabilityCb = null;
  let resolveWatch = null;
  const remote = {
    state: 'disconnected',
    cancelledId: null,
    addEventListener(t, fn) {
      (handlers[t] ||= []).push(fn);
    },
    removeEventListener(t, fn) {
      const a = handlers[t];
      if (a) {
        const i = a.indexOf(fn);
        if (i >= 0) a.splice(i, 1);
      }
    },
    watchAvailability(cb) {
      availabilityCb = cb;
      return new Promise((res) => {
        resolveWatch = () => res(42);
        if (!deferWatch) res(42);
      });
    },
    cancelWatchAvailability(id) {
      remote.cancelledId = id;
      return Promise.resolve();
    },
    prompt() {
      return Promise.resolve();
    },
    listenerCount: (t) => (handlers[t] || []).length,
  };
  return {
    remote,
    fireAvailability: (v) => availabilityCb && availabilityCb(v),
    resolveWatch: () => resolveWatch && resolveWatch(),
  };
}
const tick = () => Promise.resolve();

test('isCastableSource: device-reachable schemes are castable', () => {
  assert.equal(isCastableSource('https://cdn.example.com/movie.mp4'), true);
  assert.equal(isCastableSource('http://example.com/a.webm'), true);
  assert.equal(isCastableSource('//example.com/a.mp4'), true, 'protocol-relative');
  assert.equal(isCastableSource('/media/a.mp4'), true, 'path-relative resolves to http(s)');
});

test('isCastableSource: page-local schemes cannot be fetched by a device', () => {
  assert.equal(isCastableSource('blob:https://app/abc-123'), false);
  assert.equal(isCastableSource('data:video/mp4;base64,AAAA'), false);
  assert.equal(isCastableSource('file:///Users/me/clip.mp4'), false);
  assert.equal(isCastableSource('mediastream:abc'), false);
});

test('isCastableSource: empty/missing → not castable', () => {
  assert.equal(isCastableSource(''), false);
  assert.equal(isCastableSource(undefined), false);
  assert.equal(isCastableSource(null), false);
});

// ============================================================================
// Session lifecycle (audit regressions, against the mock remote)
// ============================================================================

test('createCasting: destroy() makes the instance inert — start() cannot resurrect it', () => {
  const { remote } = mockRemote();
  const c = createCasting({ element: { remote }, getSource: () => 'https://x/a.mp3' });
  c.start();
  assert.equal(remote.listenerCount('connect'), 1, 'start() attached listeners');
  c.destroy();
  assert.equal(remote.listenerCount('connect'), 0, 'destroy() detached them');
  c.start();
  assert.equal(remote.listenerCount('connect'), 0, 'a destroyed instance does not re-attach (no resurrection)');
});

test('createCasting: a castable source with no reachable device → UNAVAILABLE, not UNSUPPORTED', () => {
  const { remote, fireAvailability } = mockRemote();
  const c = createCasting({ element: { remote }, getSource: () => 'https://x/a.mp3' });
  c.start();
  fireAvailability(false); // a device went away; remote.state stays 'disconnected'
  assert.equal(c.getState(), CastState.UNAVAILABLE, 'matches syncFromRemote + the enum doc');
});

await testAsync('createCasting: a watchAvailability resolving after destroy() cancels the orphaned watch', async () => {
  const { remote, resolveWatch } = mockRemote({ deferWatch: true });
  const c = createCasting({ element: { remote }, getSource: () => 'https://x/a.mp3' });
  c.start();
  c.destroy(); // watchId still pending (promise unresolved)
  resolveWatch(); // resolves AFTER destroy
  await tick();
  await tick();
  assert.equal(remote.cancelledId, 42, 'orphaned watch was cancelled, not leaked');
});

if (isMain(import.meta.url)) report({ exit: true });
