// toast-engine/toast-engine.demo.js
// Reference CONSUMER for the headless toast engine. The engine (../toast-engine.js)
// ships no DOM and no CSS; everything visual here — the markup, the styling, the
// enter/exit animations, the progress bar, hover-to-pause wiring, the "+N more"
// affordance — is the consumer's. It reads the engine's emitted state and paints.
//
// This file is the proof of the headless boundary (Gate 3): the engine is never
// asked to render or position anything. It is told, on every change, which
// toasts exist, their phase, position group, order index, remaining time and the
// suggested ARIA values — and this code does the rest. Swap this renderer for a
// totally different one and the engine does not change.
//
// Loaded as a native ES module (no build step); the dev server serves the repo
// root, so the bare relative import resolves.

import { createToaster, Position, Order, Overflow, ToastType } from './toast-engine.js';

const $ = (id) => document.getElementById(id);

// ---- per-type presentation (entirely the consumer's choice) ---------------

const ICONS = {
  [ToastType.INFO]: 'ℹ',
  [ToastType.SUCCESS]: '✓',
  [ToastType.WARNING]: '!',
  [ToastType.ERROR]: '✕',
  [ToastType.LOADING]: '◌',
};

// ---- toaster lifecycle ----------------------------------------------------

let toaster = null;
const regions = new Map(); // position -> region element
const els = new Map();     // toast id -> toast element

// Structural options live at creation time, so changing them rebuilds the toaster.
const config = {
  position: Position.TOP_RIGHT,
  order: Order.NEWEST_FIRST,
  overflow: Overflow.QUEUE,
  max: 3,
  pauseOnHover: true,
};

function build() {
  if (toaster) toaster.destroy();
  els.clear();
  for (const region of regions.values()) region.replaceChildren();

  toaster = createToaster({
    ...config,
    duration: 4000,
    enterDuration: 180,   // engine settles entering -> visible after this; CSS animates the move
    exitTimeout: 1200,    // generous fallback: the 280ms CSS exit finishes well before this
    onChange: render,
  });
  // Expose for manual poking in the console (debugging only).
  window.toaster = toaster;
  render(toaster.getState());
}

// ---- rendering: reconcile DOM from the emitted state ----------------------

function ensureRegion(pos) {
  let region = regions.get(pos);
  if (!region) {
    region = document.createElement('div');
    region.className = 'toast-region';
    region.dataset.position = pos;
    document.body.appendChild(region);
    regions.set(pos, region);
  }
  return region;
}

function contentToHTML(content) {
  // Content is opaque to the engine; the consumer decides how to draw it. This
  // demo handles a plain string or a { title, description } object.
  if (content && typeof content === 'object') {
    const title = content.title != null ? String(content.title) : '';
    const desc = content.description != null ? String(content.description) : '';
    return { title, desc };
  }
  return { title: String(content), desc: '' };
}

