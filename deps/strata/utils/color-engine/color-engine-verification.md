# color-engine — Verification & Regression Suite

Store this file alongside the engine source. Re-run it after any change — touching a
conversion matrix or transfer function, the parser/serializer, the WCAG contrast
math, accessible-color adjustment, palette/harmony generation, the gradient
interpolation, or the gamut mapping. It is the definition of "still working."

It mirrors `media-engine`, `virtualization-engine`, `toast-engine` and
`datetime-engine`'s suites: layered gates, run in order. A failure at an earlier
gate makes later gates meaningless.

- **Gate 1 — Automated unit tests (`node`).** Fast, deterministic, no browser. The
  whole point of this engine is *provable correctness*, so the conversion and
  contrast tests assert against **externally-published reference values** (CSS
  Color 4 / Ottosson OKLCH for the sRGB primaries; WCAG / WebAIM contrast ratios) —
  not just self-consistency. Round-trips, parsing, palette angles and gradient
  behavior pin the rest. There is no clock, no timezone, no randomness, no DOM, so
  every assertion is exact and reproducible. Run on every change; if red, stop and
  fix first.
- **Gate 2 — Browser verification protocol.** The interactive surface `node` can't
  reach: all formats updating live, the contrast checker (ratio + AA/AAA + readable
  swatch), the palette/harmony strip, and — the headline — the gradient bars that
  make perceptual (OKLCH) vs naive (sRGB) interpolation visible side by side.
- **Gate 3 — Headless-boundary check.** Confirms the engine ships no DOM and no CSS,
  is pure functions, imports only from `shared/`, and that the demo is entirely
  consumer-rendered.

**Prerequisites for the browser gate:** serve over HTTP — `node demo/server.mjs`
from the repository root, then open
`http://localhost:8788/demo/color-engine.html`. ES-module imports are blocked over
`file://`.

---

## 1. What "working" means — the invariants

Every gate protects one of these. If you can't map a test back to one, it's probably
testing an implementation detail, not a guarantee.

1. **Pure & stateless.** Every operation is a pure function: same input → same
   output, no internal mutable state, no subscription, no lifecycle, no DOM. The
   optional `color(...)` wrapper is thin **immutable** sugar over those functions
   (a transform returns a new wrapper; it never mutates) and holds nothing that
   needs cleanup — there is deliberately no `getState`/`subscribe`/`destroy`.
2. **Correctness over cleverness — done in the right space.** sRGB↔linear uses the
   exact IEC 61966-2-1 transfer function; linear↔OKLab uses Ottosson's exact
   published matrices. Perceptual operations — gradient interpolation, lightness and
   contrast adjustment, shades/tints — happen in **OKLCH/OKLab**, never naively in
   sRGB (which produces muddy, dark, hue-skewed midpoints). The space each operation
   works in is named in its doc comment.
3. **One canonical representation.** Every function passes around a single object
   shape: gamma-encoded sRGB `{ r, g, b, a }` with `r,g,b ∈ [0,255]` (full-precision
   floats, not 8-bit-quantized until you ask for hex) and `a ∈ [0,1]`. `parse()`
   returns it; every function accepts it **or** a format string. The `to*` getters
   return conventional per-format views for inspection (not re-ingestable object
   input — round-trip via a string or `parse()`).
4. **Format-agnostic I/O.** Liberal in: optional `#`, 3/4/6/8-digit hex, comma *or*
   space syntax, `%` or 0–255 channels, `deg`/`grad`/`rad`/`turn` hue units, optional
   `/ alpha`, whitespace, case. Strict and canonical out: lowercase hex, modern CSS
   space-separated syntax by default (legacy comma syntax on request).
5. **Soft parse, strict ops.** `parse()` is the "try" form — it returns `null` on
   anything it can't read. Every other function coerces its input and **throws a
   `TypeError`** on un-parseable input. One consistent, documented contract.
6. **WCAG contrast is exact, and alpha is explicit.** The relative-luminance and
   contrast-ratio formulas are implemented to the spec (linearized sRGB luminance,
   not naive channel averaging). Contrast is defined for **opaque** colors and these
   functions **ignore alpha** (read the rgb channels as-is); to get the real
   on-screen contrast of a translucent color, flatten it first with
   `composite(fg, bg)`. This is a documented assumption, not a silent miscompute.
