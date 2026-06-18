// drag-n-drop-engine.test.mjs
// Pure unit tests for the file-intake engine. No DOM, no browser, no framework:
//   node drag-n-drop-engine/drag-n-drop-engine.test.mjs
//
// Importing drag-n-drop-engine.js here doubles as the headless-core design check:
// if the module touched document/window/DataTransfer/FileReader at top level, this
// import would throw in Node. It does not — that access lives inside methods behind
// capability guards. So everything below — validation rules, the intake state
// model, dedup, partitioning, runtime re-validation, state emission — is reachable
// and deterministic with no `document`.
//
// The DOM-event wiring (drag-over flicker, preventDefault, paste, picker, folder
// traversal, object-URL revocation) is the browser gate (Gate 2); here we drive the
// same intake funnel through add() with minimal File-like stand-ins ({name,size,type}),
// which is exactly the shape the engine reads.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test, testAsync as harnessTestAsync, assert, isMain, report } from './harness.mjs';
import {
  createDropZone, IntakeStatus, RejectReason, PreviewMode, Source,
} from './drag-n-drop-engine.js';

// The harness runs each testAsync to its first await then yields; report() is
// synchronous, so without tracking the in-flight promises a direct `node` run
// would process.exit before any async test settled. Collect them and await all
// before reporting, so async regressions are actually counted.
const pendingAsync = [];
const testAsync = (name, fn) => { pendingAsync.push(harnessTestAsync(name, fn)); };

// A minimal File-like: the engine only reads name/size/type for validation.
const f = (name, size, type = '') => ({ name, size, type });

// Find an emitted item by name across a state snapshot.
const byName = (state, name) => state.files.find((x) => x.name === name);

// ============================================================================
// Headless boundary + construction
// ============================================================================

test('imports cleanly in Node and constructs headless (no DOM)', () => {
  assert.equal(typeof document, 'undefined', 'no document in this runtime');
  const z = createDropZone();
  assert.equal(typeof z.add, 'function');
  const out = z.add(f('a.png', 10, 'image/png'));
  assert.equal(out.length, 1);
  assert.equal(out[0].status, IntakeStatus.ACCEPTED);
  const s = z.getState();
  assert.ok(Array.isArray(s.files) && Array.isArray(s.accepted) && Array.isArray(s.rejected));
  z.destroy();
});

