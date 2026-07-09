# Phase 0 Research: ki-progress

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 inventory notes; MarsUI verified 2026-07-08 — no progress
component exists, only the `Icon / Loader` glyph; single-source basis
accepted at gate 1), the ARIA specification for `role="progressbar"`, the
001 token architecture, the 002 ki-button implementation (`--_ki-*` CSS
indirection, unknown-value fallback), the 008 ki-switch plan set
(reduced-motion suppression pattern, per-pair contrast minimum, the
`emulateReducedMotion` browser command) and the 010 ki-badge plan set
(non-interactive proportionality, contrast-sweep extension pattern).
Decisions are cited from siblings rather than re-derived (Art. VII).

## D1 — Base semantics: shadow `div[role="progressbar"]`, not native `<progress>`, not ElementInternals

**Decision**: the shadow root renders one stable accessibility node in both
shapes:

```html
<div class="base" role="progressbar"
     aria-valuemin="0" aria-valuemax={normalizedMax}
     aria-valuenow={clampedValue}   <!-- OMITTED when indeterminate -->
     aria-label={label}>            <!-- OMITTED when label is absent -->
  <!-- linear -->
  <div part="track"><div part="indicator"></div></div>
  <!-- circular -->
  <svg viewBox="0 0 48 48" aria-hidden="true">
    <circle part="track" pathLength="100" />
    <circle part="indicator" pathLength="100" />
  </svg>
</div>
```

`aria-valuemin`/`aria-valuemax` are always present with the normalized
range; `aria-valuenow` carries the clamped value and is omitted entirely in
indeterminate mode (S9, S15, FR-003/FR-008). `aria-label` comes verbatim
from the `label` prop; when `label` is absent the attribute is NOT rendered
— never an empty `aria-label` — so the element exposes no accessible name
and fails the accessibility audit exactly as the spec's edge case documents
(the component ships no hardcoded fallback string, FR-005/Art. IV). No
`tabindex`, no listeners, no events, not form-associated (FR-007).

**Rationale** (honest Art. IV assessment — platform first was evaluated,
and loses):

- **Native `<progress>` rejected.** It is the semantic platform element,
  but it fails three constitutional obligations at once. (1) Art. VI: its
  visual anatomy is only reachable through engine-proprietary
  pseudo-elements (`::-webkit-progress-bar`/`::-webkit-progress-value` vs
  `::-moz-progress-bar`), so a tokens-only, cross-engine restyle of track
  and indicator is not achievable — and pseudo-elements cannot carry
  `part`, so FR-013's `track`/`indicator` parts are impossible (the same
  reason 008 D1 rejected styling the native checkbox directly). (2) It has
  no circular presentation at all — FR-004's `shape` axis would need a
  parallel non-native implementation anyway, giving two rendering paths to
  keep in sync. (3) Its indeterminate model is "value attribute absent",
  which the spec deliberately diverges from with an explicit
  `indeterminate` attribute (spec Assumptions, agent legibility). A native
  element used only as a hidden semantic carrier would duplicate state into
  ARIA anyway; the `div[role=progressbar]` reaches the same accessibility
  tree exposure with one node and zero engine-specific CSS.
- **ElementInternals ARIA on the host rejected.** `internals.role =
  'progressbar'` would put the role on the host without a wrapper, but
  Stencil couples `@AttachInternals()` to `formAssociated: true`, which
  would enrol an output-only component in the FACE machinery
  (`form.elements`, form data lifecycle) — directly contradicting the
  spec's form-participation N/A ("not form-associated", scenario family
  table). Machinery without a scenario (Art. VII); rejected.
- The chosen `div` carries the full ARIA progressbar contract with the
  attributes the ARIA spec names for the role; roles inside shadow trees
  are exposed to assistive technology normally, and the S7 tab-order
  scenario holds by construction (a generic `div` is never focusable).

**Alternatives considered**: (a) native `<progress>` — see above; rejected.
(b) host-level ARIA via ElementInternals — Stencil ties it to
form-association; rejected. (c) role on the `track` element itself — the
node carrying the role would change meaning between shapes (a `div` track
vs an SVG child), while a single stable `.base` node keeps the exposure
identical across `shape` (S8/S9 assert one contract, not two); rejected.

## D2 — Normalization: pure helpers, clamp in logic (not CSS construction)

