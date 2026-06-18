// harness.mjs
// The tiny zero-dependency test harness — the same shape as virtualization-engine's inline
// harness, factored out so a suite can span many files and still report once.
// A standalone copy lives in each leaf module so the module owns its own tests
// and imports nothing from media-engine.
//
// Each *.test.mjs imports { test, assert } from here, runs its tests at import
// time, and at the bottom calls `report({ exit: true })` IF it is the entry
// module (so a single file run directly prints and exits).

import assert from 'node:assert/strict';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export { assert };

let passed = 0;
let failed = 0;

/** Run a synchronous test. Failures are caught and counted, never thrown. */
export function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`ok   - ${name}`);
  } catch (e) {
    failed++;
    const msg = String(e && e.message ? e.message : e).split('\n').join('\n       ');
    console.error(`FAIL - ${name}\n       ${msg}`);
  }
}

/** Run an async test (awaits the fn). Same accounting as test(). */
export async function testAsync(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   - ${name}`);
  } catch (e) {
    failed++;
    const msg = String(e && e.message ? e.message : e).split('\n').join('\n       ');
    console.error(`FAIL - ${name}\n       ${msg}`);
  }
}

/** True when `metaUrl` is the module Node was invoked with directly. */
export function isMain(metaUrl) {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(metaUrl);
}

/** Print the running totals; optionally exit with a status code. */
export function report({ exit = false } = {}) {
  console.log(`\n${passed} passed, ${failed} failed (${passed + failed} tests)`);
  if (exit) process.exit(failed ? 1 : 0);
  return { passed, failed };
}
