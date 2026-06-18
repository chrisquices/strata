// color-engine/color-engine.demo.js
// Reference CONSUMER for the headless color engine. The engine
// (../color-engine.js) is pure functions over color values — it ships no DOM and
// no CSS. Every swatch, bar, number and pass/fail badge below is rendered HERE
// from the values those functions return. This file is the proof of the headless
// boundary (Gate 3): the engine is never asked to render anything.
//
// Intentionally unstyled — the goal is to eyeball that the math is correct
// (formats agree, contrast matches, gradients are perceptually even), not to look
// good.

import {
  parse, format, toHex, toOklch,
  contrast, meetsWCAG, adjustForContrast,
  shades, tints, harmony,
  gradient, complement,
  Space,
} from './color-engine.js';

const $ = (id) => document.getElementById(id);

// The single piece of state the demo holds: the current color, as the engine's
// canonical { r, g, b, a }. (The engine itself is stateless; this is the demo's.)
let current = parse('#3b82f6');
let bg = parse('#ffffff');
let gradEnd = complement('#3b82f6');

// ---- tiny render helpers (all consumer-side) ------------------------------

const cssOf = (c) => format(c, 'rgb'); // a CSS-valid string for a background

function swatch(c, big = false) {
  const s = document.createElement('span');
  s.className = 'sw' + (big ? ' bigsw' : '');
  s.style.background = cssOf(c);
  s.title = toHex(c);
  return s;
}

function swatchRow(el, colors) {
  el.replaceChildren(...colors.map((c) => swatch(c)));
}

function badge(ok) {
  const span = document.createElement('span');
  span.textContent = ok ? '✓ pass' : '✗ fail';
  span.className = 'pass';
  span.style.color = ok ? '#080' : '#b00';
  return span;
}

// ---- block A: current color & all formats ---------------------------------

function renderCurrent() {
  const inner = swatch(current, true);
  inner.style.border = '0';
  $('swatch').replaceChildren(inner);

  $('f-hex').textContent = toHex(current);
  $('f-rgb').textContent = format(current, 'rgb');
  $('f-hsl').textContent = format(current, 'hsl');
  $('f-hsv').textContent = format(current, 'hsv');
  $('f-oklch').textContent = format(current, 'oklch');
  $('f-oklab').textContent = format(current, 'oklab');

  // sync the native inputs (setting .value does not fire events → no loop)
  $('picker').value = toHex({ ...current, a: 1 });
  const ok = toOklch(current);
  $('ok-l').value = ok.l; $('ok-c').value = ok.c; $('ok-h').value = ok.h; $('ok-a').value = current.a;
}

// ---- block B: contrast ----------------------------------------------------

function renderContrast() {
  $('c-bg').value = toHex({ ...bg, a: 1 });
  const m = meetsWCAG(current, bg);
  $('c-ratio').textContent = `${contrast(current, bg).toFixed(2)} : 1`;
  $('c-aa').replaceChildren(badge(m.AA));
  $('c-aaa').replaceChildren(badge(m.AAA));
  $('c-aa-l').replaceChildren(badge(m.AALarge));
  $('c-aaa-l').replaceChildren(badge(m.AAALarge));

  const p1 = $('c-prev1');
  p1.style.background = cssOf(bg);
  p1.style.color = cssOf(current);
  p1.textContent = 'The quick brown fox (current on bg)';

  const p2 = $('c-prev2');
  p2.style.background = cssOf(current);
  p2.style.color = cssOf(bg);
  p2.textContent = 'The quick brown fox (bg on current)';
}

function autoFix(level) {
  const r = adjustForContrast(current, bg, { level });
  current = r.color;
  $('c-note').textContent = r.met
    ? `fixed: moved L by ${r.lightnessDelta.toFixed(3)}, ratio now ${r.ratio.toFixed(2)}`
    : `UNREACHABLE for ${level} on this background — best achievable ${r.ratio.toFixed(2)} (reported, not faked)`;
  renderAll();
}

// ---- block C: palette / harmony -------------------------------------------

function renderPalette() {
  // shades (darkest→lightest) · base · tints (…→lightest), one continuous ramp
  const ramp = [...shades(current, 5).reverse(), current, ...tints(current, 5)];
  swatchRow($('ramp'), ramp);
  swatchRow($('harmony'), harmony(current, $('harmony-type').value));
}

// ---- block D: gradient ----------------------------------------------------

function renderGradient() {
  $('g-b').value = toHex({ ...gradEnd, a: 1 });
  const steps = +$('g-steps').value;
  $('g-steps-n').textContent = steps;
  const hue = $('g-hue').value;

  const spaces = [
    [Space.OKLCH, 'OKLCH (perceptual, default)'],
    [Space.OKLAB, 'OKLab (perceptual)'],
    [Space.HSL, 'HSL'],
    [Space.LRGB, 'linear sRGB'],
    [Space.SRGB, 'sRGB (naive — watch the muddy middle)'],
  ];

  const wrap = $('grad-bars');
  wrap.replaceChildren(...spaces.map(([space, label]) => {
    const row = document.createElement('div');
    row.className = 'row';
    const cap = document.createElement('div');
    cap.textContent = label;
    const bar = document.createElement('div');
    bar.className = 'bar';
    for (const c of gradient(current, gradEnd, { steps, space, hue })) {
      const seg = document.createElement('span');
      seg.style.background = cssOf(c);
      bar.appendChild(seg);
    }
    row.append(cap, bar);
    return row;
  }));
}

// ---- master render + wiring -----------------------------------------------

function renderAll() {
  renderCurrent();
  renderContrast();
  renderPalette();
  renderGradient();
}

function setCurrent(c) {
  if (!c) return;
  current = c;
  $('err').textContent = '';
  renderAll();
}

$('picker').addEventListener('input', (e) => setCurrent(parse(e.target.value)));
$('apply').addEventListener('click', () => {
  const c = parse($('text').value);
  if (c) setCurrent(c);
  else $('err').textContent = `couldn't parse "${$('text').value}" — the engine returned null`;
});
$('text').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('apply').click(); });

// OKLCH sliders build a color through the engine's oklch() parser (gamut-mapped).
function fromSliders() {
  const c = parse(`oklch(${$('ok-l').value} ${$('ok-c').value} ${$('ok-h').value} / ${$('ok-a').value})`);
  setCurrent(c);
}
for (const id of ['ok-l', 'ok-c', 'ok-h', 'ok-a']) $(id).addEventListener('input', fromSliders);

$('c-bg').addEventListener('input', (e) => { bg = parse(e.target.value); renderAll(); });
$('c-fix-aa').addEventListener('click', () => autoFix('AA'));
$('c-fix-aaa').addEventListener('click', () => autoFix('AAA'));
$('harmony-type').addEventListener('change', renderPalette);

$('g-b').addEventListener('input', (e) => { gradEnd = parse(e.target.value); renderGradient(); });
$('g-steps').addEventListener('input', renderGradient);
$('g-hue').addEventListener('change', renderGradient);

renderAll();