function createToastEl(t) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <span class="toast-icon" aria-hidden="true"></span>
    <div class="toast-body"><div class="toast-title"></div><div class="toast-desc"></div></div>
    <button class="toast-close" aria-label="Dismiss" type="button">✕</button>
    <div class="toast-bar"></div>`;
  el._title = el.querySelector('.toast-title');
  el._desc = el.querySelector('.toast-desc');
  el._icon = el.querySelector('.toast-icon');
  el._bar = el.querySelector('.toast-bar');
  el._barStarted = false;

  el.querySelector('.toast-close').addEventListener('click', () => toaster.dismiss(t.id));

  // Hover-to-pause: the consumer only SIGNALS the events; the engine owns the
  // decision and the remaining-time math.
  if (config.pauseOnHover) {
    el.addEventListener('mouseenter', () => toaster.pause(t.id));
    el.addEventListener('mouseleave', () => toaster.resume(t.id));
  }

  // The exit handshake: once the engine marks this toast `exiting`, our CSS plays
  // the exit transition; when it ends we tell the engine to remove it. If we
  // never did (reduced motion, no transition), the engine's fallback timeout
  // removes it anyway — so this is an optimization, never a requirement.
  el.addEventListener('transitionend', (e) => {
    if (el.dataset.phase === 'exiting' && (e.propertyName === 'transform' || e.propertyName === 'opacity')) {
      toaster.remove(t.id);
    }
  });

  // Force a reflow so the first paint is the `entering` (off-screen) state; the
  // subsequent `visible` render then animates in.
  void el.offsetHeight;
  return el;
}

function updateToastEl(el, t) {
  el.dataset.type = t.type;
  el.dataset.phase = t.phase;
  el.dataset.paused = t.paused ? 'true' : 'false';
  el.setAttribute('role', t.role);       // emitted by the engine, applied by us
  el.setAttribute('aria-live', t.ariaLive);
  el._icon.textContent = ICONS[t.type] || '•';

  const { title, desc } = contentToHTML(t.content);
  el._title.textContent = title + (t.count > 1 ? `  ×${t.count}` : '');
  el._desc.textContent = desc;
  el._desc.style.display = desc ? '' : 'none';

  // Progress bar: a CSS animation of length = duration, paused in sync with the
  // engine via [data-paused]. Started once, when the toast becomes visible.
  if (t.phase === 'visible' && !t.sticky && !el._barStarted) {
    el._bar.style.animationDuration = `${t.duration}ms`;
    el._bar.dataset.run = 'true';
    el._barStarted = true;
  }
  if (t.sticky) el._bar.dataset.run = 'false';
}

function updatePill(region, queued) {
  if (queued > 0) {
    if (!region._pill) {
      region._pill = document.createElement('div');
      region._pill.className = 'toast-more';
    }
    region._pill.textContent = `+${queued} more`;
    region.appendChild(region._pill); // last in DOM = back of the stack
  } else if (region._pill) {
    region._pill.remove();
  }
}

function render(state) {
  document.body.dataset.reduceMotion = state.reduceMotion ? 'true' : 'false';
  $('rm-status').textContent = state.reduceMotion ? 'on (animations skipped)' : 'off';

  const present = new Set();
  const activePositions = new Set();

  for (const group of state.groups) {
    activePositions.add(group.position);
    const region = ensureRegion(group.position);
    const ordered = [];
    for (const t of group.toasts) {
      present.add(t.id);
      let el = els.get(t.id);
      if (!el) { el = createToastEl(t); els.set(t.id, el); }
      updateToastEl(el, t);
      ordered.push(el);
    }
    // Re-append in the engine's display order (index 0 = front).
    for (const el of ordered) region.appendChild(el);
    updatePill(region, group.queued);
  }

  // Drop elements whose toast left the state entirely (removed via signal or the
  // engine's fallback timeout — e.g. under reduced motion).
  for (const [id, el] of els) {
    if (!present.has(id)) { el.remove(); els.delete(id); }
  }
  // Clear the "+N more" pill on any region that no longer has toasts.
  for (const [pos, region] of regions) {
    if (!activePositions.has(pos) && region._pill) region._pill.remove();
  }
}

// ---- controls -------------------------------------------------------------

const SAMPLES = {
  [ToastType.INFO]: ['Heads up', 'A new version is available.'],
  [ToastType.SUCCESS]: ['Saved', 'Your changes were written to disk.'],
  [ToastType.WARNING]: ['Low disk space', 'Less than 1 GB remaining.'],
  [ToastType.ERROR]: ['Upload failed', 'The server rejected the file. (sticky until dismissed)'],
};

function fire(type) {
  const [title, description] = SAMPLES[type];
  toaster.toast({ title, description }, { type, position: config.position });
}

let promiseN = 0;
function firePromise(outcome) {
  const n = ++promiseN;
  const p = new Promise((resolve, reject) => {
    setTimeout(() => {
      if (outcome === 'reject') reject(new Error(`Job #${n} timed out`));
      else resolve({ id: n, rows: 128 + n });
    }, 1600);
  });
  toaster.toast.promise(
    p,
    {
      loading: { title: `Uploading job #${n}…`, description: 'Please wait.' },
      success: (v) => ({ title: `Job #${n} done`, description: `Imported ${v.rows} rows.` }),
      error: (e) => ({ title: `Job #${n} failed`, description: e.message }),
    },
    { position: config.position },
  ).catch(() => { /* swallow here so the demo console stays clean; the engine already showed it */ });
}

function spam() {
  for (let i = 1; i <= 6; i++) {
    toaster.toast({ title: `Burst ${i}`, description: 'Stacked past the max-visible cap.' },
      { type: ToastType.INFO, position: config.position });
  }
}

function wireControls() {
  $('btn-info').addEventListener('click', () => fire(ToastType.INFO));
  $('btn-success').addEventListener('click', () => fire(ToastType.SUCCESS));
  $('btn-warning').addEventListener('click', () => fire(ToastType.WARNING));
  $('btn-error').addEventListener('click', () => fire(ToastType.ERROR));
  $('btn-promise-ok').addEventListener('click', () => firePromise('resolve'));
  $('btn-promise-fail').addEventListener('click', () => firePromise('reject'));
  $('btn-spam').addEventListener('click', spam);
  $('btn-dismiss-all').addEventListener('click', () => toaster.dismissAll());

  $('sel-position').addEventListener('change', (e) => { config.position = e.target.value; });
  $('sel-order').addEventListener('change', (e) => { config.order = e.target.value; build(); });
  $('sel-overflow').addEventListener('change', (e) => { config.overflow = e.target.value; build(); });
  $('inp-max').addEventListener('change', (e) => { config.max = Math.max(1, parseInt(e.target.value, 10) || 1); build(); });
  $('chk-hover').addEventListener('change', (e) => { config.pauseOnHover = e.target.checked; build(); });
}

wireControls();
build();
