// drag-n-drop-engine/drag-n-drop-engine.demo.js
// Reference CONSUMER for the headless file-intake engine (../drag-n-drop-engine.js).
// The engine ships no DOM and no CSS — EVERYTHING visible here is the consumer's:
// the drop zone, the drag-over highlight, the browse button, the thumbnail grid,
// the per-file remove + clear-all, the rejected list with reasons, the stats line.
// The engine is only ever told to attach listeners and is read for state; it is
// never asked to render or position anything (the Gate-3 proof).
//
// And — the scope line made concrete — this demo does NOT upload. It funnels files
// in, validates, previews, and shows them "ready". The "Upload" button only logs
// what the app *would* do; transport is the consumer's job, not the engine's.
//
// Loaded as a native ES module (no build step); the dev server serves the repo
// root so the bare relative import resolves.

import { createDropZone, RejectReason } from './drag-n-drop-engine.js';

const $ = (id) => document.getElementById(id);

// ---- presentation helpers (entirely the consumer's choice) ----------------

function formatBytes(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return String(n);
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v < 10 ? v.toFixed(1) : Math.round(v)} ${units[i]}`;
}

// A human label for each reject code (the engine already emits a `message`; this
// just shows the consumer can also branch on the stable `reason` code).
const REASON_LABEL = {
  [RejectReason.TYPE]: 'wrong type',
  [RejectReason.TOO_LARGE]: 'too large',
  [RejectReason.TOO_SMALL]: 'too small',
  [RejectReason.MAX_FILES]: 'too many files',
  [RejectReason.MAX_PER_DROP]: 'too many at once',
  [RejectReason.MAX_TOTAL_SIZE]: 'over total size',
  [RejectReason.DUPLICATE]: 'duplicate',
  [RejectReason.CUSTOM]: 'rejected',
};

// A small glyph for non-image files (by extension), so the grid still reads well.
function fileGlyph(name, type) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf' || ext === 'pdf') return '📕';
  if (['zip', 'gz', 'tar', 'rar', '7z'].includes(ext)) return '🗜';
  if (['txt', 'md', 'csv', 'json', 'log'].includes(ext)) return '📄';
  return '📎';
}

// ---- accept presets (drives setOptions to show runtime re-validation) ------

const ACCEPT_PRESETS = {
  images: 'image/*',
  'images-pdf': ['image/*', '.pdf'],
  any: null,
};

// ---- the engine -----------------------------------------------------------

const zone = createDropZone({
  accept: ACCEPT_PRESETS.images,
  maxSize: 5 * 1024 * 1024, // 5 MB
  maxFiles: 12,
  dedupe: true,             // name+size
  directory: true,          // dropped folders are traversed
  preview: 'object-url',    // cheap image previews; engine revokes the URLs on remove/clear
  paste: true,              // Cmd/Ctrl+V an image
  retainRejected: true,     // keep rejects so we can show "why"
  onChange: render,
});

// Element by REFERENCE: the consumer makes the element and hands the object over.
// The engine wires drag/drop (+ paste) listeners to it and renders nothing into it.
zone.attach($('dropzone'));

// Expose for manual poking in the console (debugging only).
window.zone = zone;

// ---- rendering: reconcile DOM from the emitted state ----------------------

const cards = new Map(); // file id -> card element (so thumbnails aren't rebuilt on every drag tick)

function makeCard(item) {
  const el = document.createElement('figure');
  el.className = 'card';
  el.dataset.id = item.id;

  const thumb = document.createElement('div');
  thumb.className = 'thumb';
  if (item.preview && item.type.startsWith('image/')) {
    const img = document.createElement('img');
    img.alt = item.name;
    img.src = item.preview; // an object URL the engine owns and will revoke on remove
    thumb.appendChild(img);
  } else {
    thumb.textContent = fileGlyph(item.name, item.type);
    thumb.classList.add('glyph');
  }

  const meta = document.createElement('figcaption');
  meta.className = 'meta';
  meta.innerHTML = `<span class="name"></span><span class="sub"></span>`;
  meta.querySelector('.name').textContent = item.name;
  meta.querySelector('.sub').textContent = `${formatBytes(item.size)} · ${item.type || 'unknown'}`;

  const rm = document.createElement('button');
  rm.className = 'remove';
  rm.type = 'button';
  rm.setAttribute('aria-label', `Remove ${item.name}`);
  rm.textContent = '✕';
  rm.addEventListener('click', () => zone.remove(item.id)); // engine revokes this card's object URL

  el.append(thumb, meta, rm);
  return el;
}

function render(state) {
  // 1. drop-zone drag-state — purely from emitted signals.
  const dz = $('dropzone');
  dz.classList.toggle('over', state.drag.isDraggingOver);
  dz.dataset.willaccept = state.drag.willAccept === false ? 'no'
    : state.drag.willAccept === true ? 'yes' : 'unknown';

  let hint;
  if (state.drag.isDraggingOver) {
    const n = state.drag.fileCount;
    if (state.drag.willAccept === false) hint = 'These won’t be accepted';
    else hint = `Drop to add${n ? ` ${n} file${n > 1 ? 's' : ''}` : ''}…`;
  } else {
    hint = 'Drag files or a folder here, paste an image, or';
  }
  $('hint').textContent = hint;

  // 2. stats line.
  $('stats').textContent =
    `${state.counts.accepted} ready · ${state.counts.rejected} rejected · ${formatBytes(state.totalSize)} total`;
  $('upload').disabled = state.counts.accepted === 0;

  // 3. accepted grid — keyed reconcile so previews don't reload on each tick.
  const present = new Set();
  const grid = $('accepted');
  for (const item of state.accepted) {
    present.add(item.id);
    let el = cards.get(item.id);
    if (!el) { el = makeCard(item); cards.set(item.id, el); grid.appendChild(el); }
    else {
      // a late data-URL/object-URL preview may have arrived after the card existed
      const thumb = el.querySelector('.thumb');
      if (item.preview && item.type.startsWith('image/') && !thumb.querySelector('img')) {
        thumb.classList.remove('glyph');
        thumb.textContent = '';
        const img = document.createElement('img');
        img.alt = item.name; img.src = item.preview;
        thumb.appendChild(img);
      }
    }
  }
  for (const [id, el] of cards) {
    if (!present.has(id)) { el.remove(); cards.delete(id); }
  }
  $('accepted-empty').style.display = state.accepted.length ? 'none' : '';

  // 4. rejected list — text only, cheap to rebuild.
  const rej = $('rejected');
  rej.replaceChildren();
  for (const item of state.rejected) {
    const li = document.createElement('li');
    li.innerHTML = `<span class="rname"></span><span class="why"></span><button class="dismiss" type="button" aria-label="Dismiss">✕</button>`;
    li.querySelector('.rname').textContent = item.name;
    li.querySelector('.why').textContent = `${REASON_LABEL[item.reason] || 'rejected'} — ${item.message}`;
    li.querySelector('.dismiss').addEventListener('click', () => zone.remove(item.id));
    rej.appendChild(li);
  }
  $('rejected-section').style.display = state.rejected.length ? '' : 'none';
}

// ---- controls (all consumer-side; the engine just exposes methods) --------

$('browse').addEventListener('click', () => zone.openPicker());
$('browse-folder').addEventListener('click', () => zone.openPicker({ directory: true }));
$('clear').addEventListener('click', () => zone.clear());

$('accept-sel').addEventListener('change', (e) => {
  zone.setOptions({ accept: ACCEPT_PRESETS[e.target.value] }); // re-validates the whole collection
});
$('maxfiles').addEventListener('change', (e) => {
  zone.setOptions({ maxFiles: Math.max(1, parseInt(e.target.value, 10) || 1) });
});
$('dedupe').addEventListener('change', (e) => {
  zone.setOptions({ dedupe: e.target.checked });
});

// The scope line, made literal: intake is done; uploading is the APP's job.
$('upload').addEventListener('click', () => {
  const ready = zone.getState().accepted;
  // A real app would now POST each `item.file` to its own endpoint / S3 / etc.
  // The engine has no idea this button exists.
  console.log(`[demo] ${ready.length} file(s) ready to upload (the app would send these):`,
    ready.map((x) => ({ name: x.name, size: x.size, type: x.type })));
  $('upload-note').textContent =
    `Logged ${ready.length} file(s) to the console — a real app would now upload them. The engine did not.`;
});

render(zone.getState());