**Decision**: a pure module
`packages/elements/src/components/ki-progress/ki-progress.math.ts` exports:

- `normalizeMax(raw: number | undefined): number` — finite and `> 0` →
  `raw`; anything else (NaN from a non-numeric attribute, `0`, negative,
  absent) → `100` (FR-002);
- `clampValue(raw: number | undefined, max: number): number` — finite →
  `min(max, max(0, raw))`; NaN/absent → `0` (FR-001);
- `resolveShape(raw: string | undefined): 'linear' | 'circular'` —
  `'circular'` only on the exact value, everything else → `'linear'`
  (FR-004);
- `fraction = clampValue / normalizeMax` — always computable because
  `normalizeMax` never returns `≤ 0`.

The S14 examples table is transcribed verbatim into the unit suite (every
row: `-10/100 → 0`, `abc/100 → 0`, `40/0 → 40 of 100`, `40/-5 → 40 of 100`,
`40/abc → 40 of 100`), plus S4's `250/100 → 100`. These helpers are the
component's entire pure logic and serve as the mutation-gap compensating
control (exhaustive unit cases per branch — the 003/008
`ki-switch.form.ts` precedent).

**Declared deviation from the 002 fallback pattern**: 002/010 achieve
unknown-value fallback *by CSS construction* (an unrecognized attribute
value matches no selector). That works when the fallback is pure
appearance. Here it cannot carry the contract alone: `value`/`max` feed
*arithmetic* (the fill fraction AND `aria-valuenow`/`aria-valuemax`), and
`shape` switches *markup* (a `div` bar vs an SVG ring — D3/D4), so the
fallback must live in render logic. The helpers are tiny, pure and
exhaustively tested, which is the honest equivalent: the fallback is still
by construction — of the render input — never scattered validation.

**Stencil note**: `value`/`max` are typed `number`; Stencil coerces a
non-numeric attribute string to `NaN`, which the helpers normalize — the
S14 `abc` rows are exactly this path. Props reflect per the charter rule
so markup, DevTools and agents read the declared state; the *normalized*
values appear only in ARIA and geometry (the attribute keeps what the
consumer declared — normalization is presentation, not attribute
rewriting).

**Alternatives considered**: (a) rewriting out-of-range attributes back to
clamped values — mutates consumer markup, surprises agents diffing their
own output; rejected. (b) validation scattered in the renderer — untestable
branches, mutation-gap risk; rejected.

## D3 — Linear geometry: track + indicator divs, fraction via a private custom property

**Decision**: the linear shape renders `<div part="track"><div
part="indicator"/></div>`. Render sets one private custom property on the
host style: `--_ki-progress-fraction: <0..1>`. CSS:

- track: `block-size: var(--ki-progress-linear-thickness)`;
  `border-radius: var(--ki-progress-linear-radius)`; background
  `var(--_ki-progress-track-color)`; `overflow: hidden`.
- indicator: `inline-size: calc(var(--_ki-progress-fraction) * 100%)`;
  `block-size: 100%`; background `var(--_ki-progress-indicator-color)`.

Because the fill is `inline-size` (a logical property), the filled portion
grows from the inline start — in RTL documents that is the right edge with
zero direction code (S12, FR-014; the 008 D6 logical-travel precedent). The
fraction custom property is **state, not a visual value**: every color and
metric still resolves from `--ki-progress-*` tokens through the `--_ki-*`
indirection (002 pattern); the fraction is the runtime datum the scenarios
themselves declare (`value ÷ max`), so it does not violate FR-010's
zero-hardcoded-visual-values rule. No width transition ships in v1: no
scenario asserts an animated determinate update (S13 asserts the new fill,
not its easing), so adding one would be unapproved motion with its own
reduced-motion obligations (Art. VII/II).

**Alternatives considered**: (a) `transform: scaleX(fraction)` — physical
axis, needs `dir()`-conditional transform origins for RTL (the exact
failure 008 D6 rejected in `translateX`); rejected. (b) a `width`
percentage set as an inline style directly — same effect but bypasses the
indirection layer and hides the datum from `::part` customizers; the custom
property keeps one seam; rejected. (c) determinate fill transition —
unapproved motion; rejected for v1 (additive later with its own
reduced-motion handling).

## D4 — Circular geometry: SVG ring with `pathLength="100"`, not conic-gradient

