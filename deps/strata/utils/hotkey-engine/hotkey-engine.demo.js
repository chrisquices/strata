// hotkey-engine/hotkey-engine.demo.js
// Reference CONSUMER for the headless hotkey engine (../hotkey-engine.js).
//
// The engine ships NO UI and NO CSS. EVERYTHING visible here is the consumer's: the command
// palette, the modal, the cheatsheet, the "g…" pending indicator, the flash toast, the nav
// cursor. The engine attaches ONE keydown listener, matches keystrokes against the bindings
// we register (respecting active scopes + the typing-guard), and fires our handlers. We push
// a scope when an overlay opens, render the cheatsheet from getBindings(), and render the
// pending sequence from the emitted state. Swap this page for React/Vue and the engine is
// unchanged.
//
// Loaded as a native ES module (no build step); the dev server serves the repo root so the
// bare relative import resolves.

import { createHotkeys } from './hotkey-engine.js';

const $ = (id) => document.getElementById(id);
let isMac = false; // set from the engine's detected platform

// ---- key label prettifier (consumer presentation only) --------------------
const SYM = {
  meta: '⌘', cmd: '⌘', ctrl: '⌃', control: '⌃', alt: '⌥', opt: '⌥', option: '⌥', shift: '⇧',
  enter: '↵', return: '↵', escape: 'Esc', esc: 'Esc', tab: '⇥', backspace: '⌫', delete: '⌦', space: 'Space',
  arrowup: '↑', arrowdown: '↓', arrowleft: '←', arrowright: '→',
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
function prettyStep(step) {
  const toks = step.split('+').filter(Boolean);
  const hasMod = toks.length > 1;
  const parts = toks.map((tok) => {
    const t = tok.toLowerCase();
    if (t === 'mod') return isMac ? '⌘' : 'Ctrl';
    if (SYM[t]) return SYM[t];
    if (tok.length === 1 && /[a-z]/i.test(tok)) return hasMod ? tok.toUpperCase() : tok;
    return tok.length === 1 ? tok : cap(tok);
  });
  return parts.join(hasMod ? (isMac ? '' : '+') : '');
}
const pretty = (keyString) => keyString.split(/\s+/).map(prettyStep).join(' ');

// ---- consumer feedback widgets --------------------------------------------
let flashTimer = 0;
function flash(msg, color) {
  const el = $('flash');
  el.textContent = msg;
  el.style.background = color || 'var(--ok)';
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 1100);
}
const logEl = $('log');
const lines = [];
function logLine(s) {
  lines.unshift(s);
  if (lines.length > 8) lines.pop();
  logEl.textContent = lines.join('\n');
}

// ============================================================================
// The engine. autoAttach (default) wires one keydown listener to `document`.
// ============================================================================

const hk = createHotkeys({
  onChange: renderState, // re-render the live strip + cheatsheet on every change
});
hk.on('sequence', renderPending);
hk.on('fire', (ctx) => logLine(`▷ fired  ${pretty(ctx.keys[0])}  →  ${ctx.binding.description || ctx.keys[0]}  [scope: ${ctx.scope}]`));

// ---- overlays + scope management ------------------------------------------
// Opening an overlay activates its scope (its bindings become live and shadow global);
// closing deactivates it. activate/deactivate is order-safe vs. push/pop.
function openOverlay(el, scope) {
  el.classList.add('open');
  if (scope) hk.activateScope(scope);
}
function closeOverlay(el, scope) {
  el.classList.remove('open');
  if (scope) hk.deactivateScope(scope);
}
const palette = $('palette');
const modal = $('modal');
const help = $('help');
const isOpen = (el) => el.classList.contains('open');

function togglePalette() {
  if (isOpen(palette)) { closeOverlay(palette, 'palette'); }
  else { openOverlay(palette, 'palette'); setTimeout(() => $('palette-input').focus(), 0); }
}
function toggleHelp() {
  if (isOpen(help)) closeOverlay(help, 'help');
  else openOverlay(help, 'help');
}

// ---- nav cursor (the j/k + typing-guard demo) -----------------------------
const navItems = [...$('navlist').children];
let cur = 0;
function renderNav() {
  navItems.forEach((li, i) => li.classList.toggle('cur', i === cur));
  $('cur-idx').textContent = cur < 0 ? '—' : cur + 1;
}
renderNav();

// ============================================================================
// Register bindings. Chords, a symbol chord (?), sequences, and scoped bindings.
// ============================================================================

let paletteHandle = bindPalette();
function bindPalette() {
  return hk.bind('mod+k', () => togglePalette(), { description: 'Command palette' });
}

hk.bind('mod+s', () => flash('Saved ✓'), { description: 'Save' }); // preventDefault (default) stops the browser dialog
hk.bind('?', () => toggleHelp(), { description: 'Keyboard help' });

hk.bind('g g', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); flash('↑ Top'); }, { description: 'Go to top' });
hk.bind('g i', () => {
  const note = $('inbox-state');
  note.textContent = 'focused';
  $('inbox').scrollIntoView({ block: 'center', behavior: 'smooth' });
  flash('Inbox', 'var(--accent)');
  setTimeout(() => { note.textContent = 'idle'; }, 1400);
}, { description: 'Go to inbox' });

