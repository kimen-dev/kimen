# Phase 0 Research: ki-badge

Decisions that resolve every open technical question in the plan. ki-badge is
a static status descriptor — after ki-card, the second non-interactive
component of the Fase 2 batch — so the decisions are few and none introduces
machinery beyond what the approved scenarios require (Art. VII). Sources: the
spec's design analysis (MarsUI verified 2026-07-08; M3 mapping PARTIAL), the
001 token architecture, the 002 component precedent and the 009 planning
precedent for non-interactive components.

## D1 — Anatomy and zero logic: host + one part, fallback by CSS construction

**Decision**: the shadow root renders a single wrapper around the default
slot: `<span part="badge"><slot/></span>`. Host `display: inline-block`;
the pill itself is the part (`inline-flex`, centered). Two typed, reflected
props exist — `tone` (`neutral | success | danger | info | warning`, default
`neutral`) and `size` (`sm | md`, default `md`) — and nothing else: no
events, no listeners (not even `slotchange`), no `tabindex`, no ARIA, no
`delegatesFocus`, not form-associated. Appearance selection is pure CSS:
`:host` sets the `--_ki-badge-*` indirection to the neutral/md tokens and
`:host([tone="success"])` … `:host([size="sm"])` override it per **valid**
value only (the exact 002 ki-button pattern). An unrecognized value matches
no selector, so the defaults apply — S3/FR-007 fallback is by construction,
never validation code.

**Rationale**: FR-009 requires a `badge` part, and parts only exist on
shadow elements, so one wrapper is the minimum anatomy. S4/S5 (no tab stop,
no role/state) hold because a generic `span` contributes nothing and no code
touches focus or events. Unlike ki-card (research 009 D1), **no
slot-emptiness tracking exists**: no requirement makes an empty badge
collapse visually — S8/FR-012 demand only "renders without error" and "no
content reaches assistive technology", and both hold by construction (an
empty generic span exposes no name, no text and no role; empty usage is
documented misuse per FR-011). Adding `slotchange` state would be machinery
without a scenario (Art. VII).

**Alternatives considered**: (a) styling `:host` directly without a wrapper
— cannot satisfy FR-009 (`::part(badge)`); rejected. (b) JS validation
coercing unknown tone/size to defaults — duplicates what the CSS cascade
already guarantees and adds mutable logic to a static component; rejected.
(c) card-style emptiness tracking to hide empty pills — no scenario demands
it; rejected (Art. VII).