**Decision**: the circular shape renders an inline SVG (`viewBox="0 0 48
48"`, `aria-hidden="true"`) with two circles, both `pathLength="100"`:

- `<circle part="track">` — full ring: `stroke:
  var(--_ki-progress-track-color)`; `fill: none`.
- `<circle part="indicator">` — `stroke:
  var(--_ki-progress-indicator-color)`; `stroke-dasharray:
  calc(var(--_ki-progress-fraction) * 100) 100` — the arc covers exactly
  `fraction` of the circumference (S2).

`pathLength="100"` normalizes the path metric, so the dash arithmetic is
radius- and size-independent: `--ki-progress-circular-size` (CSS
`inline-size`/`block-size` on the svg) and
`--ki-progress-circular-track-width` (CSS `stroke-width` on both circles)
restyle the ring from tokens alone with no recomputation. The ring starts
at the top via a `rotate(-90deg)` transform on the svg and sweeps clockwise
in both writing directions (spec assumption: SVG coordinates do not mirror
with `dir`, which is exactly the approved behavior — S12's RTL assertion
applies to the linear fill only). The `viewBox` numbers are a coordinate
system, not a visual value; the rendered size comes from the token. Circle
geometry (`r`, `cx`, `cy`) is set from CSS geometry properties so the
stroke stays inside the viewBox at any track width (implementation detail).

**Why not conic-gradient** (the alternative the mission asked to weigh
honestly): a `conic-gradient` paints indicator AND track into a single
element's background, so `track` and `indicator` could never be two
separate `::part` surfaces — FR-013 is unsatisfiable by construction. It
also cannot express the ring hole without an additional `mask`, and
animating the sweep angle requires a registered typed custom property
(`@property`/`CSS.registerProperty`) for interpolation — machinery with
uneven behavior inside shadow trees. The SVG ring needs none of that:
dasharray is a plain CSS property, transitions and keyframes on it are
first-class, and both anatomy parts are real elements. **Rejected.**

**Verified-at-implementation assumption**: `part` is a global attribute on
any element in a shadow tree, including SVG elements, and `::part()`
matching on SVG children is supported by the evergreen engine baseline; the
mock-doc anatomy assertions pin the `part` attributes and the browser suite
exercises token-driven stroke resolution, so a regression would fail the
gates, not review.

**Alternatives considered**: (a) conic-gradient + mask — kills FR-013 and
needs `@property`; rejected. (b) canvas — script-drawn pixels, invisible to
tokens and parts; rejected. (c) two-semicircle clip tricks — brittle
geometry, no benefit over dasharray; rejected.

## D5 — Indeterminate: CSS keyframes only, declared exclusively under `no-preference`

**Decision**: `indeterminate` (boolean, reflected) switches presentation
via `:host([indeterminate])`; any declared `value` is ignored for
presentation and `aria-valuenow` is omitted (D1) — indeterminate wins
(S15, FR-003). The motion:

- **linear**: the indicator becomes a fixed-fraction segment whose
  `inset-inline-start` animates along the track in an infinite keyframe
  loop (logical property — RTL mirrors the travel for free, the 008 D6
  decision re-applied; `translateX` rejected for the same reason it was
  rejected there).
- **circular**: an infinite `rotate` animation on the svg with a fixed
  partial arc (dasharray) — rotation is direction-neutral, matching the
  clockwise-in-both-directions assumption.

Both `animation` declarations (and only they) live inside
`@media (prefers-reduced-motion: no-preference)` — the 008 D6 suppression
pattern. Under `reduce` no animation is ever *declared*, so the FR-009
oracle holds by construction: `getAnimations()` on the indicator returns
zero indefinitely-running animations (S6/SC-005). The stilled presentation
is the keyframes' resting geometry — a static partial segment/arc — which
keeps the activity indication visible; making it *visually distinguishable*
from a determinate bar is documented design guidance for theme authors, not
a gated criterion (spec FR-009, Assumptions). Timing: `animation-duration:
var(--ki-progress-indeterminate-duration)` — the token surface's motion
entry (D6). Keyframe internals (segment sweep fractions, easing, offsets)
are animation *structure*, an implementation detail like 008's
duration/easing position — with the single exception of the duration, which
this spec's token surface explicitly names.

**Deterministic oracles** (spec FR-009 verbatim): S3 "shows continuous
activity" = at least one running animation with infinite iterations
observable on the indicator (`element.getAnimations()`, checking
`playState === 'running'` and `iterations === Infinity`); S6 "presents
without continuous motion" = zero such animations. Both are queried through
a public browser API in the real-browser suite — no screenshots, no timing
sleeps.

