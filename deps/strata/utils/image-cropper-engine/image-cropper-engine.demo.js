// image-cropper-engine/image-cropper-engine.demo.js
// Reference CONSUMER for the headless image cropper. The engine
// (../image-cropper-engine.js) owns only geometry — it ships no DOM and no CSS. Every
// visible thing here — the image's transform, the crop frame, the circular mask,
// the dimmed exterior, the rule-of-thirds grid, the zoom readout — is rendered in
// THIS file from the state the engine emits. The engine is never asked to draw
// anything. That is the proof of the headless boundary (Gate 3).
//
// The pixel export is the separate, canvas-only helper
// (../image-cropper-engine-export.js); the geometry path works without it.

import { createCropper, CropShape, aspectRatio } from './image-cropper-engine.js';
import { cropToBlob } from './image-cropper-engine-export.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const img = $('img');
const frame = $('frame');

// The engine. We do NOT hand it the <img> — the consumer applies the emitted
// previewMatrix itself (below), so this demo proves the engine renders nothing.
const cropper = createCropper({
  aspect: 1,
  shape: CropShape.RECT,
  inset: 14,
  maxZoom: 6,
  output: { maxDimension: 512 },
  onChange: render,
});

// Conveniences that touch only the stage (input + measurement, never rendering).
cropper.observe(stage);
cropper.attachInput(stage);

// ---- the single render function: state in, chrome out ----------------------

let lastObjectUrl = null;

function render(state) {
  // 1. Position the source image with the container-space matrix the engine emits.
  img.style.transform = `matrix(${state.previewMatrix.join(',')})`;

  // 2. Lay out the crop frame + dim + mask from the emitted crop rect.
  const { x, y, width, height, round } = state.crop;
  frame.style.left = `${x}px`;
  frame.style.top = `${y}px`;
  frame.style.width = `${width}px`;
  frame.style.height = `${height}px`;
  frame.classList.toggle('round', round);

  // 3. Sync the zoom slider + readout (engine reports min/max/current).
  const z = state.zoom;
  $('zoom').min = '1';
  $('zoom').max = z.maxRatio.toFixed(2);
  $('zoom').value = z.ratio.toFixed(3);
  $('zoomval').textContent = `${z.scale.toFixed(2)}× (${z.ratio.toFixed(2)}× of cover)`;

  // 4. Reflect the live output geometry the export will use.
  if (state.output) {
    const o = state.output;
    const sr = o.sourceRect;
    $('outmeta').dataset.live =
      `output ${o.width}×${o.height}px${o.upscale ? '  ⚠ upscaling low-res source' : ''}\n` +
      `source rect ${Math.round(sr.width)}×${Math.round(sr.height)} @ (${Math.round(sr.x)}, ${Math.round(sr.y)})  ` +
      `rot ${o.rotation}°${o.flippedHorizontally ? ' flippedHorizontally' : ''}${o.flippedVertically ? ' flippedVertically' : ''}`;
  }
}

// ---- image loading: consumer reads natural size, tells the engine -----------

function loadImage(src) {
  img.onload = () => cropper.setImageSize(img.naturalWidth, img.naturalHeight);
  img.src = src;
}
loadImage($('pick').value);
$('pick').addEventListener('change', (e) => loadImage(e.target.value));

// ---- controls (all just call engine methods) -------------------------------

$('zoom').addEventListener('input', (e) => cropper.setZoomRatio(parseFloat(e.target.value)));

$('rotl').addEventListener('click', () => cropper.rotateLeft());
$('rotr').addEventListener('click', () => cropper.rotateRight());
$('fliph').addEventListener('click', () => cropper.flipHorizontal());
$('flipv').addEventListener('click', () => cropper.flipVertical());
$('reset').addEventListener('click', () => cropper.reset());

function selectIn(container, btn) {
  for (const b of container.children) b.classList.toggle('on', b === btn);
}

$('shapes').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectIn($('shapes'), btn);
  cropper.setShape(btn.dataset.shape);
});

$('ratios').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  selectIn($('ratios'), btn);
  cropper.setAspectRatio(btn.dataset.free ? 'free' : aspectRatio(+btn.dataset.w, +btn.dataset.h));
});

$('size').addEventListener('change', (e) => {
  const n = parseInt(e.target.value, 10);
  cropper.setOutput(n > 0 ? { maxDimension: n } : {});
});

// ---- export: geometry → pixels via the canvas helper ------------------------

$('export').addEventListener('click', async () => {
  const geometry = cropper.getOutputGeometry();
  if (!geometry) return;
  const type = $('fmt').value;
  const blob = await cropToBlob(img, geometry, { type, quality: 0.92 });

  if (lastObjectUrl) URL.revokeObjectURL(lastObjectUrl);
  lastObjectUrl = URL.createObjectURL(blob);
  $('outimg').src = lastObjectUrl;

  // Round the result preview when the crop shape is a circle (consumer mask).
  $('result').classList.toggle('round', cropper.getState().crop.round);

  const kb = (blob.size / 1024).toFixed(1);
  $('outmeta').textContent =
    `${geometry.width}×${geometry.height}px · ${type.split('/')[1].toUpperCase()} · ${kb} KB` +
    (geometry.upscale ? '\n⚠ source upscaled — output exceeds available source pixels' : '') +
    `\nsource rect ${Math.round(geometry.sourceRect.width)}×${Math.round(geometry.sourceRect.height)} ` +
    `@ (${Math.round(geometry.sourceRect.x)}, ${Math.round(geometry.sourceRect.y)}) · rot ${geometry.rotation}°` +
    (geometry.flippedHorizontally ? ' flippedHorizontally' : '') + (geometry.flippedVertically ? ' flippedVertically' : '');
});
