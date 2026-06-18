// media-engine/run-all.mjs
// Runs the whole pure-logic suite as one command: `node media-engine/run-all.mjs`
// (or `npm test`). Each imported file runs its tests at import time against the
// shared harness; we print the aggregate once at the end.
//
// Importing every engine module transitively here ALSO doubles as the
// headless-core check: if any of them touched the DOM at module scope, one of
// these imports would throw in Node. (The embedded pitch worklet is created only
// inside createPitchSpeed(), so it is browser-covered.)

import './subtitles.test.mjs';
import './queue.test.mjs';
import './waveform.test.mjs';
import './pitch-speed.test.mjs';
import './casting.test.mjs';
import './renderer-interface.test.mjs';
// shell.test.mjs installs a minimal `document` stub on globalThis and uses
// top-level await, so it runs LAST (static imports with top-level await are
// awaited before this module's body) — its stub can't affect the pure tests above.
import './shell.test.mjs';

import { report } from './harness.mjs';

report({ exit: true });