hk.bind('j', () => { cur = Math.min(navItems.length - 1, cur + 1); renderNav(); }, { description: 'Next item' });
hk.bind('k', () => { cur = Math.max(0, cur - 1); renderNav(); }, { description: 'Previous item' });
hk.bind('escape', () => { cur = -1; renderNav(); flash('Selection cleared', 'var(--muted)'); }, { description: 'Clear selection' });

// palette scope
hk.bind('escape', () => closeOverlay(palette, 'palette'), { scope: 'palette', description: 'Close palette' });

// modal scope — Esc shadows the global Esc; ⌘↵ exists ONLY here
hk.bind('escape', () => closeOverlay(modal, 'modal'), { scope: 'modal', description: 'Close dialog' });
hk.bind('mod+enter', () => { closeOverlay(modal, 'modal'); flash('Settings saved ✓'); }, { scope: 'modal', description: 'Confirm' });

// help scope
hk.bind('escape', () => closeOverlay(help, 'help'), { scope: 'help', description: 'Close help' });

// ============================================================================
// Buttons (consumer chrome → engine commands)
// ============================================================================

$('btn-open-modal').addEventListener('click', () => { openOverlay(modal, 'modal'); setTimeout(() => modal.querySelector('input').focus(), 0); });

let enabled = true;
$('btn-toggle').addEventListener('click', () => {
  enabled = !enabled;
  if (enabled) hk.enable(); else hk.disable();
  $('btn-toggle').textContent = enabled ? 'Disable engine' : 'Enable engine';
  $('btn-toggle').classList.toggle('on', !enabled);
  flash(enabled ? 'Engine enabled' : 'Engine disabled', enabled ? 'var(--ok)' : 'var(--warn)');
});

$('btn-unbind').addEventListener('click', () => {
  if (paletteHandle) { paletteHandle(); paletteHandle = null; }
  $('btn-unbind').style.display = 'none';
  $('btn-rebind').style.display = '';
  flash('⌘K unbound', 'var(--warn)');
});
$('btn-rebind').addEventListener('click', () => {
  paletteHandle = bindPalette();
  $('btn-rebind').style.display = 'none';
  $('btn-unbind').style.display = '';
  flash('⌘K re-bound');
});

// Click an overlay backdrop to close it (keeps scope in sync).
for (const [el, scope] of [[palette, 'palette'], [modal, 'modal'], [help, 'help']]) {
  el.addEventListener('mousedown', (e) => { if (e.target === el) closeOverlay(el, scope); });
}

// ============================================================================
// Render from engine state
// ============================================================================

function renderPending(pending) {
  const el = $('pending');
  if (pending && pending.length) {
    el.textContent = pending.map(prettyStep).join(' ') + ' …';
    el.classList.remove('empty');
  } else {
    el.textContent = '·';
    el.classList.add('empty');
  }
}

function renderCheat(targetId) {
  const groups = new Map();
  for (const b of hk.getBindings()) {
    if (!groups.has(b.scope)) groups.set(b.scope, []);
    groups.get(b.scope).push(b);
  }
  const order = ['global', ...[...groups.keys()].filter((s) => s !== 'global')];
  const html = order.filter((s) => groups.has(s)).map((scope) => {
    const rows = groups.get(scope).map((b) =>
      `<tr><td class="muted">${b.description || ''}</td><td>${b.keys.map((k) => `<kbd>${pretty(k)}</kbd>`).join(' / ')}</td></tr>`,
    ).join('');
    const label = scope === 'global' ? 'Global' : `Scope: ${scope}`;
    return `<div class="grp"><h4>${label}</h4><table><tbody>${rows}</tbody></table></div>`;
  }).join('');
  $(targetId).innerHTML = html;
}

function renderState(st) {
  isMac = st.platform === 'mac';
  $('s-enabled').textContent = st.enabled ? 'enabled' : 'disabled';
  $('dot-enabled').className = 'dot ' + (st.enabled ? 'on' : 'off');
  $('s-platform').textContent = st.platform;
  $('s-mod').textContent = st.mod === 'meta' ? '⌘ (meta)' : '⌃ (ctrl)';
  $('s-scopes').textContent = st.scopes.join(' › ');
  $('s-count').textContent = st.bindingCount;
  renderPending(st.pending);
  renderCheat('cheat');
  renderCheat('help-cheat');
  // platform-aware key labels sprinkled through the copy
  setLabel('k-palette', 'mod+k'); setLabel('lbl-unbind', 'mod+k');
  setLabel('k-save', 'mod+s'); setLabel('k-save2', 'mod+s'); setLabel('k-save3', 'mod+s'); setLabel('k-save4', 'mod+s');
  setLabel('k-confirm', 'mod+enter'); setLabel('k-confirm2', 'mod+enter');
}
function setLabel(id, keyString) { const el = $(id); if (el) el.textContent = pretty(keyString); }

// Initial paint (the engine also emits a deferred initial state).
renderState(hk.getState());

console.log('[hotkey demo] ready. The engine renders nothing — this page paints the palette, modal, cheatsheet and the pending indicator from getBindings() + the emitted state.');