## D2 — Token family: state-less tone matrix, soft-tint default, sizes sm/md

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `badge.tokens.json` — theme-neutral schema (onmars values by inheritance),
  exactly the shape frozen in the spec's Constitutional Surface:
  - per size (`sm`, `md`):
    `ki.badge.{size}.{height,padding-inline,radius,font-size,line-height}`
    (10 tokens) — geometry from `ki.space.*`/`ki.radius.*`, typography from
    `ki.typography.size.*`/`.line-height.*` (sm leans on the caption scale,
    md on body-1, following the button's size ladder);
  - family-level: `ki.badge.{font-family,font-weight,border-width}`
    (3 tokens) — the 002 convention; `border-width` is what makes a
    filled-vs-outlined pill expressible as a token-layer decision;
  - per tone (`neutral`, `success`, `danger`, `info`, `warning`):
    `ki.badge.{tone}.{bg,fg,border}` (15 tokens).

  **Deviation from the button template, justified**: no
  `rest|hover|active|disabled` state segments and no focus-ring tokens — the
  badge is static and never focusable (spec Art. VI echo). ~28 tokens total.

  The shipped onmars treatment is the **soft tint**: per-tone
  `bg = {ki.surface.{tone}-base-em}` (opaque),
  `fg = {ki.text.{tone}-high-em}`, `border = {ki.outline.none}` with the
  family `border-width` available for outlined themes. `neutral` resolves
  from the **neutral ramp** (`ki.surface.s2`-area surface + `ki.text.high-em`
  + `ki.outline.low-em` if bordered), NOT from the brand-primary ramp — a
  deliberate divergence from the button, whose "neutral" tone is the brand
  action color: a badge's neutral is a no-intent status ("Beta", "Draft"),
  and painting it brand-primary would make every neutral badge look like an
  action. The exact ramp steps are recorded in the token file at authoring
  time and ratified by the contrast gate (the 009 T003 pattern).
- `badge.material3.tokens.json` — material3 overrides for the same names:
  M3 shape (`{ki.radius.round}`, the button.material3 precedent), M3 border
  treatment, and tone colors mapped to M3 roles where they exist (danger ↔
  error container family). material3 defines **no info/warning color roles**:
  under material3 those two tones resolve through the shared info/warning
  ramps inherited via the semantic cascade (001 contract) — the override
  file simply does not name them.

**Semantic-layer verification (2026-07-08, this research)**: the full
info/warning ramps (`--ki-{surface|text|outline}-{info|warning}-{high|med|base|low}-em`
plus alpha variants) **exist in the built CSS of both themes and both
schemes** — `packages/tokens/dist/css/tokens.css`, `tokens.dark.css`,
`tokens.material3.css`, `tokens.material3.dark.css` all carry them; the
material3 values arrive by cascade inheritance from
`tokens/semantic.tokens.json` + `tokens/modes/dark.tokens.json` (grep
confirms no info/warning definitions in any material3 source file, exactly
as the spec documents). **No semantic-token task is needed** — the
mission-level contingency "material3 lacks a ramp" does not trigger.

What does NOT exist: on-tone text roles for info/warning
(`ki.text.primary-on-info` / `primary-on-warning` are absent; only
`-on-primary`, `-on-success`, `-on-danger` ship). This is the decisive
reason the shipped treatment is the soft tint and **not** solid high-em
fills: solid `{tone}-high-em` backgrounds would need those missing on-tone
roles, i.e. a semantic-layer addition changing the 001 surface — which
would require explicit founder sign-off (002 precedent). The soft tint
needs zero semantic additions. A theme that wants solid pills can express
it later as a token-value diff plus that founder-signed semantic addition.

**Alternatives considered**: (a) solid high-em fills as the default —
blocked on missing on-tone text roles, per above; rejected for v1.
(b) alpha surfaces (`{tone}-base-em-alpha`) — compositing-dependent contrast
across arbitrary page backgrounds; the opaque `base-em` step gives the
contrast gate a deterministic answer; rejected. (c) per-size tone colors —
tone and size are orthogonal by construction; rejected as combinatorial
noise (Art. VII).

## D3 — Long labels: one line, pill grows, no truncation machinery

**Decision**: the pill lays out as `inline-flex` with `white-space: nowrap`,
fixed `block-size` from `--_ki-badge-height`, centered content, and
`padding-inline` from the size token. No `max-inline-size`, no
`text-overflow`, no wrapping mode.

**Rationale**: the spec's Assumptions fix this: a long label stays on a
single line and grows the pill; truncation or wrapping is the consumer's
layout concern in v1. Any clamp the component shipped would be an
appearance decision the spec deliberately did not take. Logical properties
(`padding-inline`, `block-size`) keep RTL correct with zero direction code
(FR-010); with only a default slot there is no start/end order to mirror,
so no RTL scenario exists (spec assumption, 002 S13 pattern not
applicable) — the Polish-phase RTL check asserts padding mirroring only.

**Alternatives considered**: built-in ellipsis via a `max-width` token —
speculative axis with no scenario; rejected (Art. VII).

## D4 — Contrast gate: extend the component sweep to `--ki-badge-*`

**Decision**: the same change that introduces the badge tokens extends the
component-layer sweep in `packages/tokens/scripts/check-contrast.mjs`
(`COMPONENT_BG_PATTERN`, line ~170) so badge pairs join the button pairs —
the badge shape has no variant/state segments, so the sweep gains a second
pattern `^--ki-badge-(?:neutral|success|danger|info|warning)-bg$`, pairing
each `…-bg` with its `…-fg`. The script already composites translucent cells
over `--ki-surface-s0` and evaluates every theme × scheme, so the badge
inherits all four contexts for free.

**Rationale**: Art. X — a finding a rule could produce gets ruled, never
left to review; the sweep comment itself mandates per-component extension
(the zero-match guard only protects listed patterns). This sweep is the
**first time the info/warning ramps are contrast-gated in the two material3
contexts** (the button sweep stops at neutral/success/danger): the spec's
Constitutional Surface flags exactly this. Verified inputs (D2) say the
material3 values are cascade-inherited from onmars, so failures are not
expected for opaque soft-tint pairs — but if the gate does surface an AA
failure in any theme × scheme, the fix necessarily changes 001-shipped
semantic values and **requires explicit founder sign-off at the merge gate**
(002 precedent; spec Art. VI echo). That contingency is declared in
plan.md and tasks.md (T005), not discovered mid-implementation.

**Alternatives considered**: widening the existing button regex into one
mega-pattern — obscures which component contributed a failure and couples
unrelated shapes; a second named pattern per component family keeps the
sweep legible; rejected.

## D5 — Tests and traceability

**Decision**: three test files, each with the file-level marker
`// @spec:010-ki-badge`, S-IDs on code lines (test titles), mirroring the
002/009 layout:

- `ki-badge.spec.tsx` (mock-doc, fast): S1 shadow anatomy — label slotted
  into `<span part="badge">`, host defaults reflected (`tone="neutral"`,
  `size="md"`); structural robustness for unknown tone/size values (markup
  unchanged, renders without error — the computed-style half of S3 lives in
  the browser suite, where styles actually resolve).
- `ki-badge.browser.spec.ts` (real browser, built output): S1 the label is
  visible inside a neutral pill; S2 a `tone="danger"` badge's computed
  colors resolve from the danger tone tokens; S3 a badge with an
  unrecognized tone (and size) computes identical colors/metrics to the
  default badge; S4 Tab travels button → button, never the badge; S5 the
  accessibility tree exposes the label text with no interactive role or
  state; S8 an empty badge exposes no content to AT and the page renders
  without error; S6 material3 restyle via injected built stylesheets
  (001/002 pattern); the long-label single-line edge (no S-ID, spec
  assumption); axe zero violations across the tone × size matrix.
- `ki-badge.dark.browser.spec.ts`: S7 forced dark under onmars + axe in
  dark (the ki-button.dark precedent: forced scheme isolated in its own
  file).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships (computed styles, AT tree, tab
order). RED first per Art. III. Mutation-gate note: Stryker is still not
wired into gates-suite.sh (factory gap inherited from 001/002/009); the
badge contains **zero pure logic** — no predicate exists at all — so the 009
compensating-control pattern has nothing to compensate; the gap is declared
in plan.md and remains a factory chore.