**Alternatives considered**: (a) `animation-play-state: paused` under
`reduce` — the animation still *exists* in the animation state and freezes
at an arbitrary frame; declaring none is cleaner against the oracle and is
the 008 precedent; rejected. (b) JS `matchMedia` listeners toggling
classes — re-implements what the media query does declaratively (Art.
IV/VII); rejected. (c) a reduced-motion *alternative* animation (slow
pulse) — motion nobody approved; the spec demands zero indefinitely-running
animations, not gentler ones; rejected.

## D6 — Token family: seven tokens, first motion token, no tones, no sizes

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`,
exactly the shape frozen in the spec's Constitutional Surface:

- `progress.tokens.json` (theme-neutral schema, onmars values by
  inheritance):
  - `ki.progress.linear.{thickness,radius}` — thickness from `ki.space.*`
    (a slim bar step), radius `{ki.radius.round}` (full-round caps as the
    onmars default);
  - `ki.progress.circular.{size,track-width}` — ring diameter and stroke
    width from `ki.space.*`;
  - `ki.progress.{track,indicator}.color` — indicator from the primary
    emphasis ramp (`{ki.surface.primary-high-em}`), track from the neutral
    surface ramp (`{ki.surface.s3}`-area) — the exact ramp steps are the
    onmars theme decision recorded at authoring time and ratified by the
    contrast gate (the 010 T003 pattern);
  - `ki.progress.indeterminate.duration` — DTCG `$type: "duration"`, a
    literal value (≈ `1600ms`), passed through the css pipeline verbatim.
- `progress.material3.tokens.json` — material3 overrides for the same
  names: M3 maps the active indicator to the primary role and the track to
  its container role; M3 metrics (4px linear thickness, 48px/4px ring) via
  the equivalent `ki.space.*` references, radius `{ki.radius.round}`.

7 tokens per theme. **No `tone` segment** (verified: the spec ships no tone
axis — progress is not in the charter's feedback list and neither source
shows intent-colored indicators; a future tone axis is additive MINOR).
**No `size` segment** (verified: no size attribute in v1; thickness and
diameter are per-theme decisions). **No interaction-state or focus-ring
segments** — the progress is static output and never focusable (documented
deviation from the button naming template, spec Art. VI echo; the 010
badge precedent).

**First motion token, declared honestly**: no `ki.motion.*`/duration family
exists anywhere in the token sources (verified 2026-07-08: zero
`duration`/`motion` matches in `packages/tokens/tokens/`), so
`ki.progress.indeterminate.duration` cannot reference the semantic layer —
it is the first component token whose value is a literal, not a reference.
Creating a semantic motion family for a single consumer would be
speculative abstraction (Art. VII, duplication-before-wrong-abstraction:
extraction is considered when a third motion consumer exists — 008
deliberately kept its transition timing OUT of tokens for the same reason;
this spec differs only because its token surface explicitly names the
duration). The Style Dictionary css pipeline emits unmatched DTCG types
verbatim, so the `"1600ms"` value lands as
`--ki-progress-indeterminate-duration: 1600ms;` — verified at
implementation by the tokens-sync diff.

**Alternatives considered**: (a) a new `ki.motion.*` semantic family —
speculative for one consumer; rejected (additive later). (b) duration as
component-CSS constant like 008 — contradicts this spec's frozen token
surface (a theme must be able to retime or effectively disable the sweep);
rejected. (c) per-shape color tokens (`linear-indicator-color`…) — both
shapes share the same two inks in both sources; per-shape colors would be
combinatorial noise (Art. VII); rejected.

## D7 — Contrast gate: extend the component sweep with the progress pair at 3:1

**Decision**: the same change that introduces the progress tokens extends
`packages/tokens/scripts/check-contrast.mjs` with the pair
`--ki-progress-indicator-color` over `--ki-progress-track-color` at a
**3.0 minimum** (WCAG 1.4.11 non-text contrast — the indicator/track
boundary is a graphical state indication, not text; FR-012 verbatim),
evaluated in all four theme × scheme contexts the script already sweeps,
with the zero-match guard covering the progress names so token drift fails
loudly. Unit cases join `scripts/check-contrast.test.mjs`.

**Coordination with 008/010 (declared, not discovered)**: the shipped
script today has a single `MIN_RATIO = 4.5` and a button-only
`COMPONENT_BG_PATTERN` (verified 2026-07-08, line ~170) — the **per-pair
minimum mechanism does not exist yet**. 008 (T005) introduces per-pair
minimums for its thumb/track 3:1 pairs and 010 (T005) adds a second 4.5
pattern; all three features extend the same script. Whichever lands first
ships the per-pair-minimum refactor; the later ones rebase onto it and add
only their pairs (single writer per feature, sequencing at the founder's
merge order). This feature's task (T005) is written add-if-absent for the
mechanism and additive for the pair.

**Alternatives considered**: (a) sweeping the progress pair at 4.5 —
stricter than WCAG 1.4.11 with no constitutional basis (the 008 D8
argument verbatim); rejected. (b) also sweeping track-vs-page-surface —
FR-012 requires the indicator against its adjacent colors (the track it
sits on); the track itself is not the meaningful graphic and the sources
treat it as a low-emphasis field; adding an unrequired pair would invent a
criterion the spec did not approve; rejected (revisable through the spec if
a source demands it).

## D8 — Tests, oracles and traceability

**Decision**: three test files, each with the file-level marker
`// @spec:015-ki-progress`, S-IDs on code lines (test titles), the 002/008/
010 layout:

- `ki-progress.spec.tsx` (mock-doc, fast): anatomy per shape (base node
  with `role="progressbar"`, `track`/`indicator` parts in the div and svg
  variants, `aria-hidden` svg); ARIA wiring (valuemin/valuemax always,
  valuenow present-and-clamped in determinate, absent in indeterminate,
  `aria-label` from `label` and absent without it); S4 clamp markup
  (`aria-valuenow="100"` at 250/100); S5 unknown shape renders the linear
  markup; S14 exhaustive unit cases for `normalizeMax`/`clampValue`/
  `resolveShape` (every table row verbatim — the mutation-gap compensating
  control); a bare `<ki-progress>` renders determinate at 0 (spec
  assumption); no listeners, no tabindex, no events.
- `ki-progress.browser.spec.ts` (real browser, built output +
  `@kimen/tokens/css`): S1 linear 40/100 — the indicator's bounding box is
  40% of the track's inline size; S2 circular 40/100 — the computed
  `stroke-dasharray` covers 40 of the 100-normalized circumference; S4
  full at 250/100; S13 runtime `value` 40→80 updates fill and
  `aria-valuenow`; S14 fill assertions for the malformed rows; S3
  indeterminate — ≥1 running infinite animation on the indicator
  (`getAnimations()`), no fraction presented; S15 indeterminate + value 40
  — no fraction, no `aria-valuenow`; S6 reduced motion — zero
  indefinitely-running animations (via the `emulateReducedMotion` browser
  command); S7 Tab travels button → button past the progress; S8/S9
  accessibility exposure (role, name, value present/absent); S10 material3
  restyle via injected built stylesheets; S12 RTL — the linear filled
  portion grows from the right edge (bounding-box comparison under
  `dir="rtl"`); S5 unknown shape computes the linear presentation; axe zero
  violations across the shape × mode matrix.
- `ki-progress.dark.browser.spec.ts`: S11 forced dark under onmars + axe in
  dark (the established `*.dark.browser.spec.ts` split — the vitest config
  routes it to the dark-emulating instance).

**Browser-command coordination**: S6 needs
`page.emulateMedia({ reducedMotion })` exposed as an `emulateReducedMotion`
command in `packages/elements/vitest.browser.config.ts`, mirroring the
existing `emulateColorScheme` command. 008 (T017) plans the identical
command; verified 2026-07-08 it does not exist yet — this feature's task
adds it if 008 has not landed first (add-if-absent, same coordination rule
as D7).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships (computed geometry, animation
state, accessibility tree, tab order) — deterministic oracles only, no
screenshots, no sleeps (`getAnimations()` reads state; nothing waits on
animation progress). RED first per Art. III. All 15 approved scenarios
(S1–S15) map to test tasks (tasks.md Notes carries the full map). No manual
APG walkthrough: no APG interaction pattern exists for a non-interactive
output element and none is introduced (spec Constitutional Surface; the
batch charter scopes walkthroughs to dialog/tooltip/tabs/select).