7. **Adjustment moves only lightness, and reports honestly.** `adjustForContrast`
   reaches a target by moving **OKLCH L** only (hue preserved; chroma preserved
   except where a lightness extreme forces a gamut reduction), searching both
   directions and taking the smaller move. When a target is genuinely unreachable
   (even pure black/white can't meet it against the given background), it returns the
   best-achievable color with `met: false` — never a faked pass.
8. **Gamut is handled, not ignored.** Not every OKLCH triplet is a displayable sRGB
   color. Out-of-gamut colors are mapped back by **reducing chroma while preserving
   L and H** (binary search, the CSS Color 4 approach), then any residual float dust
   is clamped. Preserving lightness is what keeps shade/tint ramps monotonic.
9. **Edge cases don't explode.** Achromatic colors (gray/black/white) have undefined
   hue, reported as `0` and never `NaN`; hue interpolation takes the short way around
   the circle by default; `0`/negative step counts are guarded; alpha is preserved
   through conversions and transforms; invalid input is rejected cleanly.
10. **Dependency-free.** Zero runtime dependencies beyond the in-repo `shared/` helper
    `clamp`. No color library — the math is the deliverable. This file imports
    **only** `../shared/clamp.js`.

---

## 2. Gate 1 — Automated unit tests (node)

**Run:** `node tests/color-engine/color-engine.test.mjs`
**Pass:** exit code 0, all tests pass (currently **44**).

The suite (`tests/color-engine/color-engine.test.mjs`, harness in
`tests/color-engine/harness.mjs`) is fully deterministic — no clock, no timezone, no
randomness, no DOM. Coverage maps directly to the invariants:

| Area | What it pins |
| --- | --- |
| **Conversion accuracy** | OKLCH of the sRGB primaries asserted against the **published CSS Color 4 / Ottosson reference values** — red `0.6280 0.2577 29.23°`, green `0.8664 0.2948 142.50°`, blue `0.4520 0.3132 264.05°` (the part most likely to be wrong, pinned to exact numbers, not self-agreement). White/black/mid-gray lightness + chroma≈0; OKLab a/b axis signs; relative luminance of white/black/primaries (`0.2126`/`0.7152`/`0.0722`). |
| **Round-trips** | hex → every format string → hex within ≤1/255 channel drift, across a spread including black, white, gray and fully-saturated colors; sub-0.1/255 for the float formats; alpha preserved through the formats that carry it. |
| **Parsing (liberal)** | hex 3/4/6/8-digit with/without `#`; `rgb()/rgba()` comma or space, `%` or 0–255, modern `/`-alpha and legacy 4th-arg alpha and `%`-alpha; `hsl()`, `hsv()`/`hsb()` with `deg`/`turn`/`grad` hue and percent-or-bare s/l; `oklch()`/`oklab()` incl. `%` lightness and `%` chroma; whitespace/case tolerance. |
| **Parsing (rejection)** | a battery of garbage (`''`, `not-a-color`, `#12345`, `rgb(1,2)`, `oklch(1 2)`, `null`, `42`, `{}`, …) → `parse()` returns `null`; the strict ops (`toHex`, `contrast`, `toOklch`) **throw `TypeError`**. |
| **Serialization** | lowercase hex; alpha → 8-digit hex (and `alpha:'never'`/`'always'`); modern `rgb(r g b / a)` and legacy `rgba(r, g, b, a)`; `hsl(...)` both syntaxes; `oklch(...)`; unknown format target throws. |
| **WCAG contrast** | black/white = **21:1**, white/white = **1:1**, `#777` on white ≈ **4.48**, red on white ≈ **3.998**, order-independent. |
| **Threshold boundaries** | `#767676` on white ≈ **4.54** *passes* AA-normal; `#777777` on white ≈ **4.48** *fails* AA-normal but *passes* AA-large (3) and fails AAA (7) — the 4.5 / 3 / 7 lines tested on **both sides**. |
| **Accessible-adjust** | a failing pair (`#999` on white) is moved until it **actually meets** ≥4.5; hue is preserved and AAA reached for a saturated blue; an already-passing color is returned **unchanged** (zero movement); an **unreachable** AAA-on-mid-gray target is reported `met:false` with the best-achievable ratio (≈5.32, black) — not faked. |
| **Palette / harmony** | shades strictly **decreasing** and tints strictly **increasing** in OKLab lightness, base excluded, all in gamut, no NaN; `0`/negative/non-integer steps guarded; harmony rotation angles exactly right — complementary **+180**, triadic **±120**, analogous **±30**, split-complementary **150/210**, tetradic/square 4-up; harmony preserves L and C (only hue rotates). |
| **Gradient** | endpoints returned **exactly** at t=0/t=1 (canonical-identical); right length and ordering; the OKLCH midpoint is perceptually **lighter** than the muddy sRGB one (and the sRGB red↔blue midpoint is exactly the classic `#800080`); hue takes the **short** path (350°→10° through 0°, not 180°) with a `longer` option; multi-stop and `includeEnds:false`; `0`/negative/`1` steps guarded; `mix` clamps t. |
| **Transforms / utils** | lighten/darken move OKLCH L by the given amount (no-op at white/black); saturate/desaturate move chroma (gray a no-op — no invented hue); grayscale drops chroma, keeps lightness, no NaN; rotateHue wraps; `isLight`/`isDark`/`preferredTextColor` (contrast-maximizing black-or-white); `composite` source-over (`red 50% over white = #ff8080`). |
| **Edge cases** | achromatic colors never `NaN` in any space (hue forced to 0); out-of-gamut OKLCH gamut-mapped with **L preserved, chroma reduced**; alpha preserved through conversions and transforms. |
| **Wrapper** | `color(...)` is chainable, immutable (a transform doesn't mutate the source), and delegates to the functions. |
| **Headless import / boundary** | the static `import` runs clean in Node (proving DOM-free module scope); a comment-stripped scan of the source asserts **no** `document`/`window`/`navigator`/`localStorage`/`fetch(`/`globalThis`; the source's `from` specifiers are **exactly** `['../shared/clamp.js']`. |

**Determinism is part of the gate.** There is no `Date`, `Math.random`, timezone, or
locale input anywhere in the engine, so the suite's result does not depend on the
machine, the clock, or `TZ`. If a "reference value" test ever drifts, the cause is a
changed constant/matrix — that is the bug, not the test.

**Also confirm nothing else regressed:**
`node tests/datetime-engine/datetime-engine.test.mjs` (60),
`node tests/toast-engine/toast-engine.test.mjs` (39),
`node tests/virtualization-engine/virtualization-engine.test.mjs` (25),
`node tests/media-engine/run-all.mjs` (68),
`node tests/transform2d/transform2d.test.mjs` (20),
`node tests/gestures/gestures.test.mjs` (21).

---

## 3. Gate 2 — Browser verification protocol

Serve and open `http://localhost:8788/demo/color-engine.html`. The demo
(`demo/color-engine.js`) is a reference **consumer**: it renders every swatch, bar,
number and pass/fail badge from the values the pure functions return. It is
deliberately unstyled (plain white background, monospace, native inputs) — you are
checking that the **math renders correctly**, not the design.

Each check below was confirmed in a real browser session against this build.

1. **All formats update live.** The current color (`#3b82f6`) shows in the readout as
   `rgb(59 130 246)`, `hsl(217.22 91.22% 59.8%)`, `hsv(217.22 76.02% 96.47%)`,
   `oklch(0.6231 0.188 259.81)`, `oklab(0.6231 -0.0332 -0.1851)` — all agreeing,
   updating instantly as the picker, the "type any format" box, or the OKLCH sliders
   change. Typing an unparseable string shows "couldn't parse … the engine returned
   `null`" (the soft-parse contract, visible).
2. **OKLCH sliders show gamut mapping.** Pushing chroma to the maximum at a high
   lightness — requesting `oklch(0.9 0.4 120)` — yields `oklch(0.9 0.2137 120)`
   (`#cdf100`): **L and H preserved exactly, chroma reduced** from 0.40 to 0.214 to
   fit sRGB. Confirmed live.
3. **Contrast checker.** With the current color on a white background the readout
   shows **3.68 : 1**, with AA-normal ✗ / AA-large ✓ / AAA ✗ color-coded, plus two
   readable previews ("The quick brown fox" as current-on-bg and bg-on-current).
4. **Accessible auto-fix, both reachable and not.** "auto-fix current for AA" moves
   `#3b82f6` → `#2c72e5` at **exactly 4.50:1** (note: "moved L by -0.049"), preserving
   hue (259.81) and chroma (0.188). Against a target it can't reach, the note reports
   "UNREACHABLE … best achievable …" rather than faking a pass.
5. **Palette / harmony strip.** The shades→base→tints ramp renders 11 perceptually
   even swatches (dark navy → blue → near-white), monotonic in lightness. The harmony
   selector (complementary/analogous/triadic/split/tetradic/square) renders the right
   number of sensible swatches.
6. **Gradient — the headline.** Five bars (current `#3b82f6` → its complement) render
   one per space. **OKLCH** and **OKLab** stay even and vivid; **sRGB** visibly goes
   **muddy/gray through the middle** (the red↔blue-style dead midpoint); **HSL** shows
   the rainbow hue-rotation (through green). Read numerically, the shared blue→gold
   endpoints produce midpoints of OKLCH `rgb(202,89,149)` (vivid pink) vs sRGB
   `rgb(117,127,123)` (muddy gray) — the perceptual win is visible and measurable.
   The steps slider and shorter/longer hue toggle re-render live.
7. **No console errors or warnings** at any point during the above.

---

## 4. Gate 3 — Headless boundary

The point of the engine is that it is pure math that renders nothing. These checks
confirm the boundary holds.

1. **No DOM, no CSS in the engine.** `color-engine.js` contains no
   `document`/`window`/`navigator`/`localStorage`/`fetch`/`globalThis` access, no
   stylesheet, and no markup — asserted by the Gate-1 comment-stripped source scan,
   and proven at runtime by the clean Node import (nothing DOM-related runs at module
   scope because none of it exists). It has **no** environmental input at all: no
   clock, no storage, no network. Pure functions in, values out.
2. **Imports only from `shared/`.** The source's only `from` specifier is
   `../shared/clamp.js` (asserted by scanning the source). No color library is bundled
   or required.
3. **The demo is entirely consumer-rendered.** Every swatch, gradient bar, format
   string, contrast badge and preview lives in `demo/color-engine.html` /
   `demo/color-engine.js`, built from the engine's return values. Delete the demo and
   the engine is unchanged and still fully tested by Gate 1. Swap the renderer
   (different markup, a framework, or none) and the engine does not change — it emits
   values; the consumer owns all rendering.

---

## 5. Known scope boundaries (by design)

- **Screen-relevant spaces only.** sRGB family (hex / rgb / hsl / hsv) plus
  OKLCH/OKLab. **No** CMYK, CIE Lab/LCh, Display-P3/Rec.2020 wide gamut, Pantone or
  spot colors for v1. (Extendable later — the OKLab core is the right foundation.)
- **No named CSS colors.** `parse()` handles the numeric/hex formats listed above,
  not the 148-entry named-color table (`rebeccapurple`, `tomato`, …) or `transparent`.
  A bounded future add; out of scope for v1.
- **v1 gamut policy is chroma-reduce-then-clamp.** Out-of-gamut OKLCH is mapped by
  reducing chroma at fixed L/H (then clamping float dust). It is **not** a full
  CSS-Color-4 OKLCh→CSS deltaE gamut map; it is the simpler, lightness-preserving
  reduction that keeps ramps monotonic. Documented, acceptable for v1.
- **Contrast ignores alpha by design.** Contrast/adjustment treat colors as opaque;
  flatten translucent colors with `composite(fg, bg)` first (see invariant 6).
- **8-bit hex is lossy.** Serializing to hex quantizes to 8-bit per channel; that is
  inherent to the format and is why round-trip tolerances exist. The float formats
  (hsl/oklch/oklab) round-trip tightly.
- **No UI / picker / CSS.** The engine is pure math; the polished color-picker UI is a
  separate consumer built elsewhere. The web-utils demo is a throwaway test surface.
- **No image/pixel operations** (sampling colors from images / eyedropper) — a
  consumer/UI concern, not color math.
- **No state / subscription / lifecycle / host coupling.** Stateless pure functions;
  no `Emitter`, no stores/services/DOM/framework.