test('engine imports only from ../shared/ (nothing else)', () => {
  const src = readFileSync(fileURLToPath(new URL('./drag-n-drop-engine.js', import.meta.url)), 'utf8');
  const specifiers = [...src.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  assert.ok(specifiers.length > 0, 'has at least one import');
  for (const s of specifiers) {
    assert.ok(s.startsWith('../shared/'), `import "${s}" must come from ../shared/`);
  }
});

test('every DOM reference is capability-guarded (no bare DOM access at module scope)', () => {
  const src = readFileSync(fileURLToPath(new URL('./drag-n-drop-engine.js', import.meta.url)), 'utf8');
  // The clean Node import above already proves dynamically that nothing DOM runs at
  // load. This pins the discipline statically: the small pure helpers that live at
  // module scope may *name* DOM globals, but only behind a `typeof X !== 'undefined'`
  // guard — never a bare access that would throw if evaluated. Check it line by line.
  const moduleScope = src.slice(0, src.indexOf('export function createDropZone'))
    .replace(/\/\*[\s\S]*?\*\//g, '') // strip block + JSDoc comments
    .replace(/\/\/[^\n]*/g, '');      // strip line comments
  const domGlobal = /\b(document|window|FileReader|FileList|DataTransfer)\b|createObjectURL/;
  for (const line of moduleScope.split('\n')) {
    if (domGlobal.test(line)) {
      assert.ok(/typeof/.test(line), `module-scope DOM reference must be typeof-guarded: ${line.trim()}`);
    }
  }
});

test('getState() returns a valid empty state immediately after creation', () => {
  const z = createDropZone({ accept: 'image/*', maxFiles: 5 });
  const s = z.getState();
  assert.deepEqual(s.files, []);
  assert.deepEqual(s.accepted, []);
  assert.deepEqual(s.rejected, []);
  assert.deepEqual(s.counts, { total: 0, accepted: 0, rejected: 0 });
  assert.equal(s.totalSize, 0);
  assert.deepEqual(s.drag, { isDraggingOver: false, willAccept: null, fileCount: null });
  assert.equal(s.config.accept, 'image/*');
  assert.equal(s.config.maxFiles, 5);
  z.destroy();
});

// ============================================================================
// Type validation (accept)
// ============================================================================

test('exact MIME accept: matches the type, rejects others with TYPE', () => {
  const z = createDropZone({ accept: 'application/pdf' });
  z.add([f('doc.pdf', 10, 'application/pdf'), f('pic.png', 10, 'image/png')]);
  const s = z.getState();
  assert.equal(byName(s, 'doc.pdf').status, IntakeStatus.ACCEPTED);
  assert.equal(byName(s, 'pic.png').status, IntakeStatus.REJECTED);
  assert.equal(byName(s, 'pic.png').reason, RejectReason.TYPE);
  z.destroy();
});

test('wildcard accept (image/*) matches any image subtype', () => {
  const z = createDropZone({ accept: 'image/*' });
  z.add([f('a.png', 1, 'image/png'), f('b.jpg', 1, 'image/jpeg'), f('c.pdf', 1, 'application/pdf')]);
  const s = z.getState();
  assert.equal(byName(s, 'a.png').accepted, true);
  assert.equal(byName(s, 'b.jpg').accepted, true);
  assert.equal(byName(s, 'c.pdf').accepted, false);
  z.destroy();
});

test('extension accept (.png) matches by filename, even with empty MIME type', () => {
  const z = createDropZone({ accept: '.png' });
  z.add([f('a.PNG', 1, ''), f('b.jpg', 1, 'image/jpeg')]);
  const s = z.getState();
  assert.equal(byName(s, 'a.PNG').accepted, true, 'extension match is case-insensitive and ignores MIME');
  assert.equal(byName(s, 'b.jpg').accepted, false);
  z.destroy();
});

test('mixed accept list (MIME wildcard + extension)', () => {
  const z = createDropZone({ accept: ['image/*', '.pdf'] });
  z.add([f('a.png', 1, 'image/png'), f('b.pdf', 1, 'application/pdf'), f('c.txt', 1, 'text/plain')]);
  const s = z.getState();
  assert.equal(byName(s, 'a.png').accepted, true, 'by MIME wildcard');
  assert.equal(byName(s, 'b.pdf').accepted, true, 'by extension');
  assert.equal(byName(s, 'c.txt').accepted, false);
  z.destroy();
});

test('unknown MIME type is rejected by a MIME-only rule but accepted by an extension rule', () => {
  const mime = createDropZone({ accept: 'image/*' });
  mime.add(f('mystery.png', 1, '')); // OS reported no type
  assert.equal(mime.getState().files[0].accepted, false, 'no MIME ⇒ no wildcard match');
  mime.destroy();

  const ext = createDropZone({ accept: '.png' });
  ext.add(f('mystery.png', 1, ''));
  assert.equal(ext.getState().files[0].accepted, true, 'extension rescues the unknown type');
  ext.destroy();
});

test('no accept rule accepts every type', () => {
  const z = createDropZone();
  z.add([f('a.png', 1, 'image/png'), f('b.exe', 1, 'application/octet-stream'), f('c', 1, '')]);
  assert.equal(z.getState().counts.accepted, 3);
  z.destroy();
});

// ============================================================================
// Size validation
// ============================================================================

test('maxSize: over rejects TOO_LARGE; equal and under accept', () => {
  const z = createDropZone({ maxSize: 1000 });
  z.add([f('under.bin', 999), f('exact.bin', 1000), f('over.bin', 1001)]);
  const s = z.getState();
  assert.equal(byName(s, 'under.bin').accepted, true);
  assert.equal(byName(s, 'exact.bin').accepted, true, 'boundary is inclusive');
  assert.equal(byName(s, 'over.bin').reason, RejectReason.TOO_LARGE);
  z.destroy();
});

test('minSize: under rejects TOO_SMALL; equal accepts', () => {
  const z = createDropZone({ minSize: 100 });
  z.add([f('tiny.bin', 99), f('exact.bin', 100), f('big.bin', 500)]);
  const s = z.getState();
  assert.equal(byName(s, 'tiny.bin').reason, RejectReason.TOO_SMALL);
  assert.equal(byName(s, 'exact.bin').accepted, true);
  assert.equal(byName(s, 'big.bin').accepted, true);
  z.destroy();
});

test('zero-byte file is accepted when no size rules apply', () => {
  const z = createDropZone();
  z.add(f('empty.txt', 0, 'text/plain'));
  assert.equal(z.getState().files[0].accepted, true);
  z.destroy();
});

// ============================================================================
// Count / total-size caps
// ============================================================================

test('maxFiles caps the collection across a single batch', () => {
  const z = createDropZone({ maxFiles: 2 });
  const out = z.add([f('a', 1), f('b', 1), f('c', 1)]);
  assert.deepEqual(out.map((o) => o.status), [IntakeStatus.ACCEPTED, IntakeStatus.ACCEPTED, IntakeStatus.REJECTED]);
  assert.equal(out[2].reason, RejectReason.MAX_FILES);
  assert.equal(z.getState().counts.accepted, 2);
  z.destroy();
});

test('maxFiles is enforced across separate adds (the cap is the collection, not the batch)', () => {
  const z = createDropZone({ maxFiles: 3 });
  z.add([f('a', 1), f('b', 1)]);
  const out = z.add([f('c', 1), f('d', 1)]);
  assert.equal(out[0].accepted, true, 'fills the 3rd slot');
  assert.equal(out[1].reason, RejectReason.MAX_FILES, '4th exceeds the cap');
  assert.equal(z.getState().counts.accepted, 3);
  z.destroy();
});

test('maxPerDrop caps one batch but resets for the next', () => {
  const z = createDropZone({ maxPerDrop: 2 });
  const first = z.add([f('a', 1), f('b', 1), f('c', 1)]);
  assert.equal(first[2].reason, RejectReason.MAX_PER_DROP);
  assert.equal(z.getState().counts.accepted, 2);
  const second = z.add([f('d', 1), f('e', 1)]); // a fresh drop
  assert.equal(second[0].accepted, true);
  assert.equal(second[1].accepted, true);
  assert.equal(z.getState().counts.accepted, 4, 'per-drop cap does not bound the total');
  z.destroy();
});

test('maxTotalSize rejects the file that would push the sum over', () => {
  const z = createDropZone({ maxTotalSize: 1000 });
  const out = z.add([f('a', 600), f('b', 300), f('c', 200)]); // 600, 900, then 1100 > 1000
  assert.equal(out[0].accepted, true);
  assert.equal(out[1].accepted, true);
  assert.equal(out[2].reason, RejectReason.MAX_TOTAL_SIZE);
  assert.equal(z.getState().totalSize, 900);
  z.destroy();
});

test('a negative file size cannot poison the running total or weaken maxTotalSize', () => {
  const z = createDropZone({ maxTotalSize: 1000 });
  // A File-like with a negative size must not lower the running total: it is
  // clamped to 0, so a later oversized file is still rejected by the cap.
  const out = z.add([f('evil.bin', -1000000), f('big.bin', 999999)]);
  assert.equal(out[0].accepted, true, 'negative-size file is admitted but counts as 0 bytes');
  assert.equal(z.getState().files[0].size, 0, 'negative size is clamped to 0');
  assert.equal(out[1].reason, RejectReason.MAX_TOTAL_SIZE, 'later oversized file is still capped');
  assert.equal(z.getState().totalSize, 0, 'running total never goes negative');
  z.destroy();
});

// ============================================================================
// Custom validator
// ============================================================================

test('custom validator: true accepts, a string rejects CUSTOM with that message', () => {
  const z = createDropZone({
    validator: (file) => (file.name.includes('bad') ? 'name contains "bad"' : true),
  });
  z.add([f('ok.txt', 1), f('bad.txt', 1)]);
  const s = z.getState();
  assert.equal(byName(s, 'ok.txt').accepted, true);
  const bad = byName(s, 'bad.txt');
  assert.equal(bad.reason, RejectReason.CUSTOM);
  assert.equal(bad.message, 'name contains "bad"', 'the returned string becomes the message');
  z.destroy();
});

test('custom validator: a non-string falsey return rejects with a default message', () => {
  const z = createDropZone({ validator: () => false });
  z.add(f('x', 1));
  const item = z.getState().files[0];
  assert.equal(item.reason, RejectReason.CUSTOM);
  assert.ok(item.message && item.message.length > 0);
  z.destroy();
});

test('custom validator: a throw is treated as a rejection (never crashes intake)', () => {
  const z = createDropZone({ validator: () => { throw new Error('boom'); } });
  z.add(f('x', 1));
  const item = z.getState().files[0];
  assert.equal(item.reason, RejectReason.CUSTOM);
  assert.equal(item.message, 'boom');
  z.destroy();
});

// ============================================================================
// Intake partitioning + retainRejected
// ============================================================================

test('accepted/rejected partitioning, counts, totalSize and source tag', () => {
  const z = createDropZone({ accept: 'image/*' });
  z.add([f('a.png', 100, 'image/png'), f('b.txt', 50, 'text/plain'), f('c.jpg', 200, 'image/jpeg')]);
  const s = z.getState();
  assert.deepEqual(s.counts, { total: 3, accepted: 2, rejected: 1 });
  assert.equal(s.accepted.length, 2);
  assert.equal(s.rejected.length, 1);
  assert.equal(s.totalSize, 300, 'totalSize sums accepted only');
  assert.ok(s.files.every((x) => x.source === Source.ADD));
  z.destroy();
});

test('retainRejected:false drops rejects from state but add() still reports them', () => {
  const z = createDropZone({ accept: 'image/*', retainRejected: false });
  const out = z.add([f('a.png', 1, 'image/png'), f('b.txt', 1, 'text/plain')]);
  assert.equal(out.length, 2, 'the return value reports every file processed');
  assert.equal(out[1].status, IntakeStatus.REJECTED);
  const s = z.getState();
  assert.equal(s.counts.total, 1, 'only the accepted file is retained');
  assert.equal(s.rejected.length, 0);
  z.destroy();
});

test('retainRejected:true (default) keeps rejects with their reason in state', () => {
  const z = createDropZone({ accept: 'image/*' });
  z.add(f('b.txt', 1, 'text/plain'));
  const s = z.getState();
  assert.equal(s.rejected.length, 1);
  assert.equal(s.rejected[0].reason, RejectReason.TYPE);
  z.destroy();
});

test('intake preserves order across the emitted files list', () => {
  const z = createDropZone();
  z.add([f('1', 1), f('2', 1)]);
  z.add(f('3', 1));
  assert.deepEqual(z.getState().files.map((x) => x.name), ['1', '2', '3']);
  z.destroy();
});

// ============================================================================
// Dedup
// ============================================================================

test('dedupe (name+size): a repeat is rejected DUPLICATE; a different size is allowed', () => {
  const z = createDropZone({ dedupe: true });
  z.add([f('a.png', 100, 'image/png'), f('a.png', 100, 'image/png'), f('a.png', 200, 'image/png')]);
  const out = z.getState().files;
  assert.equal(out[0].accepted, true);
  assert.equal(out[1].reason, RejectReason.DUPLICATE, 'same name+size is a dup');
  assert.equal(out[2].accepted, true, 'same name, different size is not a dup');
  z.destroy();
});

test('dedupe with a custom key function', () => {
  const z = createDropZone({ dedupe: (file) => file.name.split('.')[0] }); // key by base name
  z.add([f('photo.png', 1, 'image/png'), f('photo.jpg', 2, 'image/jpeg')]);
  const out = z.getState().files;
  assert.equal(out[0].accepted, true);
  assert.equal(out[1].reason, RejectReason.DUPLICATE, 'same base name ⇒ dup under the keyFn');
  z.destroy();
});

test('dedupe disabled (default) allows identical files', () => {
  const z = createDropZone();
  z.add([f('a.png', 100, 'image/png'), f('a.png', 100, 'image/png')]);
  assert.equal(z.getState().counts.accepted, 2);
  z.destroy();
});

test('dedupe seen-set is recomputed from the live collection (re-add after remove works)', () => {
  const z = createDropZone({ dedupe: true });
  const [item] = z.add(f('a.png', 100, 'image/png'));
  z.remove(item.id);
  const out = z.add(f('a.png', 100, 'image/png'));
  assert.equal(out[0].accepted, true, 'no longer a duplicate once removed');
  z.destroy();
});

// ============================================================================
// Collection management
// ============================================================================

test('remove(id) removes the right item and updates counts', () => {
  const z = createDropZone();
  const items = z.add([f('a', 1), f('b', 1), f('c', 1)]);
  assert.equal(z.remove(items[1].id), true);
  const s = z.getState();
  assert.deepEqual(s.files.map((x) => x.name), ['a', 'c']);
  assert.equal(s.counts.total, 2);
  z.destroy();
});

test('remove(unknown) returns false and changes nothing', () => {
  const z = createDropZone();
  z.add(f('a', 1));
  assert.equal(z.remove('nope'), false);
  assert.equal(z.getState().counts.total, 1);
  z.destroy();
});

test('clear() empties the collection', () => {
  const z = createDropZone();
  z.add([f('a', 1), f('b', 1)]);
  z.clear();
  assert.deepEqual(z.getState().counts, { total: 0, accepted: 0, rejected: 0 });
  z.destroy();
});

test('remove can delete a retained rejected item too', () => {
  const z = createDropZone({ accept: 'image/*' });
  const out = z.add(f('b.txt', 1, 'text/plain'));
  assert.equal(z.getState().rejected.length, 1);
  z.remove(out[0].id);
  assert.equal(z.getState().counts.total, 0);
  z.destroy();
});

// ============================================================================
// Runtime config change (setOptions re-validates the collection)
// ============================================================================

test('setOptions tightening accept flips an existing file to rejected', () => {
  const z = createDropZone(); // accept anything
  z.add([f('a.png', 1, 'image/png'), f('b.txt', 1, 'text/plain')]);
  assert.equal(z.getState().counts.accepted, 2);
  z.setOptions({ accept: 'image/*' });
  const s = z.getState();
  assert.equal(byName(s, 'a.png').accepted, true);
  assert.equal(byName(s, 'b.txt').accepted, false);
  assert.equal(byName(s, 'b.txt').reason, RejectReason.TYPE);
  assert.equal(s.counts.accepted, 1);
  z.destroy();
});

test('setOptions loosening rules flips a rejected file back to accepted', () => {
  const z = createDropZone({ maxSize: 100 });
  z.add(f('big.bin', 500));
  assert.equal(z.getState().counts.accepted, 0);
  z.setOptions({ maxSize: 1000 });
  const item = z.getState().files[0];
  assert.equal(item.accepted, true);
  assert.equal(item.reason, null, 'reason is cleared on re-acceptance');
  z.destroy();
});

test('setOptions applies the new rules to subsequent intake too', () => {
  const z = createDropZone();
  z.setOptions({ accept: 'image/*' });
  z.add(f('b.txt', 1, 'text/plain'));
  assert.equal(z.getState().files[0].reason, RejectReason.TYPE);
  z.destroy();
});

test('multiple:false defaults the file cap to 1', () => {
  const z = createDropZone({ multiple: false });
  assert.equal(z.getState().config.maxFiles, 1);
  const out = z.add([f('a', 1), f('b', 1)]);
  assert.equal(out[0].accepted, true);
  assert.equal(out[1].reason, RejectReason.MAX_FILES);
  z.destroy();
});

// ============================================================================
// State emission + subscription
// ============================================================================

test('subscribe fires on change with the new state; unsubscribe stops it', () => {
  const z = createDropZone();
  let n = 0;
  let last = null;
  const off = z.subscribe((s) => { n++; last = s; });
  z.add(f('a.png', 10, 'image/png'));
  assert.equal(n, 1);
  assert.equal(last.counts.accepted, 1);
  assert.equal(last.files[0].file.name, 'a.png', 'the File rides through to the consumer');
  off();
  z.add(f('b.png', 10, 'image/png'));
  assert.equal(n, 1, 'no further calls after unsubscribe');
  z.destroy();
});

test('onChange option is invoked on every change', () => {
  let n = 0;
  const z = createDropZone({ onChange: () => { n++; } });
  z.add(f('a', 1));
  z.add(f('b', 1));
  assert.equal(n, 2);
  z.destroy();
});

testAsync('deferred initial emit reaches a synchronous subscriber (matches the other engines)', async () => {
  const z = createDropZone();
  let got = null;
  z.subscribe((s) => { got = s; });
  assert.equal(got, null, 'not emitted synchronously at creation');
  await Promise.resolve(); // flush the microtask queued at construction
  assert.ok(got, 'the deferred initial state arrived');
  assert.equal(got.counts.total, 0);
  z.destroy();
});

test('a batch that changes nothing (all non-retained rejects) emits nothing', () => {
  const z = createDropZone({ accept: 'image/*', retainRejected: false });
  let n = 0;
  z.subscribe(() => { n++; });
  const out = z.add(f('b.txt', 1, 'text/plain'));
  assert.equal(out[0].status, IntakeStatus.REJECTED);
  assert.equal(n, 0, 'no state change ⇒ no emit (the verdict is in the return value)');
  z.destroy();
});

test('empty / null intake is a no-op', () => {
  const z = createDropZone();
  assert.deepEqual(z.add([]), []);
  assert.deepEqual(z.add(null), []);
  assert.equal(z.getState().counts.total, 0);
  z.destroy();
});

test('add accepts a single file-like, an array, and is validated identically', () => {
  const z = createDropZone({ accept: 'image/*' });
  z.add(f('one.png', 1, 'image/png'));          // single
  z.add([f('two.png', 1, 'image/png')]);        // array
  assert.equal(z.getState().counts.accepted, 2);
  z.destroy();
});

// ============================================================================
// Lifecycle
// ============================================================================

test('destroy() makes the instance inert without throwing', () => {
  const z = createDropZone();
  z.add(f('a', 1));
  z.destroy();
  // post-destroy commands are safe no-ops
  assert.deepEqual(z.add(f('b', 1)), []);
  assert.equal(z.remove('x'), false);
  const off = z.subscribe(() => { throw new Error('should not fire'); });
  assert.equal(typeof off, 'function');
  z.add(f('c', 1)); // no emit ⇒ subscriber never throws
  z.destroy();      // idempotent
});

test('detach() with no attachments is safe (no DOM required)', () => {
  const z = createDropZone();
  assert.doesNotThrow(() => z.detach());
  assert.doesNotThrow(() => z.attach(null)); // invalid target ignored
  z.destroy();
});

// ---- regressions from the audit/refactor pass ------------------------------

test('regression: NaN file size is coerced to 0 and cannot poison totalSize/caps', () => {
  const z = createDropZone({ maxTotalSize: 100 });
  z.add(f('weird.bin', NaN, 'application/octet-stream'));
  z.add(f('ok.bin', 60, 'application/octet-stream'));
  const s = z.getState();
  assert.ok(Number.isFinite(s.totalSize), `totalSize stays finite (${s.totalSize})`);
  assert.equal(byName(s, 'weird.bin').size, 0, 'NaN size normalized to 0');
  // The cap still works after the weird file: a 60-byte file fits, the next 60 does not.
  const out = z.add(f('big.bin', 60, 'application/octet-stream'));
  assert.equal(out[0].reason, RejectReason.MAX_TOTAL_SIZE, 'maxTotalSize survives NaN input');
});

test('regression: add() accepts a plain (non-iterable) array-like of files', () => {
  const z = createDropZone();
  const arrayLike = { length: 2, 0: f('a.png', 1, 'image/png'), 1: f('b.png', 2, 'image/png') };
  const out = z.add(arrayLike); // used to throw "not iterable"
  assert.equal(out.length, 2);
  assert.equal(z.getState().counts.accepted, 2);
});

test('regression: setOptions({ onChange }) replaces the change callback', () => {
  let calls = 0;
  const z = createDropZone({ onChange: () => {} });
  z.setOptions({ onChange: () => { calls++; } });
  z.add(f('a.png', 1, 'image/png'));
  assert.ok(calls >= 1, `replacement callback fired (${calls})`);
});

test('regression: setOptions({ onChange: null }) clears the change callback (symmetry with construction)', () => {
  let calls = 0;
  const z = createDropZone({ onChange: () => { calls++; } });
  z.add(f('a.png', 1, 'image/png'));
  assert.ok(calls >= 1, `callback fired before clearing (${calls})`);
  // Same logical input a non-function would yield at construction (no callback):
  // an explicit onChange:null must DETACH the callback, not be silently ignored.
  z.setOptions({ onChange: null });
  const before = calls;
  z.add(f('b.png', 1, 'image/png'));
  assert.equal(calls, before, 'no further callbacks fire after onChange was cleared');
  z.destroy();
});

test('regression: retained rejected records are capped by maxRejected (oldest pruned)', () => {
  const z = createDropZone({ accept: 'image/*', maxRejected: 3 });
  for (let i = 0; i < 6; i++) z.add(f(`no-${i}.txt`, 1, 'text/plain'));
  const s = z.getState();
  assert.equal(s.counts.rejected, 3, 'only the cap is retained');
  assert.deepEqual(
    s.rejected.map((x) => x.name),
    ['no-3.txt', 'no-4.txt', 'no-5.txt'],
    'the oldest rejects were pruned'
  );
});

test('regression: openPicker() on a destroyed instance is an inert no-op', () => {
  const z = createDropZone();
  z.destroy();
  assert.doesNotThrow(() => z.openPicker());
});

testAsync('regression: one drop bubbling through two attached zones is ingested once', async () => {
  const listeners = [];
  const makeZoneTarget = () => {
    const byType = new Map();
    return {
      addEventListener: (type, handler) => { byType.set(type, handler); listeners.push(byType); },
      removeEventListener: () => {},
      byType,
    };
  };
  const child = makeZoneTarget();
  const parent = makeZoneTarget();
  const z = createDropZone();
  z.attach(child);
  z.attach(parent);
  const dropEvent = {
    preventDefault() {},
    dataTransfer: { files: [f('once.png', 5, 'image/png')] },
  };
  // The same native event object reaches both zone handlers as it bubbles.
  await child.byType.get('drop')(dropEvent);
  await parent.byType.get('drop')(dropEvent);
  const s = z.getState();
  assert.equal(s.counts.total, 1, `ingested exactly once (got ${s.counts.total})`);
  z.destroy();
});

test('regression: paste fallback ingests clipboardData.files when items yields no files', () => {
  // A doc-like target (nodeType 9) so wireUpPaste registers the paste handler.
  let pasteHandler = null;
  const docTarget = {
    nodeType: 9,
    addEventListener: (type, handler) => { if (type === 'paste') pasteHandler = handler; },
    removeEventListener: () => {},
  };
  const z = createDropZone({ paste: true });
  z.attach(docTarget);
  assert.equal(typeof pasteHandler, 'function', 'paste handler was wired');

  // The broken path: clipboardData.items surfaces nothing (empty / no kind==='file'),
  // but clipboardData.files is populated — must fall back to .files without throwing.
  const pasteEvent = {
    clipboardData: {
      items: [],
      files: [f('pasted.png', 7, 'image/png')],
    },
  };
  assert.doesNotThrow(() => pasteHandler(pasteEvent), 'fallback loop must not ReferenceError');

  const s = z.getState();
  assert.equal(s.counts.total, 1, `pasted file was ingested (got ${s.counts.total})`);
  const item = byName(s, 'pasted.png');
  assert.ok(item, 'pasted.png entered the collection');
  assert.equal(item.source, Source.PASTE, 'tagged with the PASTE source');
  z.destroy();
});

testAsync('regression: a data-URL preview is never attached to a record flipped to REJECTED mid-read', async () => {
  // Install a FileReader whose async onload we fire manually, so we can flip the
  // record to rejected (via setOptions) BETWEEN starting the read and resolving it.
  let pending = null;
  class FakeFileReader {
    readAsDataURL() { pending = this; }
  }
  globalThis.FileReader = FakeFileReader;
  try {
    const z = createDropZone({ accept: 'image/*', preview: 'data-url' });
    z.add(f('a.png', 10, 'image/png')); // accepted ⇒ starts a (fake) data-URL read
    assert.ok(pending, 'the auto-preview kicked off a FileReader read');

    // Tighten accept so the in-flight record is flipped to REJECTED before resolve.
    z.setOptions({ accept: 'application/pdf' });
    const rejected = z.getState().files[0];
    assert.equal(rejected.status, IntakeStatus.REJECTED, 'the image is now rejected');

    // The read resolves AFTER the flip — it must NOT write a preview onto the reject.
    pending.result = 'data:image/png;base64,AAAA';
    pending.onload();

    const after = z.getState().files[0];
    assert.equal(after.status, IntakeStatus.REJECTED);
    assert.equal(after.preview, null, 'no data-URL preview on a rejected record');
    assert.equal(after.previewMode, PreviewMode.NONE, 'previewMode stays NONE');
    z.destroy();
  } finally {
    delete globalThis.FileReader;
  }
});

testAsync('regression: setOptions() during an in-flight data-URL auto-preview does NOT launch a duplicate read', async () => {
  // add() of an accepted image kicks off ONE readAsDataURL; until its onload fires,
  // preview/previewMode are still null/NONE. A setOptions() that keeps the record
  // accepted must NOT see that "no preview yet" state and start a SECOND concurrent
  // read of the whole file (double buffering + a redundant 'change' emit).
  let reads = 0;
  let pending = null;
  class FakeFileReader {
    readAsDataURL() { reads++; pending = this; }
  }
  globalThis.FileReader = FakeFileReader;
  try {
    let changes = 0;
    const z = createDropZone({ accept: 'image/*', preview: 'data-url', maxSize: 1000 });
    z.subscribe(() => { changes++; });
    z.add(f('a.png', 10, 'image/png')); // accepted ⇒ starts ONE (fake) data-URL read
    assert.equal(reads, 1, 'add kicked off exactly one read');

    // An unrelated patch that keeps the image accepted (raise maxSize). The record's
    // preview is still null and previewMode still NONE because onload has not fired.
    z.setOptions({ maxSize: 2000 });
    assert.equal(reads, 1, 'setOptions during the in-flight read must NOT start a second read');

    // Resolve the single read: it writes the preview and emits once.
    const changesBefore = changes;
    pending.result = 'data:image/png;base64,AAAA';
    pending.onload();
    assert.equal(reads, 1, 'still only one read total');
    assert.equal(changes - changesBefore, 1, 'exactly one change emit for the completed read');

    const after = z.getState().files[0];
    assert.equal(after.preview, 'data:image/png;base64,AAAA', 'preview applied once');
    assert.equal(after.previewMode, PreviewMode.DATA_URL);
    z.destroy();
  } finally {
    delete globalThis.FileReader;
  }
});

testAsync('regression: readPreview() data-URL onload never writes a preview onto a record flipped to REJECTED mid-read', async () => {
  // Same race as the auto-preview path, but driven through the explicit
  // readPreview(id, 'data-url') call: start the read on an accepted image, flip it
  // to rejected via setOptions BEFORE the (fake) onload resolves, then resolve.
  let pending = null;
  class FakeFileReader {
    readAsDataURL() { pending = this; }
  }
  globalThis.FileReader = FakeFileReader;
  try {
    const z = createDropZone({ accept: 'image/*', retainRejected: true });
    z.add(f('a.png', 10, 'image/png')); // accepted (no auto-preview: preview defaults to none)
    const accepted = z.getState().files[0];
    assert.equal(accepted.status, IntakeStatus.ACCEPTED, 'the image is accepted');
    assert.equal(accepted.preview, null, 'no preview yet');

    // Consumer explicitly requests a data-URL preview; this kicks off a fake read.
    const previewPromise = z.readPreview(accepted.id, 'data-url');
    assert.ok(pending, 'readPreview kicked off a FileReader read');

    // Tighten accept so the in-flight record is flipped to REJECTED before resolve.
    z.setOptions({ accept: 'application/pdf' });
    const rejected = z.getState().files[0];
    assert.equal(rejected.status, IntakeStatus.REJECTED, 'the image is now rejected');

    // The read resolves AFTER the flip — it must NOT write a preview onto the reject.
    pending.result = 'data:image/png;base64,AAAA';
    pending.onload();
    await previewPromise;

    const after = z.getState().files[0];
    assert.equal(after.status, IntakeStatus.REJECTED);
    assert.equal(after.preview, null, 'no data-URL preview on a rejected record');
    assert.equal(after.previewMode, PreviewMode.NONE, 'previewMode stays NONE');
    z.destroy();
  } finally {
    delete globalThis.FileReader;
  }
});

test('regression: flip-to-rejected clears an object-URL preview and revokes it (retainRejected:true)', () => {
  // Install URL.createObjectURL/revokeObjectURL so the object-URL preview path runs
  // in Node, and count create vs revoke to prove the blob: URL is not leaked.
  const realURL = globalThis.URL;
  let created = 0;
  let revoked = 0;
  globalThis.URL = {
    createObjectURL: () => { created++; return `blob:fake-${created}`; },
    revokeObjectURL: () => { revoked++; },
  };
  try {
    const z = createDropZone({ accept: 'image/*', preview: 'object-url', retainRejected: true });
    z.add(f('a.png', 10, 'image/png'));
    const accepted = z.getState().files[0];
    assert.equal(created, 1, 'an object URL was created for the accepted image');
    assert.ok(typeof accepted.preview === 'string' && accepted.preview.startsWith('blob:'), 'preview is a blob URL');

    // Flip it to rejected; retainRejected:true keeps the record but its preview must go.
    z.setOptions({ accept: 'application/pdf' });
    const rejected = z.getState().files[0];
    assert.equal(rejected.status, IntakeStatus.REJECTED, 'the image is now rejected');
    assert.equal(rejected.preview, null, 'the blob URL was cleared from the rejected record');
    assert.equal(rejected.previewMode, PreviewMode.NONE, 'previewMode reset to NONE');
    assert.equal(revoked, 1, 'the object URL was revoked, not leaked');
    z.destroy();
  } finally {
    globalThis.URL = realURL;
  }
});

testAsync('regression: readPreview(id, object-url) refuses to attach a preview to a REJECTED record', async () => {
  // The OBJECT_URL branch of readPreview used to mint a blob: URL onto a retained
  // rejected record while the DATA_URL branch of the same call refused — two modes,
  // contradictory verdicts. Both must now refuse: a rejected record never carries a
  // preview. Install a counting URL stub so we can prove no blob URL was created.
  const realURL = globalThis.URL;
  let created = 0;
  globalThis.URL = {
    createObjectURL: () => { created++; return `blob:fake-${created}`; },
    revokeObjectURL: () => {},
  };
  try {
    const z = createDropZone({ accept: 'image/*', retainRejected: true });
    z.add(f('note.txt', 10, 'text/plain')); // non-image ⇒ rejected with TYPE, retained
    const rejected = z.getState().files[0];
    assert.equal(rejected.status, IntakeStatus.REJECTED, 'the .txt is rejected');
    assert.equal(rejected.reason, RejectReason.TYPE);

    // object-url mode must not mint a blob URL onto the rejected record.
    const objResult = await z.readPreview(rejected.id, 'object-url');
    assert.equal(created, 0, 'no object URL was created for the rejected record');
    assert.equal(objResult, null, 'object-url readPreview resolves null for a reject');
    const afterObj = z.getState().files[0];
    assert.equal(afterObj.preview, null, 'no object-URL preview on a rejected record');
    assert.equal(afterObj.previewMode, PreviewMode.NONE, 'previewMode stays NONE');

    // data-url mode on the identical record already refuses — confirm they now agree.
    const dataResult = await z.readPreview(rejected.id, 'data-url');
    assert.equal(dataResult, null, 'data-url readPreview resolves null for a reject');
    const afterData = z.getState().files[0];
    assert.equal(afterData.preview, null, 'no data-URL preview on a rejected record');
    assert.equal(afterData.previewMode, PreviewMode.NONE, 'previewMode stays NONE');
    z.destroy();
  } finally {
    globalThis.URL = realURL;
  }
});

testAsync('regression: detaching the paste-owning zone re-homes the listener onto a surviving zone', async () => {
  // Two document-like targets standing in for two different documents (main + iframe).
  const makeDoc = () => {
    const handlers = new Map();
    const doc = {
      nodeType: 9,
      addEventListener: (type, handler) => { handlers.set(type, handler); },
      removeEventListener: (type, handler) => { if (handlers.get(type) === handler) handlers.delete(type); },
      has: (type) => handlers.has(type),
      fire: (type, e) => { const h = handlers.get(type); return h && h(e); },
    };
    return doc;
  };
  const docA = makeDoc();
  const docB = makeDoc();
  const z = createDropZone({ paste: true });
  z.attach(docA); // first attach owns the paste listener (on docA)
  z.attach(docB);
  assert.ok(docA.has('paste'), 'paste listener initially on the first-attached document');
  assert.ok(!docB.has('paste'), 'only one paste listener exists');

  // Detach the paste-owner while docB remains attached.
  z.detach(docA);
  assert.ok(!docA.has('paste'), 'the detached document no longer holds the paste listener (no ghost)');
  assert.ok(docB.has('paste'), 'the paste listener was re-homed onto the surviving document');

  // A paste on the survivor now ingests; the detached doc is inert.
  await docB.fire('paste', { clipboardData: { items: [], files: [f('pasted.png', 7, 'image/png')] } });
  const s = z.getState();
  assert.equal(s.counts.total, 1, 'paste on the surviving zone still ingests');
  assert.equal(byName(s, 'pasted.png').source, Source.PASTE);
  z.destroy();
});

test('regression: multiple:false with a non-finite maxFiles still caps at 1 (not left uncapped)', () => {
  assert.equal(createDropZone({ multiple: false, maxFiles: NaN }).getState().config.maxFiles, 1);
  assert.equal(createDropZone({ multiple: false, maxFiles: Infinity }).getState().config.maxFiles, 1);
  // an explicit positive limit is still honored
  assert.equal(createDropZone({ multiple: false, maxFiles: 3 }).getState().config.maxFiles, 3);
});

test('regression: an unknown preview mode throws TypeError instead of silently becoming none', () => {
  assert.throws(() => createDropZone({ preview: 'jpeg' }), TypeError);
  // documented forms still resolve
  assert.equal(createDropZone({ preview: true }).getState().config.preview, PreviewMode.OBJECT_URL);
  assert.equal(createDropZone({ preview: false }).getState().config.preview, PreviewMode.NONE);
  assert.equal(createDropZone().getState().config.preview, PreviewMode.NONE);
});

test('regression: accept:"*" reports willAccept=true on the hidden-types dragover path (not null)', () => {
  // A tiny mock attach target that records the native listeners so the test can
  // drive a dragover where the browser exposes only the 'Files' marker (no
  // per-item kind:'file' entries) — the very common hidden-payload situation.
  const listeners = {};
  const target = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  };
  const evt = {
    preventDefault() {},
    dataTransfer: { types: ['Files'], items: [], dropEffect: '' },
  };

  // accept-anything zone: both the peekable and hidden-types paths must agree on true.
  const star = createDropZone({ accept: '*' });
  star.attach(target);
  listeners.dragover(evt);
  assert.equal(star.getState().drag.willAccept, true, 'accept:"*" accepts everything on the hidden-types path');
  star.destroy();

  // '*/*' is the same accept-anything matcher.
  const starSlash = createDropZone({ accept: '*/*' });
  starSlash.attach(target);
  listeners.dragover(evt);
  assert.equal(starSlash.getState().drag.willAccept, true, 'accept:"*/*" accepts everything on the hidden-types path');
  starSlash.destroy();

  // A concrete matcher remains undeterminable (null) when the payload is hidden.
  const concrete = createDropZone({ accept: 'image/*' });
  concrete.attach(target);
  listeners.dragover(evt);
  assert.equal(concrete.getState().drag.willAccept, null, 'a real matcher is still "maybe" with hidden types');
  concrete.destroy();
});

test('regression: readFile() throws TypeError on an unknown format instead of silently reading as text', () => {
  const z = createDropZone();
  const out = z.add(f('a.txt', 5, 'text/plain'));
  const id = out[0].id;
  assert.throws(() => z.readFile(id, 'binary'), TypeError, 'unsupported format throws');
  assert.throws(() => z.readFile(id, 'utf16'), TypeError, 'unsupported format throws');
  assert.throws(() => z.readFile(id, 'dataurl'), TypeError, 'wrong-casing dataURL throws (only exact dataURL matches)');
  // Documented formats do not throw (they return a promise; FileReader is absent in Node → null).
  assert.doesNotThrow(() => z.readFile(id, 'text'));
  assert.doesNotThrow(() => z.readFile(id, 'arrayBuffer'));
  assert.doesNotThrow(() => z.readFile(id, 'dataURL'));
  assert.doesNotThrow(() => z.readFile(id)); // default 'text'
  z.destroy();
});

// ============================================================================
// Folder traversal budget (entries API, driven through a mock drop event)
// ============================================================================

// Build a mock directory-entry tree the engine's webkitGetAsEntry walk understands.
// `readEntriesCalls` counts every readEntries() invocation across the whole tree so
// a test can assert the traversal budget actually bounds the directory walk — not
// just the number of File objects materialized.
function makeEntryTree() {
  const stats = { readEntriesCalls: 0, filesMaterialized: 0 };

  function dirEntry(name, childrenFactory) {
    return {
      isFile: false,
      isDirectory: true,
      name,
      createReader() {
        // Mirror the real reader: hand back the children once, then [] (signals end).
        let handed = false;
        return {
          readEntries(onOk) {
            stats.readEntriesCalls++;
            if (handed) { onOk([]); return; }
            handed = true;
            onOk(childrenFactory());
          },
        };
      },
    };
  }

  function fileEntry(name) {
    return {
      isFile: true,
      isDirectory: false,
      name,
      file(onOk) { stats.filesMaterialized++; onOk(f(name, 1, 'application/octet-stream')); },
    };
  }

  return { stats, dirEntry, fileEntry };
}

// A synthetic drop event with a DataTransfer carrying webkitGetAsEntry items.
function makeDropEvent(rootEntries) {
  const items = rootEntries.map((entry) => ({
    kind: 'file',
    type: '',
    webkitGetAsEntry: () => entry,
    getAsFile: () => null,
  }));
  return {
    preventDefault() {},
    dataTransfer: { files: [], items, types: ['Files'] },
  };
}

// The native drop listener the engine wires does NOT return handleDrop's promise
// (it is a plain event handler), and the folder walk resolves over many microtasks
// as each entry/file callback settles. So firing the drop and then draining a
// generous number of microtask/timer ticks lets the async traversal run to
// completion (or to its budget) before the test inspects the result.
async function drain(ticks = 200) {
  for (let i = 0; i < ticks; i++) await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function attachWithDrop(zone) {
  const listeners = {};
  const target = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    removeEventListener: (type) => { delete listeners[type]; },
  };
  zone.attach(target);
  return async (evt) => { listeners.drop(evt); await drain(); };
}

testAsync('regression: traversal budget bounds directory recursion on a sparse/empty deep tree (not just materialized files)', async () => {
  // A chain of nested EMPTY subdirectories: dir0 -> dir1 -> ... each holding only
  // the next directory and ZERO files. Before the fix the budget only watched
  // out.length, which never grows here, so the engine recursed and issued a
  // readEntries call for every one of the (potentially millions of) directories.
  const { stats, dirEntry } = makeEntryTree();
  const DEPTH = 5000;
  function chain(level) {
    return dirEntry(`dir${level}`, () => (level < DEPTH ? [chain(level + 1)] : []));
  }
  const root = chain(0);

  const budget = 100;
  const z = createDropZone({ directory: true, maxTraversal: budget });
  const fireDrop = attachWithDrop(z);
  await fireDrop(makeDropEvent([root]));

  // No files exist, so the walk must stop on the directory-entry count, not run to
  // DEPTH. readEntries fires twice per directory (children, then the end-marker []),
  // so a budget of N caps it near 2*N — and critically NOWHERE NEAR 2*DEPTH.
  assert.equal(stats.filesMaterialized, 0, 'sparse tree materializes no files');
  assert.ok(
    stats.readEntriesCalls <= 2 * budget + 2,
    `directory walk is bounded by the budget (saw ${stats.readEntriesCalls} readEntries calls, expected <= ${2 * budget + 2})`,
  );
  assert.ok(
    stats.readEntriesCalls < DEPTH,
    `walk stopped well before exhausting the ${DEPTH}-deep chain (saw ${stats.readEntriesCalls})`,
  );
  z.destroy();
});

testAsync('regression: traversal budget still materializes files up to the cap on a file-heavy tree', async () => {
  // A single directory holding many files. The file-output cap must still fire so
  // the entry-count guard does not change the documented File-object behavior.
  const { stats, dirEntry, fileEntry } = makeEntryTree();
  const FILE_COUNT = 500;
  const root = dirEntry('root', () => {
    const kids = [];
    for (let i = 0; i < FILE_COUNT; i++) kids.push(fileEntry(`f${i}.bin`));
    return kids;
  });

  const budget = 50;
  const z = createDropZone({ directory: true, maxTraversal: budget, maxFiles: Infinity, maxPerDrop: Infinity });
  const fireDrop = attachWithDrop(z);
  await fireDrop(makeDropEvent([root]));

  // The walk charges every visited entry (the root dir + each file) against the
  // budget, so a budget of N materializes a bit under N files — never the full
  // FILE_COUNT, and never more than the budget. The point is the file cap still
  // fires (the entry-count guard did not loosen the documented File-object bound).
  const s = z.getState();
  assert.ok(
    s.counts.total > 0 && s.counts.total <= budget,
    `intake is capped at the traversal budget (<= ${budget}), got ${s.counts.total}`,
  );
  assert.ok(s.counts.total < FILE_COUNT, `intake is far below the ${FILE_COUNT} available files`);
  z.destroy();
});

if (isMain(import.meta.url)) {
  Promise.all(pendingAsync).then(() => report({ exit: true }));
}
